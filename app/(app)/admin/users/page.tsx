'use client';
import { useEffect, useState } from 'react';
import { Gate } from '@/components/Gate';
import { ErrorNote } from '@/components/ui';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { Profile, Role } from '@/lib/types';

const ROLES: [Role, string][] = [['member', 'Member'], ['tutor', 'Tutor'], ['faculty_rep', 'Faculty rep'], ['care_liaison', 'Care liaison'], ['admin', 'Admin']];

export default function Users() {
  const { profile } = useSession();
  const [rows, setRows] = useState<Profile[]>([]);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  const load = () => supabase().from('profiles').select('*').order('full_name').then(({ data }) => setRows((data ?? []) as Profile[]));
  useEffect(() => { load(); }, []);
  async function setRole(id: string, role: Role) {
    if (id === profile?.id && role !== 'admin' && !confirm('You will lose admin access. Continue?')) return;
    const { error } = await supabase().from('profiles').update({ role }).eq('id', id);
    setErr(error ? 'Could not change the role.' : ''); load();
  }
  const list = rows.filter((r) => `${r.full_name} ${r.email}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Gate roles={['admin']} title="Members and roles">
      <p className="muted text-sm">A new member appears here after they sign in once. Keep at least two admins.</p>
      <input className="input" type="search" aria-label="Search members" placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} />
      {err && <ErrorNote>{err}</ErrorNote>}
      <p className="muted text-xs">{rows.length} members, {rows.filter((r) => r.role === 'admin').length} admins</p>
      <ul className="space-y-2">{list.map((r) => (
        <li key={r.id} className="card space-y-2"><div><p className="font-semibold">{r.full_name || 'No name yet'}</p><p className="muted text-sm break-all">{r.email}</p></div>
          <select className="input" aria-label={`Role for ${r.full_name || r.email}`} value={r.role} onChange={(e) => setRole(r.id, e.target.value as Role)}>
            {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></li>))}</ul>
    </Gate>
  );
}
