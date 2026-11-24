'use client';
import { useState } from 'react';
import { EventCard, Empty, ErrorNote, Spinner } from '@/components/ui';
import { useData } from '@/lib/data';
import { useSession } from '@/lib/session';
import { appliesTo, filterFromProfile, upcoming } from '@/lib/events';
import { fmtDay, lagosDate } from '@/lib/time';

const TABS = ['All', 'Church', 'Tutorials', 'My faculty'] as const;

export default function Calendar() {
  const { profile, faculties } = useSession();
  const { loading, error, events, filter, signups, counts } = useData();
  const [tab, setTab] = useState<(typeof TABS)[number]>('All');
  const mine = new Map(signups.map((s) => [s.event_id, s.status]));

  const list = upcoming(events).filter((e) =>
    tab === 'All' ? appliesTo(e, filter)
    : tab === 'Church' ? e.kind === 'church'
    : tab === 'Tutorials' ? e.kind === 'tutorial' && appliesTo(e, filter)
    : appliesTo(e, filterFromProfile(profile)));

  const groups: { day: string; label: string; items: typeof list }[] = [];
  for (const e of list) {
    const d = lagosDate(e.starts_at);
    const g = groups.at(-1);
    if (g?.day === d) g.items.push(e); else groups.push({ day: d, label: fmtDay(e.starts_at), items: [e] });
  }

  return (
    <>
      <h1 className="text-3xl">Calendar</h1>
      <div role="group" aria-label="Filter events" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {TABS.map((t) => <button key={t} className="chip" aria-pressed={tab === t} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      {loading ? <Spinner /> : error ? <ErrorNote>{error}</ErrorNote> : groups.length === 0 ? (
        <Empty>Nothing here yet. Use the chip at the top to look at other faculties.</Empty>
      ) : groups.map((g) => (
        <section key={g.day} className="space-y-2">
          <h2 className="text-lg text-accent">{g.label}</h2>
          {g.items.map((e) => <EventCard key={e.id} e={e} faculties={faculties} going={mine.has(e.id)} status={mine.get(e.id)} count={counts[e.id]} />)}
        </section>
      ))}
    </>
  );
}
