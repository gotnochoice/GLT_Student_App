'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import { useSession } from './session';
import { appliesTo, filterFromProfile, type Filter } from './events';
import { lagosDayStartIso } from './time';
import type { EventRow, Signup, Slot } from './types';

type Ctx = {
  loading: boolean; error: string | null;
  events: EventRow[]; signups: Signup[]; slots: Slot[]; counts: Record<string, number>;
  filter: Filter; setFilter: (f: Filter | null) => void; filterIsCustom: boolean;
  reload: () => Promise<void>;
};
const C = createContext<Ctx>(null as never);
export const useData = () => useContext(C);

const KEY = 'glt-filter';

export function DataProvider({ children }: { children: ReactNode }) {
  const { profile, session } = useSession();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [custom, setCustom] = useState<Filter | null>(null);

  useEffect(() => { try { const s = localStorage.getItem(KEY); if (s) setCustom(JSON.parse(s)); } catch {} }, []);
  const setFilter = useCallback((f: Filter | null) => {
    setCustom(f);
    try { f ? localStorage.setItem(KEY, JSON.stringify(f)) : localStorage.removeItem(KEY); } catch {}
  }, []);

  const reload = useCallback(async () => {
    if (!session) return;
    const sb = supabase();
    const [e, s, t, c] = await Promise.all([
      sb.from('events').select('*').gte('starts_at', lagosDayStartIso(-1)).order('starts_at').limit(400),
      sb.from('signups').select('*').neq('status', 'cancelled'),
      sb.from('timetable_slots').select('*').order('start_time'),
      sb.rpc('event_counts'),
    ]);
    const err = e.error || s.error || t.error;
    setError(err ? 'Could not load. Check your connection and try again.' : null);
    setEvents((e.data ?? []) as EventRow[]); setSignups((s.data ?? []) as Signup[]); setSlots((t.data ?? []) as Slot[]);
    setCounts(Object.fromEntries(((c.data ?? []) as { event_id: string; going: number }[]).map((r) => [r.event_id, Number(r.going)])));
    setLoading(false);
  }, [session]);

  useEffect(() => { reload(); }, [reload]);

  const filter = custom ?? filterFromProfile(profile);
  const filterIsCustom = custom != null;
  const value = useMemo(() => ({ loading, error, events, signups, slots, counts, filter, setFilter, filterIsCustom, reload }),
    [loading, error, events, signups, slots, counts, filter, setFilter, filterIsCustom, reload]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

export const useFilteredEvents = () => {
  const { events, filter } = useData();
  return useMemo(() => events.filter((e) => appliesTo(e, filter)), [events, filter]);
};
