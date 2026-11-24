-- GLT Academic Unit app: schema, row level security, triggers.
-- Run in order. Safe on a fresh Supabase project.

create table faculties (
  id serial primary key,
  name text not null unique,
  sort int not null default 0
);

create table departments (
  id serial primary key,
  faculty_id int not null references faculties on delete cascade,
  name text not null,
  unique (faculty_id, name)
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text not null default '',
  whatsapp text,
  faculty_id int references faculties on delete set null,
  department_id int references departments on delete set null,
  level int check (level in (100,200,300,400,500,600)), -- 600 = postgraduate
  role text not null default 'member'
    check (role in ('member','tutor','faculty_rep','care_liaison','admin')),
  listed boolean not null default false,          -- consent to appear in People
  goals_enabled boolean not null default false,   -- weekly goal is opt-in
  remind_tutorials boolean not null default true,
  remind_events boolean not null default true,
  remind_goal boolean not null default true,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  kind text not null check (kind in ('church','tutorial','unit','part2')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue text,
  online_link text,
  faculty_id int references faculties on delete set null, -- null = everyone
  level_min int not null default 100,
  level_max int not null default 600,
  capacity int check (capacity is null or capacity > 0),
  tutor_id uuid references profiles on delete set null,
  created_by uuid references profiles on delete set null,
  created_at timestamptz not null default now()
);
create index events_starts_idx on events (starts_at);

create table signups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  status text not null default 'going'
    check (status in ('going','waiting','cancelled','attended')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table timetable_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  course text not null,
  day_of_week int not null check (day_of_week between 1 and 7), -- 1 = Monday
  start_time time not null,
  end_time time not null,
  venue text,
  check (end_time > start_time)
);

create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  week_start date not null,
  text text not null,
  done boolean not null default false,
  unique (user_id, week_start)
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles on delete cascade, -- null for lecturers who do not log in
  name text,
  whatsapp text,
  title text not null,
  kind text not null default 'leader'
    check (kind in ('leader','tutor','adviser','care')),
  faculty_id int references faculties on delete set null, -- null = unit-wide
  topics text,
  listed boolean not null default false
);

create table help_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  topic text not null,
  message text not null,
  preferred_contact text,
  status text not null default 'new' check (status in ('new','assigned','closed')),
  urgent boolean not null default false,
  assigned_to uuid references profiles on delete set null,
  notified_at timestamptz,
  created_at timestamptz not null default now()
);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now()
);

create table reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  event_id uuid references events on delete cascade,
  kind text not null default '24h',
  remind_at timestamptz not null,
  channel text not null default 'push',
  sent_at timestamptz,
  unique (user_id, event_id, kind)
);
create index reminders_due_idx on reminders (remind_at) where sent_at is null;

-- ---------------------------------------------------------------- helpers
create function my_role() returns text
language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() $$;

create function is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce((select role = 'admin' from profiles where id = auth.uid()), false) $$;

create function my_faculty() returns int
language sql stable security definer set search_path = public as
$$ select faculty_id from profiles where id = auth.uid() $$;

-- A profile row is created for every new sign-in.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email) values (new.id, new.email) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Nobody can promote themselves. SQL editor / service role has no auth.uid(), so it may.
create function guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_admin() then
    if new.role is distinct from old.role then
      raise exception 'only an admin can change roles';
    end if;
    if new.email is distinct from old.email then
      new.email := old.email;
    end if;
  end if;
  return new;
end $$;
create trigger profiles_guard before update on profiles
  for each row execute function guard_profile_update();

-- ------------------------------------------------------- capacity / waiting
create function promote_waiting(p_event uuid) returns void
language plpgsql security definer set search_path = public as $$
declare cap int; taken int; nxt uuid;
begin
  select capacity into cap from events where id = p_event;
  if cap is null then
    update signups set status = 'going' where event_id = p_event and status = 'waiting';
    return;
  end if;
  loop
    select count(*) into taken from signups where event_id = p_event and status in ('going','attended');
    exit when taken >= cap;
    select id into nxt from signups where event_id = p_event and status = 'waiting'
      order by created_at limit 1;
    exit when nxt is null;
    update signups set status = 'going' where id = nxt;
  end loop;
end $$;

