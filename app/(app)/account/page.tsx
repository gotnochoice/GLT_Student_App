'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ProfileForm } from '@/components/ProfileForm';
import { ErrorNote } from '@/components/ui';
import { disablePush, enablePush, isIos, isStandalone, pushEnabled, pushSupported } from '@/lib/push';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-[44px] items-start justify-between gap-3 py-2">
      <span><span className="block font-semibold">{label}</span>{hint && <span className="muted block text-xs">{hint}</span>}</span>
      <input type="checkbox" className="mt-1 h-6 w-6 shrink-0 accent-[#238021]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export default function Account() {
  const { profile, session, reloadProfile, signOut } = useSession();
  const [push, setPush] = useState(false);
  const [msg, setMsg] = useState('');
  const [guide, setGuide] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { pushEnabled().then(setPush); }, []);
  if (!profile) return null;

  async function set(patch: Partial<Profile>) { await supabase().from('profiles').update(patch).eq('id', profile!.id); await reloadProfile(); }

  async function turnOnPush() {
    setMsg('');
    if (isIos() && !isStandalone()) { setGuide(true); return; } // iPhone needs Add to Home Screen first
    const r = await enablePush(profile!.id);
    if (r === 'ok') { setPush(true); setMsg('Reminders are on for this phone.'); }
    else if (r === 'denied') setMsg('Notifications are blocked. You can allow them in your phone settings. The app still shows reminders on the Home tab.');
    else if (r === 'unsupported') setMsg('This phone or browser cannot show notifications. Reminders still show on the Home tab.');
    else setMsg('Could not turn on reminders. Please try again later.');
  }

  async function del() {
    setErr('');
    const res = await fetch('/api/account/delete', { method: 'POST', headers: { Authorization: `Bearer ${session!.access_token}` } });
    if (!res.ok) return setErr('Could not delete your account. Please contact an admin.');
    await signOut();
    location.href = '/login';
  }

  const staff = profile.role !== 'member';
  return (
    <>
      <h1>My account</h1>
      <p className="muted text-sm">{profile.email}</p>

      {staff && (
        <section className="card space-y-2"><h2 className="text-lg">{profile.role === 'admin' ? 'Admin' : 'Your tools'}</h2>
          {profile.role === 'admin' && <Link className="btn w-full" href="/admin">Open admin</Link>}
          {(profile.role === 'care_liaison') && <Link className="btn w-full" href="/admin/requests">Help requests</Link>}
          {profile.role === 'faculty_rep' && <Link className="btn w-full" href="/admin/events">Post to my faculty</Link>}
          {profile.role === 'tutor' && <p className="muted text-sm">Open one of your sessions in the Calendar to see sign-ups and mark attendance.</p>}
        </section>
      )}

      <section className="space-y-3"><h2 className="text-xl">About you</h2><ProfileForm /></section>

      <section className="card space-y-1"><h2 className="text-lg">Privacy choices</h2>
        <Toggle label="List me in People" hint="Only if you are a leader, tutor or adviser an admin has added. Shows your name, role and WhatsApp number. Turn off any time." checked={profile.listed} onChange={(v) => set({ listed: v })} />
        <Toggle label="Weekly goal" hint="Private to you. Off unless you turn it on." checked={profile.goals_enabled} onChange={(v) => set({ goals_enabled: v })} />
      </section>

      <section className="card space-y-1"><h2 className="text-lg">Reminders</h2>
        <p className="muted text-sm">Reminders always show on the Home tab. Phone notifications are extra.</p>
        <Toggle label="Tutorials" hint="24 hours and 1 hour before" checked={profile.remind_tutorials} onChange={(v) => set({ remind_tutorials: v })} />
        <Toggle label="Events" hint="24 hours before" checked={profile.remind_events} onChange={(v) => set({ remind_events: v })} />
        <Toggle label="Weekly goal prompt" hint="Sunday evening" checked={profile.remind_goal} onChange={(v) => set({ remind_goal: v })} />
        {pushSupported() || isIos() ? (
          push ? <button className="btn w-full" onClick={async () => { await disablePush(); setPush(false); }}>Turn off phone notifications</button>
               : <button className="btn btn-primary w-full" onClick={turnOnPush}>Turn on phone notifications</button>
        ) : <p className="muted text-sm">Phone notifications are not available on this browser.</p>}
        {msg && <p role="status" className="text-sm">{msg}</p>}
        {guide && (
          <div role="dialog" aria-label="Add to Home Screen" className="card space-y-1 text-sm">
            <p className="font-semibold">First, add this app to your Home Screen</p>
            <ol className="list-decimal pl-5"><li>Tap the Share button in Safari (the square with an arrow).</li><li>Tap <b>Add to Home Screen</b>, then <b>Add</b>.</li>
              <li>Open the app from your Home Screen and come back here to turn on notifications.</li></ol>
            <button className="btn w-full" onClick={() => setGuide(false)}>Got it</button>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <Link href="/privacy" className="btn w-full">What we store and why</Link>
        <button className="btn w-full" onClick={signOut}>Sign out</button>
        {!confirmDelete ? <button className="btn btn-danger w-full" onClick={() => setConfirmDelete(true)}>Delete my account</button> : (
          <div className="card space-y-2"><p className="text-sm">This permanently deletes your profile, sign-ups, timetable, goals and help requests. It cannot be undone.</p>
            <button className="btn btn-danger w-full" onClick={del}>Yes, delete everything</button>
            <button className="btn w-full" onClick={() => setConfirmDelete(false)}>Keep my account</button>{err && <ErrorNote>{err}</ErrorNote>}</div>
        )}
      </section>
    </>
  );
}
