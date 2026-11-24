'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ErrorNote, Spinner } from '@/components/ui';
import { eventBlock, findClashes, slotBlock } from '@/lib/clash';
import { useData } from '@/lib/data';
import { KIND_LABEL, levelLabel } from '@/lib/events';
import { downloadIcs } from '@/lib/ics';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { fmtDayTime, fmtTime } from '@/lib/time';

type Row = { signup_id: string; full_name: string; status: string };

export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const { profile, faculties } = useSession();
  const { events, signups, slots, counts, loading, reload } = useData();
  const e = events.find((x) => x.id === id);
  const mine = signups.find((s) => s.event_id === id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [roster, setRoster] = useState<Row[] | null>(null);
  const isStaff = profile && (profile.role === 'admin' || (profile.role === 'tutor' && e && (e.tutor_id === profile.id || e.created_by === profile.id)));

  async function loadRoster() {
    const { data } = await supabase().rpc('session_roster', { p_event: id });
    setRoster((data ?? []) as Row[]);
  }
  useEffect(() => { if (isStaff) loadRoster(); /* eslint-disable-next-line */ }, [isStaff, id]);

  if (loading) return <Spinner />;
  if (!e) return <ErrorNote>We could not find that event. It may have passed or been removed.</ErrorNote>;

  const active = mine && ['going', 'waiting', 'attended'].includes(mine.status);
  const full = e.capacity != null && (counts[e.id] ?? 0) >= e.capacity;
  const myBlocks = [
    ...slots.map(slotBlock),
    ...signups.filter((s) => s.event_id !== e.id && ['going', 'attended'].includes(s.status))
      .flatMap((s) => { const ev = events.find((x) => x.id === s.event_id); return ev ? [eventBlock(ev)] : []; }),
  ];
  const clash = findClashes(eventBlock(e), myBlocks);

  async function signUp() {
    setBusy(true); setErr('');
    const sb = supabase();
    const { error } = mine
      ? await sb.from('signups').update({ status: 'going' }).eq('id', mine.id)
      : await sb.from('signups').insert({ event_id: e!.id, user_id: profile!.id, status: 'going' });
    setBusy(false);
    if (error) setErr('Could not sign you up. Please try again.'); else reload();
  }
  async function cancel() {
    setBusy(true); setErr('');
    const { error } = await supabase().from('signups').update({ status: 'cancelled' }).eq('id', mine!.id);
    setBusy(false);
    if (error) setErr('Could not cancel. Please try again.'); else reload();
  }
  async function mark(r: Row) {
    await supabase().from('signups').update({ status: r.status === 'attended' ? 'going' : 'attended' }).eq('id', r.signup_id);
    loadRoster();
  }

  const fac = e.faculty_id != null ? faculties.find((f) => f.id === e.faculty_id)?.name : 'Everyone';
  const reminders = e.kind === 'tutorial' ? '24 hours and 1 hour' : '24 hours';

  return (
    <>
      <Link href="/calendar" className="muted inline-flex min-h-[44px] items-center text-sm underline">← Calendar</Link>
      <div className="space-y-1">
        <span className={`pill ${e.kind === 'tutorial' ? 'pill-gold' : ''}`}>{KIND_LABEL[e.kind]}</span>
        <h1>{e.title}</h1>
        <p className="font-semibold">{fmtDayTime(e.starts_at)}{e.ends_at ? ` – ${fmtTime(e.ends_at)}` : ''}</p>
        {e.venue && <p>{e.venue}</p>}
        {e.online_link && <p><a className="underline" href={e.online_link} rel="noopener noreferrer" target="_blank">Join online</a></p>}
        <p className="muted text-sm">For: {fac}, {e.level_min <= 100 && e.level_max >= 600 ? 'all levels' : `${levelLabel(e.level_min)} to ${levelLabel(e.level_max)}`}</p>
      </div>
      {e.description && <p className="whitespace-pre-line">{e.description}</p>}

      {clash.length > 0 && !active && (
        <p role="status" className="pill-warn card text-sm">Heads up: this clashes with {clash.map((c) => c.label).join(', ')} on your timetable. You can still sign up.</p>
      )}
      {e.capacity != null && <p className="muted text-sm">{counts[e.id] ?? 0} of {e.capacity} places taken.{full && !active ? ' It is full. You can join the waiting list and we will move you up if someone cancels.' : ''}</p>}
      {mine?.status === 'waiting' && <p role="status" className="pill-warn card text-sm">You are on the waiting list. If someone cancels, you move up automatically.</p>}
      {mine?.status === 'going' && <p role="status" className="text-accent font-semibold">You&apos;re going. We&apos;ll remind you {reminders} before.</p>}
      {err && <ErrorNote>{err}</ErrorNote>}

      <div className="flex flex-col gap-2">
        {active && mine?.status !== 'attended'
          ? <button className="btn btn-danger" disabled={busy} onClick={cancel}>{mine?.status === 'waiting' ? 'Leave waiting list' : 'Cancel my sign-up'}</button>
          : mine?.status === 'attended' ? null
          : <button className="btn btn-primary" disabled={busy} onClick={signUp}>{full ? 'Join waiting list' : 'Sign up'}</button>}
        <button className="btn" onClick={() => downloadIcs(e)}>Add to my phone calendar (.ics)</button>
        {profile?.role === 'admin' && <Link className="btn" href={`/admin/events/${e.id}`}>Edit this event</Link>}
      </div>

      {isStaff && roster && (
        <section className="space-y-2" aria-labelledby="roster">
          <h2 id="roster" className="text-xl">Sign-ups ({roster.length})</h2>
          {roster.length === 0 && <p className="muted text-sm">Nobody yet.</p>}
          <ul className="space-y-2">
            {roster.map((r) => (
              <li key={r.signup_id} className="card flex items-center justify-between gap-2">
                <span>{r.full_name || 'Member'} {r.status === 'waiting' && <span className="pill pill-warn">Waiting</span>}</span>
                {r.status !== 'waiting' && <button className="btn" aria-pressed={r.status === 'attended'} onClick={() => mark(r)}>{r.status === 'attended' ? '✓ Here' : 'Mark here'}</button>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
