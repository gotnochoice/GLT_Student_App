import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

// Runs the real migrations in an in-process Postgres and signs in as each role.
// auth.uid() is stubbed to read a setting, like Supabase reads the JWT.
let db: PGlite;
const U = {
  alice: '00000000-0000-0000-0000-000000000001', // member, Technology 200L
  bob: '00000000-0000-0000-0000-000000000002', // member
  tutor: '00000000-0000-0000-0000-000000000003',
  rep: '00000000-0000-0000-0000-000000000004', // faculty rep, Technology
  care: '00000000-0000-0000-0000-000000000005',
  admin: '00000000-0000-0000-0000-000000000006',
  tutor2: '00000000-0000-0000-0000-000000000007',
};
let techId = 0, sciId = 0;
let tutorial: string, churchEvent: string, otherTutorial: string;

async function as<T>(uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`select set_config('test.uid', '${uid ?? ''}', false); set role ${uid ? 'authenticated' : 'anon'};`);
  try { return await fn(); } finally { await db.exec('reset role;'); }
}
const q = async (sql: string, params: unknown[] = []) => (await db.query(sql, params)).rows as any[];
const fails = async (p: Promise<unknown>) => { await expect(p).rejects.toThrow(); };

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;`);
  for (const f of readdirSync('supabase/migrations').sort()) {
    await db.exec(readFileSync(`supabase/migrations/${f}`, 'utf8'));
  }
  await db.exec(readFileSync('supabase/seed.sql', 'utf8'));
  techId = (await q(`select id from faculties where name='Technology'`))[0].id;
  sciId = (await q(`select id from faculties where name='Science'`))[0].id;
  for (const [k, id] of Object.entries(U)) {
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [id, `${k}@example.com`]);
  }
  await db.query(`update profiles set full_name = initcap(email), faculty_id=$1, level=200, onboarded=true`, [techId]);
  await db.query(`update profiles set role='tutor' where id in ($1,$2)`, [U.tutor, U.tutor2]);
  await db.query(`update profiles set role='faculty_rep' where id=$1`, [U.rep]);
  await db.query(`update profiles set role='care_liaison' where id=$1`, [U.care]);
  await db.query(`update profiles set role='admin' where id=$1`, [U.admin]);
  const soon = new Date(Date.now() + 3 * 864e5).toISOString();
  tutorial = (await q(`insert into events (title, kind, starts_at, faculty_id, capacity, tutor_id)
    values ('Calculus', 'tutorial', $1, $2, 2, $3) returning id`, [soon, techId, U.tutor]))[0].id;
  otherTutorial = (await q(`insert into events (title, kind, starts_at, faculty_id, tutor_id)
    values ('Physics', 'tutorial', $1, $2, $3) returning id`, [soon, sciId, U.tutor2]))[0].id;
  churchEvent = (await q(`insert into events (title, kind, starts_at) values ('Sunday service','church',$1) returning id`, [soon]))[0].id;
});

describe('help requests reach only the care liaison (and admins)', () => {
  let id: string;
  it('a member can send one', async () => {
    id = await as(U.alice, async () => (await q(
      `insert into help_requests (user_id, topic, message) values ($1,'Studies','I am struggling with maths') returning id`, [U.alice]))[0].id);
    expect(id).toBeTruthy();
  });
  it('the author can read it', async () => {
    expect(await as(U.alice, () => q(`select id from help_requests`))).toHaveLength(1);
  });
  it.each(['bob', 'tutor', 'rep'] as const)('%s cannot read it', async (who) => {
    expect(await as(U[who], () => q(`select id from help_requests`))).toHaveLength(0);
  });
  it('anonymous visitors cannot read it', async () => {
    await fails(as(null, () => q(`select id from help_requests`)));
  });
  it('the care liaison and admin can read and close it', async () => {
    expect(await as(U.care, () => q(`select id from help_requests`))).toHaveLength(1);
    expect(await as(U.admin, () => q(`select id from help_requests`))).toHaveLength(1);
    await as(U.care, () => q(`update help_requests set status='assigned', assigned_to=$1 where id=$2`, [U.care, id]));
    expect((await q(`select status from help_requests where id=$1`, [id]))[0].status).toBe('assigned');
  });
  it('a member cannot change a request, and the care liaison cannot rewrite the message', async () => {
    await as(U.alice, () => q(`update help_requests set status='closed' where id=$1`, [id]));
    expect((await q(`select status from help_requests where id=$1`, [id]))[0].status).toBe('assigned');
    await as(U.care, () => q(`update help_requests set message='edited' where id=$1`, [id]));
    expect((await q(`select message from help_requests where id=$1`, [id]))[0].message).toBe('I am struggling with maths');
  });
  it('cannot be sent in someone else\'s name', async () => {
    await fails(as(U.alice, () => q(`insert into help_requests (user_id, topic, message) values ($1,'x','y')`, [U.bob])));
  });
  it('self-harm words set the urgent flag, ordinary messages do not', async () => {
    const urgent = await as(U.bob, async () => (await q(
      `insert into help_requests (user_id, topic, message, urgent) values ($1,'Other','I want to end my life', false) returning urgent`, [U.bob]))[0].urgent);
    const normal = await as(U.bob, async () => (await q(
      `insert into help_requests (user_id, topic, message, status) values ($1,'Studies','Need a tutor for calculus','closed') returning urgent, status`, [U.bob]))[0]);
    expect(urgent).toBe(true);
    expect(normal.urgent).toBe(false);
    expect(normal.status).toBe('new');
  });
});

describe('help request authors', () => {
  it('only the care liaison and admins can look up who sent requests', async () => {
    expect((await as(U.care, () => q(`select * from request_authors()`))).length).toBeGreaterThan(0);
    for (const who of ['alice', 'bob', 'tutor', 'rep'] as const) {
      expect(await as(U[who], () => q(`select * from request_authors()`))).toHaveLength(0);
    }
  });
});

describe('roles and profiles', () => {
  it('a member cannot promote themselves', async () => {
    await fails(as(U.alice, () => q(`update profiles set role='admin' where id=$1`, [U.alice])));
  });
  it('an admin can change a role', async () => {
    await as(U.admin, () => q(`update profiles set role='member' where id=$1`, [U.bob]));
    expect((await q(`select role from profiles where id=$1`, [U.bob]))[0].role).toBe('member');
  });
  it('members see only their own profile', async () => {
    const rows = await as(U.alice, () => q(`select id from profiles`));
    expect(rows.map((r) => r.id)).toEqual([U.alice]);
  });
  it('a tutor cannot read other profiles either', async () => {
    expect(await as(U.tutor, () => q(`select id from profiles`))).toHaveLength(1);
  });
});

describe('events', () => {
  it('every member can read events', async () => {
    expect((await as(U.alice, () => q(`select id from events`))).length).toBe(3);
  });
  it('a member cannot create events', async () => {
    await fails(as(U.alice, () => q(`insert into events (title, kind, starts_at) values ('x','unit',now())`)));
  });
  it('a faculty rep can post to their own faculty only', async () => {
    await as(U.rep, () => q(`insert into events (title, kind, starts_at, faculty_id, created_by) values ('Rep post','unit',now(),$1,$2)`, [techId, U.rep]));
    await fails(as(U.rep, () => q(`insert into events (title, kind, starts_at, faculty_id, created_by) values ('Bad','unit',now(),$1,$2)`, [sciId, U.rep])));
    await fails(as(U.rep, () => q(`insert into events (title, kind, starts_at, faculty_id, created_by) values ('All','unit',now(),null,$1)`, [U.rep])));
    await fails(as(U.rep, () => q(`insert into events (title, kind, starts_at, faculty_id, created_by) values ('Church','church',now(),$1,$2)`, [techId, U.rep])));
  });
  it('an admin can post to everyone', async () => {
    await as(U.admin, () => q(`insert into events (title, kind, starts_at) values ('All','church',now())`));
  });
});

describe('sign-ups, capacity and tutors', () => {
  it('members sign up and see only their own rows', async () => {
    await as(U.alice, () => q(`insert into signups (event_id, user_id) values ($1,$2)`, [tutorial, U.alice]));
    await as(U.bob, () => q(`insert into signups (event_id, user_id) values ($1,$2)`, [tutorial, U.bob]));
    expect(await as(U.alice, () => q(`select id from signups`))).toHaveLength(1);
  });
  it('members cannot sign up someone else or mark themselves attended', async () => {
    await fails(as(U.alice, () => q(`insert into signups (event_id, user_id) values ($1,$2)`, [churchEvent, U.bob])));
    await fails(as(U.alice, () => q(`update signups set status='attended' where user_id=$1`, [U.alice])));
  });
  it('members see counts, not names', async () => {
    const c = await as(U.alice, () => q(`select * from event_counts() where event_id=$1`, [tutorial]));
    expect(Number(c[0].going)).toBe(2);
  });
  it('a full session puts the next person on the waiting list, and promotes on cancel', async () => {
    await as(U.care, () => q(`insert into signups (event_id, user_id) values ($1,$2)`, [tutorial, U.care]));
    expect((await q(`select status from signups where user_id=$1 and event_id=$2`, [U.care, tutorial]))[0].status).toBe('waiting');
    await as(U.alice, () => q(`update signups set status='cancelled' where user_id=$1 and event_id=$2`, [U.alice, tutorial]));
    expect((await q(`select status from signups where user_id=$1 and event_id=$2`, [U.care, tutorial]))[0].status).toBe('going');
  });
  it('a tutor sees and marks only their own session', async () => {
    expect((await as(U.tutor, () => q(`select * from session_roster($1)`, [tutorial]))).length).toBe(2);
    expect(await as(U.tutor, () => q(`select * from session_roster($1)`, [otherTutorial]))).toHaveLength(0);
    expect(await as(U.tutor2, () => q(`select id from signups`))).toHaveLength(0);
    await as(U.tutor, () => q(`update signups set status='attended' where user_id=$1 and event_id=$2`, [U.bob, tutorial]));
    expect((await q(`select status from signups where user_id=$1 and event_id=$2`, [U.bob, tutorial]))[0].status).toBe('attended');
  });
  it('a member cannot read a session roster', async () => {
    expect(await as(U.alice, () => q(`select * from session_roster($1)`, [tutorial]))).toHaveLength(0);
  });
});

describe('reminders', () => {
  it('a tutorial sign-up gets reminders 24 hours and 1 hour before', async () => {
    await as(U.alice, () => q(`update signups set status='going' where user_id=$1 and event_id=$2`, [U.alice, otherTutorial]).catch(() => null));
    await as(U.alice, () => q(`insert into signups (event_id, user_id) values ($1,$2) on conflict do nothing`, [otherTutorial, U.alice]));
    const rows = await q(`select r.kind, extract(epoch from e.starts_at - r.remind_at)::int as gap from reminders r join events e on e.id=r.event_id
      where r.user_id=$1 and r.event_id=$2 order by r.kind`, [U.alice, otherTutorial]);
    expect(rows.map((r) => r.kind)).toEqual(['1h', '24h']);
    expect(rows[0].gap).toBe(3600);
    expect(rows[1].gap).toBe(86400);
  });
  it('a church event gets only the 24 hour reminder', async () => {
    await as(U.alice, () => q(`insert into signups (event_id, user_id) values ($1,$2)`, [churchEvent, U.alice]));
    const rows = await q(`select kind from reminders where user_id=$1 and event_id=$2`, [U.alice, churchEvent]);
    expect(rows.map((r) => r.kind)).toEqual(['24h']);
  });
  it('cancelling removes unsent reminders', async () => {
    await as(U.alice, () => q(`update signups set status='cancelled' where user_id=$1 and event_id=$2`, [U.alice, churchEvent]));
    expect(await q(`select 1 from reminders where user_id=$1 and event_id=$2`, [U.alice, churchEvent])).toHaveLength(0);
  });
  it('moving an event moves the reminder', async () => {
    const later = new Date(Date.now() + 10 * 864e5).toISOString();
    await q(`update events set starts_at=$1 where id=$2`, [later, otherTutorial]);
    const r = await q(`select extract(epoch from (select starts_at from events where id=$2) - remind_at)::int as gap from reminders where user_id=$1 and event_id=$2 and kind='1h'`, [U.alice, otherTutorial]);
    expect(r[0].gap).toBe(3600);
  });
});

describe('private data', () => {
  it('timetable and goals are private to their owner', async () => {
    await as(U.alice, () => q(`insert into timetable_slots (user_id, course, day_of_week, start_time, end_time) values ($1,'MTH 201',2,'10:00','12:00')`, [U.alice]));
    await as(U.alice, () => q(`insert into goals (user_id, week_start, text) values ($1,'2026-11-23','Read 2 chapters')`, [U.alice]));
    for (const who of ['bob', 'tutor', 'care', 'admin'] as const) {
      expect(await as(U[who], () => q(`select id from timetable_slots`))).toHaveLength(0);
      expect(await as(U[who], () => q(`select id from goals`))).toHaveLength(0);
    }
    await fails(as(U.bob, () => q(`insert into goals (user_id, week_start, text) values ($1,'2026-11-30','x')`, [U.alice])));
  });
  it('push subscriptions are private', async () => {
    await as(U.alice, () => q(`insert into push_subscriptions (user_id, endpoint, keys) values ($1,'https://push.example/a','{}')`, [U.alice]));
    expect(await as(U.admin, () => q(`select id from push_subscriptions`))).toHaveLength(0);
  });
});

describe('people list', () => {
  it('shows only consented people, with only name, title and number', async () => {
    await db.query(`update profiles set whatsapp='08011112222', listed=false where id=$1`, [U.tutor]);
    await db.query(`insert into contacts (profile_id, title, kind, listed) values ($1,'Tutor, Mathematics','tutor',true)`, [U.tutor]);
    await db.query(`insert into contacts (name, whatsapp, title, kind, faculty_id, listed) values ('Dr Ade','08033334444','Faculty adviser, Technology','adviser',$1,true)`, [techId]);
    await db.query(`insert into contacts (name, whatsapp, title, kind, listed) values ('Hidden','0800','Leader','leader',false)`);
    let rows = await as(U.alice, () => q(`select * from people`));
    expect(rows.map((r) => r.name)).toEqual(['Dr Ade']);
    await as(U.tutor, () => q(`update profiles set listed=true where id=$1`, [U.tutor]));
    rows = await as(U.alice, () => q(`select * from people order by name`));
    expect(rows.map((r) => r.name)).toContain('Tutor@Example.Com');
    expect(Object.keys(rows[0]).sort()).toEqual(['faculty_id', 'id', 'kind', 'name', 'title', 'topics', 'whatsapp']);
    await as(U.tutor, () => q(`update profiles set listed=false where id=$1`, [U.tutor]));
    expect((await as(U.alice, () => q(`select * from people`))).map((r) => r.name)).toEqual(['Dr Ade']);
  });
  it('members cannot read or write the contacts table', async () => {
    expect(await as(U.alice, () => q(`select id from contacts`))).toHaveLength(0);
    await fails(as(U.alice, () => q(`insert into contacts (title) values ('x')`)));
  });
  it('anonymous visitors cannot read people', async () => {
    await fails(as(null, () => q(`select * from people`)));
  });
});
