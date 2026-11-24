-- The care liaison (and admins) see the name of whoever sent a help request.
-- Nobody else can call this usefully.
create function request_authors() returns table (id uuid, full_name text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name from profiles p
  where my_role() in ('care_liaison','admin')
    and p.id in (select user_id from help_requests)
$$;
revoke execute on function request_authors() from anon;
grant execute on function request_authors() to authenticated;
