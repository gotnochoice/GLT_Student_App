'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Field, Spinner } from '@/components/ui';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { weekStart } from '@/lib/time';
import type { Goal } from '@/lib/types';

export default function GoalPage() {
  const { profile } = useSession();
  const ws = weekStart();
  const [goal, setGoal] = useState<Goal | null | undefined>(undefined);
  const [text, setText] = useState('');

  useEffect(() => { supabase().from('goals').select('*').eq('week_start', ws).maybeSingle().then(({ data }) => { setGoal(data as Goal | null); setText((data as Goal | null)?.text ?? ''); }); }, [ws]);
  if (!profile?.goals_enabled) return (
    <><h1 className="text-3xl">Weekly goal</h1><p className="muted">Weekly goals are off. They are private to you. <Link className="underline" href="/account">Turn them on in your account</Link>.</p></>
  );
  if (goal === undefined) return <Spinner />;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { data } = await supabase().from('goals').upsert({ user_id: profile!.id, week_start: ws, text: text.trim(), done: goal?.done ?? false }, { onConflict: 'user_id,week_start' }).select().single();
    setGoal(data as Goal);
  }
  async function toggle() {
    const { data } = await supabase().from('goals').update({ done: !goal!.done }).eq('id', goal!.id).select().single();
    setGoal(data as Goal);
  }
  return (
    <>
      <h1 className="text-3xl">Weekly goal</h1>
      <p className="muted">One short goal for the week. Only you can see it.</p>
      <form onSubmit={save} className="space-y-3">
        <Field label="This week I will…"><input className="input" required maxLength={140} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Finish two chapters of MTH 201" /></Field>
        <button className="btn btn-primary w-full">{goal ? 'Update goal' : 'Save goal'}</button>
      </form>
      {goal && <button className="btn w-full" aria-pressed={goal.done} onClick={toggle}>{goal.done ? '✓ Done. Tap to undo' : 'I did it'}</button>}
    </>
  );
}
