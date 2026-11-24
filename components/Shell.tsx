'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { DataProvider, useData } from '@/lib/data';
import { useSession } from '@/lib/session';
import { configured } from '@/lib/supabase';
import { levelLabel, LEVELS } from '@/lib/events';
import { Logo, Sheet, Spinner } from './ui';

const TABS = [
  { href: '/', label: 'Home', d: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  { href: '/calendar', label: 'Calendar', d: 'M7 2v3M17 2v3M3 8h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z' },
  { href: '/timetable', label: 'Timetable', d: 'M12 7v5l3 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z' },
  { href: '/people', label: 'People', d: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21a8 8 0 0 1 16 0' },
];

function FilterChip() {
  const { profile, faculties } = useSession();
  const { filter, setFilter, filterIsCustom } = useData();
  const [open, setOpen] = useState(false);
  const fac = faculties.find((f) => f.id === filter.facultyId)?.name ?? 'All faculties';
  const label = `${fac}${filter.level ? `, ${levelLabel(filter.level)}` : ''}`;
  return (
    <>
      <button className="chip max-w-[60vw] truncate" onClick={() => setOpen(true)} aria-label={`Filter: ${label}. Change`}>
        <span className="truncate">{label}</span><span aria-hidden className="ml-2">▾</span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Show me">
        <div className="space-y-4">
          <label className="block"><span className="label">Faculty</span>
            <select className="input" value={filter.facultyId ?? ''} onChange={(e) => setFilter({ ...filter, facultyId: e.target.value ? Number(e.target.value) : null })}>
              <option value="">All faculties</option>
              {faculties.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select></label>
          <label className="block"><span className="label">Level</span>
            <select className="input" value={filter.level ?? ''} onChange={(e) => setFilter({ ...filter, level: e.target.value ? Number(e.target.value) : null })}>
              <option value="">All levels</option>
              {LEVELS.map((l) => <option key={l} value={l}>{levelLabel(l)}</option>)}
            </select></label>
          {filterIsCustom && profile && <button className="btn w-full" onClick={() => setFilter(null)}>Back to my own faculty and level</button>}
        </div>
      </Sheet>
    </>
  );
}

function Inner({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { profile } = useSession();
  const onboarded = profile?.onboarded;
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-line bg-bg/95 px-4 py-2 backdrop-blur">
        <Link href="/" className="flex min-h-[44px] min-w-[44px] items-center justify-center" aria-label="GLT Academic Unit home"><Logo size={36} /></Link>
        {onboarded && <FilterChip />}
        {onboarded && (
          <Link href="/account" className="btn !px-3" aria-label="My account">
            <span aria-hidden>{(profile?.full_name || '?').trim().charAt(0).toUpperCase()}</span>
          </Link>
        )}
      </header>
      <main className="flex-1 space-y-4 px-4 pb-28 pt-4">{children}</main>
      {onboarded && (
        <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-bg/95 backdrop-blur">
          <ul className="mx-auto grid max-w-lg grid-cols-4">
            {TABS.map((t) => {
              const active = t.href === '/' ? path === '/' : path.startsWith(t.href);
              return (
                <li key={t.href}>
                  <Link href={t.href} aria-current={active ? 'page' : undefined}
                    className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs font-semibold ${active ? 'text-accent' : 'muted'}`}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={t.d} /></svg>
                    {t.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { ready, session, profile } = useSession();
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    if (!ready || !configured) return;
    if (!session) router.replace('/login');
    else if (profile && !profile.onboarded && path !== '/onboarding') router.replace('/onboarding');
  }, [ready, session, profile, path, router]);

  if (!configured) return <main className="p-6"><h1 className="text-2xl">Almost ready</h1><p className="muted mt-2">The app is not connected to its database yet. See README.md, step 2.</p></main>;
  if (!ready || !session || !profile) return <Spinner />;
  return <DataProvider><Inner>{children}</Inner></DataProvider>;
}
