'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Empty, ErrorNote, Spinner } from '@/components/ui';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { waLink } from '@/lib/whatsapp';
import type { Person } from '@/lib/types';

const KIND: Record<string, string> = { leader: 'Leader', tutor: 'Tutor', adviser: 'Faculty adviser', care: 'Care liaison' };

function Card({ p }: { p: Person }) {
  const link = waLink(p.whatsapp, `Hello ${p.name.split(' ')[0]}, I found you on the GLT Academic Unit app.`);
  return (
    <li className="card flex items-center justify-between gap-3">
      <div className="min-w-0"><p className="font-semibold">{p.name}</p><p className="muted text-sm">{p.title}</p>{p.topics && <p className="muted text-xs">Can help with: {p.topics}</p>}</div>
      {link ? <a className="btn btn-primary shrink-0" href={link} target="_blank" rel="noopener noreferrer" aria-label={`Chat with ${p.name} on WhatsApp`}>WhatsApp</a> : null}
    </li>
  );
}

export default function People() {
  const { profile, faculties } = useSession();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    supabase().from('people').select('*').order('name').then(({ data, error }) => { if (error) setErr(true); setPeople((data ?? []) as Person[]); });
  }, []);

  if (!people) return <Spinner />;
  const unit = people.filter((p) => p.faculty_id == null);
  const byFac = faculties.filter((f) => people.some((p) => p.faculty_id === f.id))
    .sort((a, b) => (a.id === profile?.faculty_id ? -1 : b.id === profile?.faculty_id ? 1 : 0));
  return (
    <>
      <div><h1>People</h1><p className="muted">Leaders, tutors and faculty advisers. Tap to chat on WhatsApp.</p></div>
      <Link href="/help" className="card block border-brand">
        <p className="font-semibold">Need help with something?</p>
        <p className="muted text-sm">Send a private request. Only the care liaison sees it. →</p>
      </Link>
      {err && <ErrorNote>Could not load the list. Check your connection.</ErrorNote>}
      {people.length === 0 && !err && <Empty>No one is listed yet.</Empty>}
      {byFac.map((f) => (
        <section key={f.id} className="space-y-2"><h2 className="text-lg text-accent">{f.name}</h2>
          <ul className="space-y-2">{people.filter((p) => p.faculty_id === f.id).map((p) => <Card key={p.id} p={p} />)}</ul></section>
      ))}
      {unit.length > 0 && <section className="space-y-2"><h2 className="text-lg text-accent">Whole unit</h2>
        <ul className="space-y-2">{unit.map((p) => <Card key={p.id} p={p} />)}</ul></section>}
    </>
  );
}
