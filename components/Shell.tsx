'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { DataProvider, useData } from '@/lib/data';
import { useSession } from '@/lib/session';
import { configured } from '@/lib/supabase';
import { levelLabel, LEVELS } from '@/lib/events';
import { Logo, Sheet, Spinner } from './ui';

const I = {
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  cal: 'M7 2v3M17 2v3M3 8h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  clock: 'M12 7v5l3 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
  people: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21a8 8 0 0 1 16 0',
  help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01',
  admin: 'M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z',
  out: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
};
const TABS = [
  { href: '/', label: 'Home', d: I.home }, { href: '/calendar', label: 'Calendar', d: I.cal },
  { href: '/timetable', label: 'Timetable', d: I.clock }, { href: '/people', label: 'People', d: I.people },
];
const Icon = ({ d }: { d: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
);

function FilterChip() {
  const { profile, faculties } = useSession();
  const { filter, setFilter, filterIsCustom } = useData();
  const [open, setOpen] = useState(false);
  const fac = faculties.find((f) => f.id === filter.facultyId)?.name ?? 'All faculties';
  const label = `${fac}${filter.level ? `, ${levelLabel(filter.level)}` : ''}`;
  return (
    <>
      <button className="chip max-w-[62vw] truncate" onClick={() => setOpen(true)} aria-label={`Filter: ${label}. Change`}>
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
  const { profile, signOut } = useSession();
  const onboarded = profile?.onboarded;
  const active = (h: string) => (h === '/' ? path === '/' : path.startsWith(h));
  const staff = profile && profile.role !== 'member';
  const side = [...TABS, { href: '/help', label: 'Ask for help', d: I.help },
    ...(profile?.role === 'admin' ? [{ href: '/admin', label: 'Admin', d: I.admin }] : []),
    ...(profile?.role === 'care_liaison' ? [{ href: '/admin/requests', label: 'Help requests', d: I.admin }] : []),
    ...(profile?.role === 'faculty_rep' ? [{ href: '/admin/events', label: 'Post to my faculty', d: I.admin }] : [])];
  void staff;
  return (
    <div className="md:grid md:min-h-dvh md:grid-cols-[264px_1fr]">
      {onboarded && (
        <aside className="sticky top-0 hidden h-dvh flex-col gap-1 p-4 md:flex" style={{ background: 'var(--side)' }}>
          <Link href="/" className="mb-6 flex items-center gap-3 px-1 py-2 text-white" aria-label="GLT Academic Unit home">
            <Logo size={40} /><span className="font-bold leading-tight">GLT Academic<br /><span style={{ color: 'var(--mint)' }}>Unit</span></span>
          </Link>
          <nav aria-label="Main" className="flex flex-col gap-1">
            {side.map((t) => <Link key={t.href} href={t.href} className="sidelink" aria-current={active(t.href) ? 'page' : undefined}><Icon d={t.d} />{t.label}</Link>)}
          </nav>
          <div className="mt-auto space-y-1 border-t border-white/10 pt-3">
            <Link href="/account" className="sidelink !h-auto !py-2" aria-current={path === '/account' ? 'page' : undefined}>
              <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full bg-brand font-bold text-white">{(profile?.full_name || '?').trim().charAt(0).toUpperCase()}</span>
              <span className="min-w-0"><span className="block truncate text-white">{profile?.full_name || 'My account'}</span><span className="block truncate text-xs font-normal opacity-70">{profile?.email}</span></span>
            </Link>
            <button className="sidelink w-full" onClick={signOut}><Icon d={I.out} />Log out</button>
          </div>
        </aside>
      )}
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col md:max-w-3xl">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-line bg-bg/95 px-4 py-2 backdrop-blur md:static md:justify-end md:border-0 md:bg-transparent md:pt-6">
          <Link href="/" className="flex min-h-[44px] min-w-[44px] items-center justify-center md:hidden" aria-label="GLT Academic Unit home"><Logo size={36} /></Link>
          {onboarded && <FilterChip />}
          {onboarded && (
            <span className="md:hidden"><Link href="/account" className="btn !px-3" aria-label="My account">
              <span aria-hidden>{(profile?.full_name || '?').trim().charAt(0).toUpperCase()}</span>
            </Link></span>
          )}
        </header>
        <main className="flex-1 space-y-5 px-4 pb-28 pt-4 md:px-6 md:pb-12">{children}</main>
      </div>
      {onboarded && (
        <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-bg/95 backdrop-blur md:hidden">
          <ul className="mx-auto grid max-w-lg grid-cols-4">
            {TABS.map((t) => (
              <li key={t.href}>
                <Link href={t.href} aria-current={active(t.href) ? 'page' : undefined}
                  className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs font-semibold ${active(t.href) ? 'text-accent' : 'muted'}`}>
                  <Icon d={t.d} />{t.label}
                </Link>
              </li>
            ))}
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

  if (!configured) return <main className="p-6"><h1>Almost ready</h1><p className="muted mt-2">The app is not connected to its database yet. See README.md, step 2.</p></main>;
  if (!ready || !session || !profile) return <Spinner />;
  return <DataProvider><Inner>{children}</Inner></DataProvider>;
}
