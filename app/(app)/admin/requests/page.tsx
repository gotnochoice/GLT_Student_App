'use client';
import { useEffect, useState } from 'react';
import { Gate } from '@/components/Gate';
import { Empty } from '@/components/ui';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { fmtDayTime } from '@/lib/time';
import type { HelpRequest } from '@/lib/types';

export default function Requests() {
  const { profile } = useSession();
  const [rows, setRows] = useState<HelpRequest[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const load = async () => {
    const { data } = await supabase().from('help_requests').select('*').order('urgent', { ascending: false }).order('created_at', { ascending: false });
    setRows((data ?? []) as HelpRequest[]);
  };
  useEffect(() => { load(); }, []);
  // Names are visible only to the care liaison, never to other admins' lists elsewhere.
  useEffect(() => {
    if (profile?.role !== 'care_liaison' && profile?.role !== 'admin') return;
    supabase().rpc('request_authors').then(({ data }) => setNames(Object.fromEntries(((data ?? []) as { id: string; full_name: string }[]).map((r) => [r.id, r.full_name]))));
  }, [profile?.role]);
  const set = async (id: string, status: string) => { await supabase().from('help_requests').update({ status, assigned_to: status === 'new' ? null : profile!.id }).eq('id', id); load(); };
  return (
    <Gate roles={['care_liaison', 'admin']} title="Help requests">
      <p className="muted text-sm">Private. Do not share the details outside the care team.</p>
      {rows.length === 0 && <Empty>No requests.</Empty>}
      <ul className="space-y-3">{rows.map((r) => (
        <li key={r.id} className={`card space-y-2 ${r.urgent && r.status !== 'closed' ? 'border-[var(--bad)]' : ''}`}>
          <div className="flex flex-wrap items-center gap-2">
            {r.urgent && <span className="pill pill-gold">URGENT: same day</span>}
            <span className="pill">{r.status}</span><span className="muted text-xs">{fmtDayTime(r.created_at)}</span>
          </div>
          <p className="font-semibold">{names[r.user_id] || 'Member'}: {r.topic}</p>
          <p className="whitespace-pre-line">{r.message}</p>
          <p className="muted text-sm">Prefers: {r.preferred_contact ?? 'any'}</p>
          <div className="flex gap-2">
            {r.status !== 'assigned' && r.status !== 'closed' && <button className="btn flex-1" onClick={() => set(r.id, 'assigned')}>I&apos;m on it</button>}
            {r.status !== 'closed' ? <button className="btn flex-1" onClick={() => set(r.id, 'closed')}>Close</button> : <button className="btn flex-1" onClick={() => set(r.id, 'new')}>Reopen</button>}
          </div>
        </li>))}</ul>
    </Gate>
  );
}