create function signups_capacity() returns trigger
language plpgsql security definer set search_path = public as $$
declare cap int; taken int;
begin
  if new.status = 'going' and (tg_op = 'INSERT' or old.status in ('cancelled','waiting')) then
    perform 1 from events where id = new.event_id for update;
    select capacity into cap from events where id = new.event_id;
    if cap is not null then
      select count(*) into taken from signups
        where event_id = new.event_id and status in ('going','attended') and id is distinct from new.id;
      if taken >= cap then new.status := 'waiting'; end if;
    end if;
  end if;
  return new;
end $$;
create trigger signups_capacity_t before insert or update of status on signups
  for each row execute function signups_capacity();

create function signups_after() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and old.status in ('going','attended') and new.status = 'cancelled' then
    perform promote_waiting(new.event_id);
  end if;
  return null;
end $$;
create trigger signups_after_t after update of status on signups
  for each row execute function signups_after();

-- ----------------------------------------------------------------- reminders
-- Tutorials: 24h and 1h before. Everything else: 24h before. Preferences are
-- checked again when the reminder is sent.
create function make_reminders(p_user uuid, p_event uuid) returns void
language plpgsql security definer set search_path = public as $$
declare ev events%rowtype;
begin
  select * into ev from events where id = p_event;
  if not found then return; end if;
  delete from reminders where user_id = p_user and event_id = p_event and sent_at is null;
  if ev.starts_at - interval '24 hours' > now() then
    insert into reminders (user_id, event_id, kind, remind_at)
      values (p_user, p_event, '24h', ev.starts_at - interval '24 hours')
      on conflict (user_id, event_id, kind) do nothing;
  end if;
  if ev.kind = 'tutorial' and ev.starts_at - interval '1 hour' > now() then
    insert into reminders (user_id, event_id, kind, remind_at)
      values (p_user, p_event, '1h', ev.starts_at - interval '1 hour')
      on conflict (user_id, event_id, kind) do nothing;
  end if;
end $$;

create function signups_reminders() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'going' then
    perform make_reminders(new.user_id, new.event_id);
  else
    delete from reminders where user_id = new.user_id and event_id = new.event_id and sent_at is null;
  end if;
  return null;
end $$;
create trigger signups_reminders_t after insert or update of status on signups
  for each row execute function signups_reminders();

create function events_rescheduled() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if new.starts_at is distinct from old.starts_at then
    for r in select user_id from signups where event_id = new.id and status = 'going' loop
      perform make_reminders(r.user_id, new.id);
    end loop;
  end if;
  return null;
end $$;
create trigger events_rescheduled_t after update of starts_at on events
  for each row execute function events_rescheduled();

-- ------------------------------------------------------------ help requests
-- Safety net, not a diagnosis. Authoritative: runs in the database so it
-- cannot be skipped by the app.
create function help_flag() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'new';
    new.assigned_to := null;
    new.notified_at := null;
    new.urgent := (new.topic || ' ' || new.message) ~*
      '(suicid|kill myself|end my life|end it all|self.?harm|hurt myself|harm myself|cut myself|want to die|wanna die|don.?t want to live|take my own life|no reason to live|better off dead)';
  else
    new.user_id := old.user_id; new.topic := old.topic; new.message := old.message;
    new.preferred_contact := old.preferred_contact; new.urgent := old.urgent;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;
create trigger help_flag_t before insert or update on help_requests
  for each row execute function help_flag();

-- --------------------------------------------------------------- read helpers
-- Members see only how many people are going, never who.
create function event_counts() returns table (event_id uuid, going bigint)
language sql stable security definer set search_path = public as $$
  select event_id, count(*) from signups where status in ('going','attended') group by event_id
$$;

-- Tutors see the roster of their own sessions: first name and status only.
create function session_roster(p_event uuid)
returns table (signup_id uuid, full_name text, status text)
language sql stable security definer set search_path = public as $$
  select s.id, p.full_name, s.status
  from signups s join profiles p on p.id = s.user_id join events e on e.id = s.event_id
  where s.event_id = p_event and s.status <> 'cancelled'
    and (e.tutor_id = auth.uid() or e.created_by = auth.uid() or is_admin())
    and (my_role() in ('tutor','admin'))
  order by s.created_at
$$;

