'use client';
import { useCallback, useEffect, useState } from 'react';
import { Gate } from '@/components/Gate';
import { ErrorNote, Field } from '@/components/ui';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

type C = { id: string; profile_id: string | null; name: string | null; whatsapp: string | null; title: string; kind: string; faculty_id: number | null; topics: string | null; listed: boolean };
const KINDS = [['leader', 'Leader'], ['tutor', 'Tutor'], ['adviser', 'Faculty adviser (lecturer)'], ['care', 'Care liaison']];
const blank = { profile_id: '', name: '', whatsapp: '', title: '', kind: 'leader', faculty_id: '' as number | '', topics: '', listed: true };

export default function AdminPeople() {
  const { faculties } = useSession();
  const [rows, setRows] = useState<C[]>([]);
  const [members, setMembers] = useState<{ id: string; full_name: string; email: string }[]>([]);
  const [f, setF] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    const sb = supabase();
    const [c, m] = await Promise.all([sb.from('contacts').select('*').order('title'), sb.from('profiles').select('id,full_name,email').order('full_name')]);
    setRows((c.data ?? []) as C[]); setMembers((m.data ?? []) as never);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    if (!f.profile_id && !f.name.trim()) return setErr('Choose a member, or type a name for someone who does not use the app (like a lecturer).');
    const row = { profile_id: f.profile_id || null, name: f.profile_id ? null : f.name.trim(), whatsapp: f.profile_id ? null : f.whatsapp.trim() || null,
      title: f.title.trim(), kind: f.kind, faculty_id: f.faculty_id || null, topics: f.topics.trim() || null, listed: f.listed };
    const { error } = editing ? await supabase().from('contacts').update(row).eq('id', editing) : await supabase().from('contacts').insert(row);
    if (error) return setErr('Could not save.');
    setF(blank); setEditing(null); load();
  }
  const edit = (c: C) => { setEditing(c.id); setF({ profile_id: c.profile_id ?? '', name: c.name ?? '', whatsapp: c.whatsapp ?? '', title: c.title, kind: c.kind, faculty_id: c.faculty_id ?? '', topics: c.topics ?? '', listed: c.listed }); scrollTo(0, 0); };
  const del = async (id: string) => { if (confirm('Remove from the People list?')) { await supabase().from('contacts').delete().eq('id', id); load(); } };

  return (
    <Gate roles={['admin']} title="People list">
      <form onSubmit={save} className="card space-y-3">
        <h2 className="text-xl">{editing ? 'Edit person' : 'Add a person'}</h2>
        <Field label="A member of the app" hint="They must also tick “List me in People” in their account. Their name and number come from their profile.">
          <select className="input" value={f.profile_id} onChange={(e) => setF({ ...f, profile_id: e.target.value })}>
            <option value="">Not a member (e.g. a lecturer)</option>{members.map((m) => <option key={m.id} value={m.id}>{m.full_name || m.email}</option>)}</select></Field>
        {!f.profile_id && <>
          <Field label="Name"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="WhatsApp number" hint="Only add a number if they agreed to be listed."><input className="input" inputMode="tel" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} /></Field></>}
        <Field label="Title"><input className="input" required placeholder="e.g. Faculty adviser, Technology" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Type"><select className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <Field label="Faculty"><select className="input" value={f.faculty_id} onChange={(e) => setF({ ...f, faculty_id: e.target.value ? Number(e.target.value) : '' })}>
          <option value="">Whole unit</option>{faculties.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field label="Can help with (optional)"><input className="input" value={f.topics} onChange={(e) => setF({ ...f, topics: e.target.value })} /></Field>
        <label className="flex min-h-[44px] items-center gap-3"><input type="checkbox" className="h-6 w-6 accent-[#238021]" checked={f.listed} onChange={(e) => setF({ ...f, listed: e.target.checked })} />Show in People (they agreed)</label>
        {err && <ErrorNote>{err}</ErrorNote>}
        <button className="btn btn-primary w-full">Save</button>
        {editing && <button type="button" className="btn w-full" onClick={() => { setEditing(null); setF(blank); }}>Cancel</button>}
      </form>
      <ul className="space-y-2">{rows.map((c) => (
        <li key={c.id} className="card flex items-center justify-between gap-2">
          <div><p className="font-semibold">{c.name ?? members.find((m) => m.id === c.profile_id)?.full_name ?? 'Member'} {!c.listed && <span className="pill pill-warn">Hidden</span>}</p><p className="muted text-sm">{c.title}</p></div>
          <div className="flex gap-2"><button className="btn" onClick={() => edit(c)}>Edit</button><button className="btn btn-danger" onClick={() => del(c.id)} aria-label={`Remove ${c.title}`}>✕</button></div>
        </li>))}</ul>
    </Gate>
  );
}
