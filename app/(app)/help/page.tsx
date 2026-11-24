'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ErrorNote, Field } from '@/components/ui';
import { CONTACT_PREFS, COUNSELLING_TEXT, COUNSELLING_TITLE, HELP_TOPICS } from '@/lib/safety';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { fmtDay } from '@/lib/time';

export default function Help() {
  const { profile } = useSession();
  const [topic, setTopic] = useState(HELP_TOPICS[0]);
  const [message, setMessage] = useState('');
  const [pref, setPref] = useState(CONTACT_PREFS[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [mine, setMine] = useState<{ id: string; topic: string; status: string; created_at: string }[]>([]);

  const load = () => supabase().from('help_requests').select('id,topic,status,created_at').order('created_at', { ascending: false }).limit(5)
    .then(({ data }) => setMine((data ?? []) as never));
  useEffect(() => { load(); }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('');
    const { error } = await supabase().from('help_requests').insert({ user_id: profile!.id, topic, message: message.trim(), preferred_contact: pref });
    setBusy(false);
    if (error) return setErr('Could not send. Please try again.');
    setDone(true); setMessage(''); load();
  }

  if (done) return (
    <div className="space-y-4">
      <h1 className="text-3xl">{COUNSELLING_TITLE}</h1>
      <div role="status" className="card space-y-3"><p>{COUNSELLING_TEXT}</p></div>
      <Link className="btn w-full" href="/people">Back to People</Link>
    </div>
  );
  return (
    <>
      <Link href="/people" className="muted inline-flex min-h-[44px] items-center text-sm underline">← People</Link>
      <h1 className="text-3xl">Ask for help</h1>
      <p className="muted">This goes only to the care liaison. Other members, tutors and reps cannot see it.</p>
      <form onSubmit={send} className="space-y-4">
        <Field label="What is it about?"><select className="input" value={topic} onChange={(e) => setTopic(e.target.value)}>{HELP_TOPICS.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Tell us a little"><textarea className="input" required rows={5} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
        <Field label="How should we reach you?"><select className="input" value={pref} onChange={(e) => setPref(e.target.value)}>{CONTACT_PREFS.map((t) => <option key={t}>{t}</option>)}</select></Field>
        {err && <ErrorNote>{err}</ErrorNote>}
        <button className="btn btn-primary w-full" disabled={busy || !message.trim()}>{busy ? 'Sending…' : 'Send privately'}</button>
      </form>
      {mine.length > 0 && <section className="space-y-2"><h2 className="text-lg">Your requests</h2>
        <ul className="space-y-2">{mine.map((r) => <li key={r.id} className="card flex justify-between text-sm"><span>{r.topic} · {fmtDay(r.created_at)}</span>
          <span className="pill">{r.status === 'new' ? 'Sent' : r.status === 'assigned' ? 'Being looked at' : 'Closed'}</span></li>)}</ul></section>}
    </>
  );
}
