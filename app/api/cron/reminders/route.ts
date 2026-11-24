import { admin, push } from '@/lib/server';
import { lagosDate, lagosDow, lagosMinutes, fmtTime } from '@/lib/time';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Sub = { id: string; user_id: string; endpoint: string; keys: { p256dh: string; auth: string } };

/** Called every 15 minutes (GitHub Actions or Supabase pg_cron) and once a day by Vercel Cron.
 *  Also acts as the keep-alive that stops a free Supabase project from pausing. */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  const sb = admin();
  const wp = process.env.VAPID_PRIVATE_KEY ? push() : null;
  const now = new Date();
  const out = { due: 0, sent: 0, skipped: 0, goal: 0, urgent: 0 };

  async function send(userIds: string[], payload: object) {
    if (!wp || !userIds.length) return 0;
    const { data } = await sb.from('push_subscriptions').select('*').in('user_id', userIds);
    let n = 0;
    for (const s of (data ?? []) as Sub[]) {
      try { await wp.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(payload)); n++; }
      catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from('push_subscriptions').delete().eq('id', s.id); }
    }
    return n;
  }

  // 1. Event reminders that are due.
  const { data: due } = await sb.from('reminders')
    .select('id,user_id,kind,event_id,events(title,starts_at,kind,venue),profiles(remind_tutorials,remind_events)')
    .is('sent_at', null).eq('channel', 'push').lte('remind_at', now.toISOString()).limit(500);
  for (const r of (due ?? []) as any[]) {
    out.due++;
    const ev = r.events, pr = r.profiles;
    const wants = ev && pr && (ev.kind === 'tutorial' ? pr.remind_tutorials : pr.remind_events);
    const stale = !ev || new Date(ev.starts_at) < now;
    if (wants && !stale) {
      const when = r.kind === '1h' ? 'in 1 hour' : 'tomorrow';
      const n = await send([r.user_id], { title: ev.title, body: `Starts ${when} at ${fmtTime(ev.starts_at)}${ev.venue ? `, ${ev.venue}` : ''}.`, url: `/events/${r.event_id}` });
      out.sent += n;
    } else out.skipped++;
    await sb.from('reminders').update({ sent_at: now.toISOString() }).eq('id', r.id);
  }

  // 2. Weekly goal prompt: Sunday evening Lagos time, once per person.
  const m = lagosMinutes(now);
  if (lagosDow(now) === 7 && m >= 18 * 60 && m < 19 * 60) {
    const kind = `goal-${lagosDate(now)}`;
    const { data: people } = await sb.from('profiles').select('id').eq('goals_enabled', true).eq('remind_goal', true);
    const { data: done } = await sb.from('reminders').select('user_id').eq('kind', kind);
    const doneSet = new Set((done ?? []).map((d) => d.user_id));
    const todo = (people ?? []).map((p) => p.id).filter((id) => !doneSet.has(id));
    if (todo.length) {
      await sb.from('reminders').insert(todo.map((id) => ({ user_id: id, kind, remind_at: now.toISOString(), sent_at: now.toISOString(), channel: 'goal' })));
      out.goal = await send(todo, { title: 'How did this week go?', body: 'Tick off your weekly goal and set the next one.', url: '/goal' });
    }
  }

  // 3. Urgent help requests: tell the care liaison and admins, with no private details.
  const { data: urgent } = await sb.from('help_requests').select('id').eq('urgent', true).is('notified_at', null);
  if (urgent?.length) {
    const { data: staff } = await sb.from('profiles').select('id').in('role', ['care_liaison', 'admin']);
    out.urgent = await send((staff ?? []).map((s) => s.id), { title: 'Urgent: needs same-day attention', body: 'A help request has been flagged. Please open the app.', url: '/admin/requests' });
    await sb.from('help_requests').update({ notified_at: now.toISOString() }).in('id', urgent.map((u) => u.id));
  }
  return Response.json(out);
}
