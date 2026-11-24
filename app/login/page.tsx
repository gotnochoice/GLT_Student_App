'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/ui';
import { useSession } from '@/lib/session';
import { configured, supabase } from '@/lib/supabase';

export default function Login() {
  const { session, ready } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  useEffect(() => { if (ready && session) router.replace('/'); }, [ready, session, router]);

  async function magic(e: React.FormEvent) {
    e.preventDefault(); setState('sending');
    const { error } = await supabase().auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: location.origin + '/' } });
    if (error) { setState('error'); setMsg(error.message); } else setState('sent');
  }
  async function google() {
    const { error } = await supabase().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/' } });
    if (error) { setState('error'); setMsg(error.message); }
  }

  if (!configured) return <main className="p-6"><p>The app is not connected to its database yet. See README.md.</p></main>;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6 py-10">
      <div className="space-y-3 text-center">
        <div className="flex justify-center"><Logo size={72} /></div>
        <h1 className="text-4xl">GLT Academic Unit</h1>
        <p className="muted">Events, tutorials and your timetable, in one place.</p>
      </div>
      {state === 'sent' ? (
        <div className="card space-y-2 text-center" role="status">
          <p className="font-semibold">Check your email</p>
          <p className="muted text-sm">We sent a sign-in link to {email}. Open it on this phone. It may take a minute. Look in spam too.</p>
          <button className="btn w-full" onClick={() => setState('idle')}>Use a different email</button>
        </div>
      ) : (
        <>
          <button className="btn btn-primary w-full" onClick={google}>Continue with Google</button>
          <p className="muted text-center text-sm">or</p>
          <form onSubmit={magic} className="space-y-3">
            <label className="block"><span className="label">Email</span>
              <input className="input" type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
            <button className="btn w-full" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}</button>
            {state === 'error' && <p role="alert" style={{ color: 'var(--bad)' }} className="text-sm">{msg}</p>}
          </form>
        </>
      )}
      <p className="muted text-center text-xs">No password needed. <Link href="/privacy" className="underline">What we store and why</Link></p>
    </main>
  );
}
