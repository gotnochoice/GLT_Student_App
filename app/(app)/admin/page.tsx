'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Gate } from '@/components/Gate';
import { supabase } from '@/lib/supabase';

export default function Admin() {
  const [urgent, setUrgent] = useState(0);
  useEffect(() => { supabase().from('help_requests').select('id', { count: 'exact', head: true }).eq('urgent', true).neq('status', 'closed').then(({ count }) => setUrgent(count ?? 0)); }, []);
  const items = [
    ['/admin/events', 'Events and tutorials', 'Create, edit, delete'],
    ['/admin/people', 'People list', 'Leaders, tutors, advisers, care liaison'],
    ['/admin/faculties', 'Faculties and departments', 'Add or rename'],
    ['/admin/users', 'Members and roles', 'Make someone an admin, tutor, rep or care liaison'],
    ['/admin/requests', 'Help requests', 'Care liaison and admins only'],
    ['/admin/digest', 'Weekly digest', 'Copy and paste into WhatsApp'],
  ];
  return (
    <Gate roles={['admin']} title="Admin">
      {urgent > 0 && <Link href="/admin/requests" role="alert" className="card block border-[var(--bad)] font-semibold" style={{ color: 'var(--bad)' }}>
        {urgent} urgent help request{urgent > 1 ? 's' : ''} need same-day attention →</Link>}
      <ul className="space-y-2">{items.map(([href, t, d]) => (
        <li key={href}><Link href={href} className="card block"><p className="font-semibold">{t}</p><p className="muted text-sm">{d}</p></Link></li>))}</ul>
    </Gate>
  );
}
