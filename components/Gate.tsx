'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useSession } from '@/lib/session';
import type { Role } from '@/lib/types';

export function Gate({ roles, title, children }: { roles: Role[]; title: string; children: ReactNode }) {
  const { profile } = useSession();
  if (!profile || !roles.includes(profile.role)) return <p className="card">You do not have access to this page.</p>;
  return (
    <>
      <Link href="/account" className="muted inline-flex min-h-[44px] items-center text-sm underline">← My account</Link>
      <h1>{title}</h1>
      {children}
    </>
  );
}
