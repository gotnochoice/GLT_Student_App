# GLT Academic Unit app

A mobile-first web app (installable PWA) for the Academic Unit of God's Love Tabernacle International Church, Ife Extension. Events and tutorials in one calendar, a personal timetable with clash warnings, sign-ups and reminders, a People list with WhatsApp links, and a private help request to the care liaison.

Stack: Next.js (App Router) + TypeScript, Tailwind CSS, Supabase (Postgres, Auth, Row Level Security), Vercel. Version 1 only. See `CLAUDE.md` for the full brief.

## Run it on your computer

```bash
npm install
cp .env.example .env.local   # then fill it in (step 2 below)
npm run dev                  # http://localhost:3000
```

```bash
npm test           # 47 tests: row level security by role, clash detection, Lagos time, .ics, digest
npm run typecheck
```

The security tests run the real migrations in an in-process Postgres and sign in as each role. They need no Supabase account.

## 1. Create the database (once)

1. Make a free project at supabase.com.
2. Open **SQL Editor** and run, in this order, the contents of:
   `supabase/migrations/0001_schema.sql`, `supabase/migrations/0002_request_authors.sql`, then `supabase/seed.sql`.
3. **Authentication > URL Configuration:** set *Site URL* to your app address and add it (and `http://localhost:3000`) under *Redirect URLs*.
4. **Authentication > Providers:** email is on by default. To add Google, follow Supabase's "Login with Google" page and paste the client ID and secret.
5. Sign in to the app once, then make yourself the first admin by running this in the SQL Editor (use your email):
   ```sql
   update profiles set role = 'admin' where email = 'you@example.com';
   ```
   After that, admins are managed inside the app (My account > Admin > Members and roles).

## 2. Environment variables

| Name | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page, "anon public" key |
| `SUPABASE_SERVICE_ROLE_KEY` | same page. **Secret.** Server only. Never put it in the browser or commit it |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | run `npx web-push generate-vapid-keys` |
| `VAPID_SUBJECT` | `mailto:` an admin email |
| `CRON_SECRET` | any long random string |

## 3. Deploy

1. Push this repo to GitHub (it already is).
2. On vercel.com, **Add New > Project**, pick the repo, add the variables above, deploy.
3. In the GitHub repo, **Settings > Secrets and variables > Actions**, add `APP_URL` (your Vercel address) and `CRON_SECRET` (same value). The workflow `.github/workflows/reminders.yml` then calls the reminder job every 15 minutes. This is what makes the "1 hour before" reminder arrive on time, because Vercel's free plan only runs a job once a day.

## Layout

```
app/                 pages and API routes
components/          shared UI
lib/                 time, clash, ics, digest, filters, Supabase client, push
supabase/migrations/ database schema and security rules
supabase/seed.sql    faculties and departments (DRAFT, owner must confirm)
public/              manifest, icons, service worker
tests/               security and logic tests
HANDOVER.md          admin guide for the next team
```

## Notes on choices

- A small Supabase client (`@supabase/auth-js` + `@supabase/postgrest-js`) instead of the full `supabase-js`, to save about 35 KB on first load.
- No date library. Lagos has no daylight saving (always UTC+1), so a fixed offset is exact. Times are stored in UTC.
- A hand-written 60-line service worker instead of a PWA library.
- Magic links use Supabase's "implicit" flow so they work when the link opens in a different browser from the one that asked for it, which is common when people start from WhatsApp.
