'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Gate } from '@/components/Gate';
import { ErrorNote, Field } from '@/components/ui';
import { useData } from '@/lib/data';
import { KIND_LABEL, LEVELS, levelLabel } from '@/lib/events';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { isoToLagosInput, lagosInputToIso } from '@/lib/time';

export default function EventForm() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const { profile, faculties } = useSession();
  const { events, reload } = useData();
  const router = useRouter();
  const existing = events.find((e) => e.id === id);
  const isAdmin = profile?.role === 'admin';
  const [f, setF] = useState({ title: '', description: '', kind: 'tutorial', starts: '', ends: '', venue: '', online: '', faculty: '' as number | '',
    lmin: 100, lmax: 600, cap: '' as number | '', tutor: '' });
  const [tutors, setTutors] = useState<{ id: string; full_name: string }[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (existing) setF({ title: existing.title, description: existing.description ?? '', kind: existing.kind, starts: isoToLagosInput(existing.starts_at),
      ends: existing.ends_at ? isoToLagosInput(existing.ends_at) : '', venue: existing.venue ?? '', online: existing.online_link ?? '', faculty: existing.faculty_id ?? '',
      lmin: existing.level_min, lmax: existing.level_max, cap: existing.capacity ?? '', tutor: existing.tutor_id ?? '' });
  }, [existing]);
  useEffect(() => { if (isAdmin) supabase().from('profiles').select('id,full_name').eq('role', 'tutor').then(({ data }) => setTutors((data ?? []) as never)); }, [isAdmin]);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    if (f.ends && f.ends <= f.starts) return setErr('The end time must be after the start time.');
    const faculty = isAdmin ? (f.faculty || null) : profile!.faculty_id;
    if (!isAdmin && faculty == null) return setErr('Set your faculty in My account first.');
    const row = {
      title: f.title.trim(), description: f.description.trim() || null, kind: f.kind, starts_at: lagosInputToIso(f.starts),
      ends_at: f.ends ? lagosInputToIso(f.ends) : null, venue: f.venue.trim() || null, online_link: f.online.trim() || null,
      faculty_id: faculty, level_min: f.lmin, level_max: f.lmax, capacity: f.cap || null, tutor_id: isAdmin ? (f.tutor || null) : null,
    };
    setBusy(true);
    const { error } = isNew ? await supabase().from('events').insert({ ...row, created_by: profile!.id })
      : await supabase().from('events').update(isAdmin ? row : { ...row, tutor_id: existing?.tutor_id }).eq('id', id);
    setBusy(false);
    if (error) return setErr('Could not save. ' + (error.message.includes('row-level') ? 'You are not allowed to do that.' : 'Please check the fields.'));
    await reload(); router.replace('/admin/events');
  }
  async function del() {
    if (!confirm('Delete this event? Sign-ups for it will be removed.')) return;
    const { error } = await supabase().from('events').delete().eq('id', id);
    if (error) return setErr('Could not delete.');
    await reload(); router.replace('/admin/events');
  }
  const kinds = isAdmin ? Object.keys(KIND_LABEL) : ['tutorial', 'unit', 'part2'];

  return (
    <Gate roles={['admin', 'faculty_rep']} title={isNew ? 'New event' : 'Edit event'}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Title"><input className="input" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Type"><select className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{kinds.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select></Field>
        <Field label="Starts (Lagos time)"><input className="input" type="datetime-local" required value={f.starts} onChange={(e) => setF({ ...f, starts: e.target.value })} /></Field>
        <Field label="Ends (optional)"><input className="input" type="datetime-local" value={f.ends} onChange={(e) => setF({ ...f, ends: e.target.value })} /></Field>
        <Field label="Venue"><input className="input" value={f.venue} onChange={(e) => setF({ ...f, venue: e.target.value })} /></Field>
        <Field label="Online link (optional)"><input className="input" type="url" value={f.online} onChange={(e) => setF({ ...f, online: e.target.value })} /></Field>
        {isAdmin ? (
          <Field label="For which faculty?"><select className="input" value={f.faculty} onChange={(e) => setF({ ...f, faculty: e.target.value ? Number(e.target.value) : '' })}>
            <option value="">Everyone (whole church)</option>{faculties.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        ) : <p className="muted text-sm">This will be posted to your faculty only.</p>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Lowest level"><select className="input" value={f.lmin} onChange={(e) => setF({ ...f, lmin: Number(e.target.value) })}>{LEVELS.map((l) => <option key={l} value={l}>{levelLabel(l)}</option>)}</select></Field>
          <Field label="Highest level"><select className="input" value={f.lmax} onChange={(e) => setF({ ...f, lmax: Number(e.target.value) })}>{LEVELS.map((l) => <option key={l} value={l}>{levelLabel(l)}</option>)}</select></Field>
        </div>
        <Field label="Places (leave empty for no limit)"><input className="input" type="number" min={1} value={f.cap} onChange={(e) => setF({ ...f, cap: e.target.value ? Number(e.target.value) : '' })} /></Field>
        {isAdmin && f.kind === 'tutorial' && (
          <Field label="Tutor" hint="Tutors are chosen from members whose role is Tutor (Members and roles)."><select className="input" value={f.tutor} onChange={(e) => setF({ ...f, tutor: e.target.value })}>
            <option value="">No tutor yet</option>{tutors.map((t) => <option key={t.id} value={t.id}>{t.full_name || 'Unnamed'}</option>)}</select></Field>
        )}
        <Field label="Details"><textarea className="input" rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        {err && <ErrorNote>{err}</ErrorNote>}
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        {!isNew && <button type="button" className="btn btn-danger w-full" onClick={del}>Delete event</button>}
      </form>
    </Gate>
  );
}
