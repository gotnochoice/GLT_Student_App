'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { LEVELS, levelLabel } from '@/lib/events';
import { ErrorNote, Field } from './ui';

export function ProfileForm({ onboarding }: { onboarding?: boolean }) {
  const { profile, faculties, departments, reloadProfile } = useSession();
  const router = useRouter();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [wa, setWa] = useState(profile?.whatsapp ?? '');
  const [fac, setFac] = useState<number | ''>(profile?.faculty_id ?? '');
  const [dep, setDep] = useState<number | ''>(profile?.department_id ?? '');
  const [level, setLevel] = useState<number | ''>(profile?.level ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(''); setSaved(false);
    const { error } = await supabase().from('profiles').update({
      full_name: name.trim(), whatsapp: wa.trim() || null, faculty_id: fac || null, department_id: dep || null,
      level: level || null, onboarded: true,
    }).eq('id', profile!.id);
    setBusy(false);
    if (error) return setErr('Could not save. Please try again.');
    await reloadProfile();
    if (onboarding) router.replace('/'); else setSaved(true);
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Field label="Your name"><input className="input" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="WhatsApp number (optional)" hint="Only used if you choose to be listed in People. Never shown otherwise.">
        <input className="input" inputMode="tel" autoComplete="tel" placeholder="0803 123 4567" value={wa} onChange={(e) => setWa(e.target.value)} /></Field>
      <Field label="Faculty">
        <select className="input" required value={fac} onChange={(e) => { setFac(e.target.value ? Number(e.target.value) : ''); setDep(''); }}>
          <option value="">Choose faculty</option>
          {faculties.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select></Field>
      <Field label="Department">
        <select className="input" required value={dep} onChange={(e) => setDep(e.target.value ? Number(e.target.value) : '')} disabled={!fac}>
          <option value="">{fac ? 'Choose department' : 'Choose faculty first'}</option>
          {departments.filter((d) => d.faculty_id === fac).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select></Field>
      <Field label="Level">
        <select className="input" required value={level} onChange={(e) => setLevel(e.target.value ? Number(e.target.value) : '')}>
          <option value="">Choose level</option>
          {LEVELS.map((l) => <option key={l} value={l}>{l === 600 ? 'Postgraduate' : levelLabel(l)}</option>)}
        </select></Field>
      {err && <ErrorNote>{err}</ErrorNote>}
      <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : onboarding ? 'Continue' : 'Save'}</button>
      {saved && <p role="status" className="text-center text-sm text-accent">Saved.</p>}
    </form>
  );
}