-- People list: only consented rows, only name, title and WhatsApp number.
create view people as
  select c.id,
         coalesce(p.full_name, c.name) as name,
         coalesce(p.whatsapp, c.whatsapp) as whatsapp,
         c.title, c.kind, c.faculty_id, c.topics
  from contacts c left join profiles p on p.id = c.profile_id
  where c.listed and (c.profile_id is null or p.listed);

-- ------------------------------------------------------------------ security
alter table faculties enable row level security;
alter table departments enable row level security;
alter table profiles enable row level security;
alter table events enable row level security;
alter table signups enable row level security;
alter table timetable_slots enable row level security;
alter table goals enable row level security;
alter table contacts enable row level security;
alter table help_requests enable row level security;
alter table push_subscriptions enable row level security;
alter table reminders enable row level security;

create policy fac_read on faculties for select to authenticated using (true);
create policy fac_admin on faculties for all to authenticated using (is_admin()) with check (is_admin());
create policy dep_read on departments for select to authenticated using (true);
create policy dep_admin on departments for all to authenticated using (is_admin()) with check (is_admin());

create policy prof_read on profiles for select to authenticated using (id = auth.uid() or is_admin());
create policy prof_update on profiles for update to authenticated
  using (id = auth.uid() or is_admin()) with check (id = auth.uid() or is_admin());
create policy prof_delete on profiles for delete to authenticated using (is_admin());

-- Events are public to every signed-in member so people can browse other
-- faculties. The app filters to "my faculty" by default.
create policy ev_read on events for select to authenticated using (true);
create policy ev_admin on events for all to authenticated using (is_admin()) with check (is_admin());
create policy ev_rep_insert on events for insert to authenticated
  with check (my_role() = 'faculty_rep' and faculty_id is not null and faculty_id = my_faculty()
              and kind <> 'church' and created_by = auth.uid());
create policy ev_rep_update on events for update to authenticated
  using (my_role() = 'faculty_rep' and created_by = auth.uid() and faculty_id = my_faculty())
  with check (my_role() = 'faculty_rep' and created_by = auth.uid() and faculty_id = my_faculty());
create policy ev_rep_delete on events for delete to authenticated
  using (my_role() = 'faculty_rep' and created_by = auth.uid() and faculty_id = my_faculty());

create policy su_own_read on signups for select to authenticated using (user_id = auth.uid());
create policy su_own_insert on signups for insert to authenticated
  with check (user_id = auth.uid() and status in ('going','waiting'));
create policy su_own_update on signups for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and status in ('going','waiting','cancelled'));
create policy su_tutor_read on signups for select to authenticated using (
  my_role() = 'tutor' and exists (select 1 from events e where e.id = event_id
    and (e.tutor_id = auth.uid() or e.created_by = auth.uid())));
create policy su_tutor_update on signups for update to authenticated
  using (my_role() = 'tutor' and exists (select 1 from events e where e.id = event_id
    and (e.tutor_id = auth.uid() or e.created_by = auth.uid())))
  with check (status in ('going','attended') and my_role() = 'tutor' and exists (
    select 1 from events e where e.id = event_id
    and (e.tutor_id = auth.uid() or e.created_by = auth.uid())));
create policy su_admin on signups for all to authenticated using (is_admin()) with check (is_admin());

create policy ts_own on timetable_slots for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy goals_own on goals for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_own on push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy rem_own on reminders for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy contacts_admin on contacts for all to authenticated using (is_admin()) with check (is_admin());

create policy hr_insert on help_requests for insert to authenticated with check (user_id = auth.uid());
create policy hr_own_read on help_requests for select to authenticated using (user_id = auth.uid());
create policy hr_staff_read on help_requests for select to authenticated
  using (my_role() in ('care_liaison','admin'));
create policy hr_staff_update on help_requests for update to authenticated
  using (my_role() in ('care_liaison','admin')) with check (my_role() in ('care_liaison','admin'));

-- ------------------------------------------------------------------- grants
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on people to authenticated;
revoke all on all tables in schema public from anon;
revoke all on people from anon;
grant execute on function event_counts() to authenticated;
grant execute on function session_roster(uuid) to authenticated;
revoke execute on function event_counts() from anon;
revoke execute on function session_roster(uuid) from anon;
