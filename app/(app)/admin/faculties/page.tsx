'use client';
import { useState } from 'react';
import { Gate } from '@/components/Gate';
import { ErrorNote } from '@/components/ui';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export default function AdminFaculties() {
  const { faculties, departments, reloadRefs } = useSession();
  const [fname, setFname] = useState('');
  const [dname, setDname] = useState<Record<number, string>>({});
  const [err, setErr] = useState('');
  const run = async (p: PromiseLike<{ error: unknown }>) => { const { error } = await p; setErr(error ? 'That did not work. A name may already exist, or the item is in use.' : ''); await reloadRefs(); };

  return (
    <Gate roles={['admin']} title="Faculties">
      {err && <ErrorNote>{err}</ErrorNote>}
      <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (fname.trim()) { await run(supabase().from('faculties').insert({ name: fname.trim(), sort: faculties.length + 1 })); setFname(''); } }}>
        <input className="input" aria-label="New faculty name" placeholder="New faculty" value={fname} onChange={(e) => setFname(e.target.value)} />
        <button className="btn btn-primary">Add</button>
      </form>
      {faculties.map((f) => (
        <section key={f.id} className="card space-y-2">
          <div className="flex items-center gap-2">
            <input className="input font-semibold" aria-label={`Faculty name: ${f.name}`} defaultValue={f.name}
              onBlur={(e) => e.target.value.trim() && e.target.value !== f.name && run(supabase().from('faculties').update({ name: e.target.value.trim() }).eq('id', f.id))} />
            <button className="btn btn-danger" aria-label={`Delete ${f.name}`} onClick={() => confirm(`Delete ${f.name} and its departments?`) && run(supabase().from('faculties').delete().eq('id', f.id))}>✕</button>
          </div>
          <ul className="space-y-1">{departments.filter((d) => d.faculty_id === f.id).map((d) => (
            <li key={d.id} className="flex items-center gap-2">
              <input className="input" aria-label={`Department name: ${d.name}`} defaultValue={d.name}
                onBlur={(e) => e.target.value.trim() && e.target.value !== d.name && run(supabase().from('departments').update({ name: e.target.value.trim() }).eq('id', d.id))} />
              <button className="btn btn-danger" aria-label={`Delete ${d.name}`} onClick={() => run(supabase().from('departments').delete().eq('id', d.id))}>✕</button>
            </li>))}</ul>
          <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); const n = (dname[f.id] ?? '').trim(); if (n) { await run(supabase().from('departments').insert({ faculty_id: f.id, name: n })); setDname({ ...dname, [f.id]: '' }); } }}>
            <input className="input" aria-label={`New department in ${f.name}`} placeholder="New department" value={dname[f.id] ?? ''} onChange={(e) => setDname({ ...dname, [f.id]: e.target.value })} />
            <button className="btn">Add</button>
          </form>
        </section>))}
    </Gate>
  );
}
