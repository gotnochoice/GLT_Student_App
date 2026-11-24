'use client';
import { useState } from 'react';
import { EventCard, ErrorNote, Field, Spinner } from '@/components/ui';
import { eventBlock, findClashes, slotBlock, type Block } from '@/lib/clash';
import { useData } from '@/lib/data';
import { appliesTo } from '@/lib/events';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { addDays, DAY_NAMES, fmtClock, lagosDate, toMinutes, weekStart } from '@/lib/time';

export default function Timetable() {
  const { profile, faculties } = useSession();
  const { loading, error, events, signups, slots, counts, filter, reload } = useData();
  const [offset, setOffset] = useState(0);
  const [form, setForm] = useState({ course: '', day: 1, start: '08:00', end: '10:00', venue: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const ws = addDays(weekStart(), offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const mine = new Map(signups.map((s) => [s.event_id, s.status]));
  const going = events.filter((e) => ['going', 'attended', 'waiting'].includes(mine.get(e.id) ?? ''));
  const shown = events.filter((e) => mine.has(e.id) || appliesTo(e, filter));
  const goingBlocks = going.map(eventBlock);
  const slotBlocks = slots.map(slotBlock);

  const candidate: Block = { id: 'new', label: form.course || 'New class', dow: form.day, start: toMinutes(form.start), end: toMinutes(form.end) };
  const formClash = form.end > form.start ? findClashes(candidate, [...slotBlocks, ...goingBlocks]) : [];

  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    if (form.end <= form.start) return setErr('The class must end after it starts.');
    setBusy(true);
    const { error } = await supabase().from('timetable_slots').insert({
      user_id: profile!.id, course: form.course.trim(), day_of_week: form.day, start_time: form.start, end_time: form.end, venue: form.venue.trim() || null,
    });
    setBusy(false);
    if (error) return setErr('Could not save. Please try again.');
    setForm({ ...form, course: '', venue: '' }); reload();
  }
  async function remove(id: string) { await supabase().from('timetable_slots').delete().eq('id', id); reload(); }

  if (loading) return <Spinner />;
  return (
    <>
      <h1 className="text-3xl">Timetable</h1>
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex items-center justify-between gap-2">
        <button className="btn" onClick={() => setOffset(offset - 1)} aria-label="Previous week">←</button>
        <p className="text-center text-sm font-semibold">{offset === 0 ? 'This week' : `Week of ${ws}`}</p>
        <button className="btn" onClick={() => setOffset(offset + 1)} aria-label="Next week">→</button>
      </div>

      {days.map((ymd, i) => {
        const dow = i + 1;
        const classes = slots.filter((s) => s.day_of_week === dow).sort((a, b) => a.start_time.localeCompare(b.start_time));
        const evs = shown.filter((e) => lagosDate(e.starts_at) === ymd);
        const clashing = (b: Block) => findClashes(b, [...slotBlocks, ...goingBlocks]).length > 0;
        if (!classes.length && !evs.length) return (
          <section key={ymd} className="flex items-baseline gap-3 border-b border-line pb-2">
            <h2 className="text-base w-24 shrink-0">{DAY_NAMES[i]}</h2><p className="muted text-sm">Free</p>
          </section>);
        return (
          <section key={ymd} className="space-y-2">
            <h2 className="text-lg text-accent">{DAY_NAMES[i]} <span className="muted text-sm normal-case">{ymd.slice(5).split('-').reverse().join('/')}</span></h2>
            {classes.map((s) => (
              <div key={s.id} className="card flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{s.course} {clashing(slotBlock(s)) && <span className="pill pill-warn">Clash</span>}</p>
                  <p className="muted text-sm">{fmtClock(s.start_time)} – {fmtClock(s.end_time)}{s.venue ? ` · ${s.venue}` : ''}</p>
                </div>
                <button className="btn btn-danger" onClick={() => remove(s.id)} aria-label={`Delete ${s.course}`}>Delete</button>
              </div>
            ))}
            {evs.map((e) => (
              <div key={e.id}>
                {mine.has(e.id) && clashing(eventBlock(e)) && <p className="pill pill-warn mb-1">Clash with another item</p>}
                <EventCard e={e} faculties={faculties} going={mine.has(e.id)} status={mine.get(e.id)} count={counts[e.id]} />
              </div>
            ))}
          </section>
        );
      })}

      <form onSubmit={add} className="card space-y-3" aria-labelledby="addclass">
        <h2 id="addclass" className="text-xl">Add a class</h2>
        <Field label="Course"><input className="input" required placeholder="e.g. MTH 201" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} /></Field>
        <Field label="Day"><select className="input" value={form.day} onChange={(e) => setForm({ ...form, day: Number(e.target.value) })}>
          {DAY_NAMES.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts"><input className="input" type="time" required value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></Field>
          <Field label="Ends"><input className="input" type="time" required value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></Field>
        </div>
        <Field label="Venue (optional)"><input className="input" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></Field>
        {formClash.length > 0 && <p role="status" className="pill-warn card text-sm">This clashes with {formClash.map((c) => c.label).join(', ')}. You can still save it.</p>}
        {err && <ErrorNote>{err}</ErrorNote>}
        <button className="btn btn-primary w-full" disabled={busy}>Save class</button>
      </form>
      <p className="muted text-xs">Classes repeat every week. Times are in Lagos time.</p>
    </>
  );
}
