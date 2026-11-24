'use client';
import Link from 'next/link';
import { Gate } from '@/components/Gate';
import { EventCard, Empty } from '@/components/ui';
import { useData } from '@/lib/data';
import { useSession } from '@/lib/session';

export default function AdminEvents() {
  const { faculties, profile } = useSession();
  const { events } = useData();
  const list = profile?.role === 'faculty_rep' ? events.filter((e) => e.created_by === profile.id) : events;
  return (
    <Gate roles={['admin', 'faculty_rep']} title="Events">
      <Link href="/admin/events/new" className="btn btn-primary w-full">Add an event or tutorial</Link>
      {list.length === 0 && <Empty>Nothing yet.</Empty>}
      <ul className="space-y-2">{list.map((e) => (
        <li key={e.id} className="space-y-1"><EventCard e={e} faculties={faculties} />
          <Link className="btn w-full" href={`/admin/events/${e.id}`}>Edit</Link></li>))}</ul>
    </Gate>
  );
}
