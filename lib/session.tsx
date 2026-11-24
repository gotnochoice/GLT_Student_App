'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/auth-js';
import { configured, supabase } from './supabase';
import type { Department, Faculty, Profile } from './types';

type Ctx = {
  ready: boolean; session: Session | null; profile: Profile | null;
  faculties: Faculty[]; departments: Department[];
  reloadProfile: () => Promise<void>; reloadRefs: () => Promise<void>; signOut: () => Promise<void>;
};
const C = createContext<Ctx>(null as never);
export const useSession = () => useContext(C);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    if (!configured) { setReady(true); return; }
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => { setSession(data.session); if (!data.session) setReady(true); });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => { setSession(s); if (!s) { setProfile(null); setReady(true); } });
    return () => sub.subscription.unsubscribe();
  }, []);

  const reloadProfile = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase().from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    setProfile(data as Profile | null);
    setReady(true);
  }, [session]);

  const reloadRefs = useCallback(async () => {
    const sb = supabase();
    const [f, d] = await Promise.all([
      sb.from('faculties').select('*').order('sort').order('name'),
      sb.from('departments').select('*').order('name'),
    ]);
    setFaculties((f.data ?? []) as Faculty[]); setDepartments((d.data ?? []) as Department[]);
  }, []);

  useEffect(() => { if (session) { reloadProfile(); reloadRefs(); } }, [session, reloadProfile, reloadRefs]);

  const signOut = useCallback(async () => { await supabase().auth.signOut(); }, []);
  const value = useMemo(() => ({ ready, session, profile, faculties, departments, reloadProfile, reloadRefs, signOut }),
    [ready, session, profile, faculties, departments, reloadProfile, reloadRefs, signOut]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
