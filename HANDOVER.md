# Handover: running the GLT Academic Unit app

For the next admin team. You do not need to write code for any of the daily jobs.

## Day to day (inside the app)

Sign in, tap your letter at the top right (**My account**), then **Open admin**.

- **Add an event or tutorial:** Admin > Events and tutorials > Add. Times are Lagos time. Leave faculty as "Everyone" for church-wide events. Set places to limit sign-ups; extra people go on a waiting list and move up automatically if someone cancels. For tutorials, choose a tutor (they must first be given the Tutor role).
- **Add an admin, tutor, faculty rep or the care liaison:** the person signs in once, then Admin > Members and roles, find them, change their role. Keep at least two admins.
  - Tutor: sees sign-ups and marks attendance for their own sessions.
  - Faculty rep: can post events for their own faculty only.
  - Care liaison: the only role (besides admins) that can read help requests.
- **Add a faculty or department:** Admin > Faculties. Edit a name by typing in its box. Deleting a faculty removes its departments.
- **List a leader, tutor or lecturer in People:** Admin > People list > Add. Members must also tick "List me in People" themselves. For lecturers who do not use the app, type their name and number, and only do that if they agreed.
- **Weekly WhatsApp message:** Admin > Weekly digest > Copy text, then paste into the unit's WhatsApp broadcast.
- **Help requests:** Admin > Help requests (or My account for the care liaison). Urgent ones show at the top. Admins also get a phone notification if they enabled notifications. Never share the details.

## Before launch: things the owner must confirm

1. **Faculty and department list** (`supabase/seed.sql` is a draft). Fix it in Admin > Faculties.
2. **Counselling message** shown after a help request: `lib/safety.ts`. Confirm the wording and add real OAU counselling contact details.
3. **Who the two admins and the care liaison are.**
4. **Brand colours and logo.** Colours are in `app/globals.css` (top of file). The logo is a placeholder in `components/ui.tsx` (`Logo`) and `public/icon*.png`.
5. **Saturday tutorial time and venue.** Add them as an event in Admin.
6. **Who may join:** GLT members only, or any OAU student who comes through GLT. Right now anyone with an email can sign in.
7. Custom domain (optional): Vercel > Settings > Domains, then update Supabase Site URL and Redirect URLs.

## If the database pauses

Free Supabase projects pause after a week of no activity. The 15-minute reminder job counts as activity, so it should not happen while that job runs. If it does:

1. Go to supabase.com, open the project, click **Restore project**. Wait a few minutes.
2. Check the GitHub Action `reminders` is still enabled (GitHub repo > Actions). GitHub switches off scheduled jobs after 60 days with no repo activity: open the workflow and click **Enable**.
3. If the church wants certainty, the Pro plan (about $25 a month) never pauses.

## Rotate keys

- **Supabase keys:** Project Settings > API. Generate new keys, then update them in Vercel (Settings > Environment Variables) and redeploy.
- **VAPID keys:** run `npx web-push generate-vapid-keys`, update both in Vercel, redeploy. Members must turn phone notifications off and on again.
- **CRON_SECRET:** change it in Vercel **and** in the GitHub secret of the same name.
- If a key was ever pasted into chat, email or a commit, rotate it now.

## Reminders: how they work

1. The **Today** list on Home always works (no permission needed).
2. Phone notifications, if the member turned them on. On iPhone this only works after the app is added to the Home Screen (iOS 16.4 or later); the app explains this before asking.
3. The WhatsApp digest, pasted by the secretary.
4. "Add to my phone calendar (.ics)" on every event.

Defaults: tutorials 24 hours and 1 hour before, other events 24 hours before, goal prompt on Sunday 6 pm (Lagos).

## If something breaks

- **People cannot sign in:** Supabase > Authentication > URL Configuration must contain the app address. Check spam for the email.
- **No reminders arriving:** GitHub > Actions > reminders: is it green? Does Vercel have `CRON_SECRET`, `VAPID_*` and `SUPABASE_SERVICE_ROLE_KEY`?
- **Someone cannot see an event:** check its faculty and level range, and the filter chip at the top of their screen.
- **A member asks to be removed:** they can delete their own account (My account). Admins can also remove a person from Admin > People list.

## Privacy rules to keep

Goals and help requests are private. Reports (if added later) show counts only. Do not store grades, CGPA or exam questions. The privacy page is `app/privacy/page.tsx`; update it if you store anything new.

## Handover check

The brief asks that a non-developer admin follow this guide once. That check has **not** been done yet. Do it before launch and fix anything unclear.
