'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { EventCard, Empty, ErrorNote, Spinner } from '@/components/ui';
import { useData, useFilteredEvents } from '@/lib/data';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { addDays, DAY_NAMES, fmtClock, fmtDayTime, lagosDate, lagosDow, weekStart } from '@/lib/time';
import { isToday } from '@/lib/events';
import type { Goal } from '@/lib/types';

export default function Home() {
  const { profile } = useSession();
  const { loading, error, events, signups, slots, counts } = useData();
  const { faculties } = useSession();
  const filtered = useFilteredEvents();
  const [goal, setGoal] = useState<Goal | null | undefined>(undefined);
  const now = new Date();

  useEffect(() => {
    if (!profile?.goals_enabled) return;
    supabase().from('goals').select('*').eq('week_start', weekStart()).maybeSingle().then(({ data }) => setGoal(data as Goal | null));
  }, [profile?.goals_enabled]);

  const mine = useMemo(() => new Map(signups.map((s) => [s.event_id, s.status])), [signups]);
  const horizon = addDays(lagosDate(now), 8);
  const next7 = filtered.filter((e) => lagosDate(e.starts_at) < horizon && new Date(e.ends_at ?? e.starts_at) >= new Date(now.getTime() - 3600_000));
  const todayEvents = events.filter((e) => isToday(e, now) && ['going', 'attended'].includes(mine.get(e.id) ?? ''));
  const todaySlots = slots.filter((s) => s.day_of_week === lagosDow(now)).sort((a, b) => a.start_time.localeCompare(b.start_time));
  const todayCount = todayEvents.length + todaySlots.length;

  useEffect(() => {
    try { (navigator as any).setAppBadge?.(todayCount || 0); } catch {}
  }, [todayCount]);

  if (loading) return <Spinner />;
  const goingNext = next7.filter((e) => ['going', 'attended'].includes(mine.get(e.id) ?? ''));
  const nextUp = goingNext[0] ?? next7[0];
  const pct = next7.length ? Math.round((goingNext.length / next7.length) * 100) : 0;
  return (
    <>
      <div>
        <p className="kicker">{DAY_NAMES[lagosDow(now) - 1]}</p>
        <h1>Hello, <em>{profile?.full_name.split(' ')[0] || 'friend'}</em></h1>
        <p className="muted">Here is what is on for you.</p>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}

      <section className="hero" aria-label="This week">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="space-y-2">
            <p className="eyebrow">This week at GLT</p>
            <p className="display text-2xl leading-tight">{next7.length === 0 ? 'Nothing planned yet' : <><em>{next7.length}</em> thing{next7.length > 1 ? 's' : ''} on in the next 7 days</>}</p>
            <div className="track" role="progressbar" aria-label="Signed up" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="fill" style={{ width: `${pct}%` }} /></div>
            <p className="text-sm opacity-90">You are signed up for {goingNext.length} of {next7.length}</p>
          </div>
        </div>
        {nextUp && (
          <div className="next">
            <p className="eyebrow">Next up</p>
            <p className="display mt-1 text-xl leading-snug">{nextUp.title}</p>
            <p className="mb-3 text-sm opacity-80">{fmtDayTime(nextUp.starts_at)}{nextUp.venue ? ` · ${nextUp.venue}` : ''}</p>
            <Link href={`/events/${nextUp.id}`} className="btn btn-gold">{mine.has(nextUp.id) ? 'View details' : 'Sign up'}</Link>
          </div>
        )}
      </section>

      <section aria-labelledby="today" className="space-y-2">
        <h2 id="today" className="text-xl">Today {todayCount > 0 && <span className="pill pill-gold align-middle">{todayCount}</span>}</h2>
        {todayCount === 0 && <Empty>Nothing on your list today.</Empty>}
        {todaySlots.map((s) => (
          <div key={s.id} className="card"><p className="font-semibold">{s.course}</p>
            <p className="muted text-sm">{fmtClock(s.start_time)} – {fmtClock(s.end_time)}{s.venue ? ` · ${s.venue}` : ''}</p></div>
        ))}
        {todayEvents.map((e) => <EventCard key={e.id} e={e} faculties={faculties} going status={mine.get(e.id)} count={counts[e.id]} />)}
        {profile?.goals_enabled && goal !== undefined && (
          <Link href="/goal" className="card block"><p className="font-semibold">This week&apos;s goal</p>
            <p className="muted text-sm">{goal ? `${goal.done ? '✓ ' : ''}${goal.text}` : 'Tap to set one short goal for the week.'}</p></Link>
        )}
      </section>

      <section aria-labelledby="next" className="space-y-2">
        <h2 id="next" className="text-xl">Next 7 days</h2>
        {next7.length === 0 && <Empty>Nothing coming up for your faculty and level yet. Try the Calendar tab.</Empty>}
        {next7.map((e) => <EventCard key={e.id} e={e} faculties={faculties} going={mine.has(e.id)} status={mine.get(e.id)} count={counts[e.id]} />)}
      </section>
      <p className="muted text-center text-xs">Times are in Lagos time.</p>
    </>
  );
}
