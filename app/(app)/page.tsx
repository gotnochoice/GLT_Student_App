'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { EventCard, Empty, ErrorNote, Spinner } from '@/components/ui';
import { useData, useFilteredEvents } from '@/lib/data';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { addDays, DAY_NAMES, fmtClock, lagosDate, lagosDow, lagosMinutes, weekStart } from '@/lib/time';
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
  return (
    <>
      <div>
        <h1 className="text-3xl">Hello, {profile?.full_name.split(' ')[0] || 'friend'}</h1>
        <p className="muted">{DAY_NAMES[lagosDow(now) - 1]}</p>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}

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
