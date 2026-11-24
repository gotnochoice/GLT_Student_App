'use client';
import Link from 'next/link';
import { useEffect, useRef, type ReactNode } from 'react';
import { KIND_LABEL } from '@/lib/events';
import { fmtDayTime, fmtTime } from '@/lib/time';
import type { EventRow, Faculty } from '@/lib/types';

export const Spinner = () => <p role="status" className="muted p-6 text-center">Loading…</p>;
export const ErrorNote = ({ children }: { children: ReactNode }) => (
  <p role="alert" className="card text-sm" style={{ color: 'var(--bad)' }}>{children}</p>
);
export const Empty = ({ children }: { children: ReactNode }) => <p className="card muted text-center text-sm">{children}</p>;

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="muted mt-1 block text-xs">{hint}</span>}
    </label>
  );
}

export function Logo({ size = 40 }: { size?: number }) {
  // Placeholder until the owner supplies the GLT logo file.
  return (
    <span aria-hidden className="display inline-flex items-center justify-center rounded-xl bg-brand text-white"
      style={{ width: size, height: size, fontSize: size * 0.4 }}>GLT</span>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey); ref.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className="mx-auto max-h-[85vh] w-full max-w-lg overflow-auto rounded-t-3xl bg-bg p-5 outline-none">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl">{title}</h2>
          <button className="btn" onClick={onClose}>Done</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const KIND_STYLE: Record<string, string> = { church: 'pill', tutorial: 'pill pill-gold', unit: 'pill', part2: 'pill' };

export function EventCard({ e, faculties, going, status, count }: {
  e: EventRow; faculties: Faculty[]; going?: boolean; status?: string; count?: number;
}) {
  const fac = e.faculty_id != null ? faculties.find((f) => f.id === e.faculty_id)?.name : null;
  return (
    <Link href={`/events/${e.id}`} className="card block min-h-[44px]">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className={KIND_STYLE[e.kind]}>{KIND_LABEL[e.kind]}</span>
        {fac && <span className="muted text-xs">{fac}</span>}
        {status === 'waiting' && <span className="pill pill-warn">Waiting list</span>}
        {going && status !== 'waiting' && <span className="pill">{status === 'attended' ? 'Attended' : "You're going"}</span>}
      </div>
      <p className="font-semibold">{e.title}</p>
      <p className="muted text-sm">{fmtDayTime(e.starts_at)}{e.ends_at ? ` – ${fmtTime(e.ends_at)}` : ''}</p>
      {(e.venue || e.online_link) && <p className="muted text-sm">{e.venue ?? 'Online'}</p>}
      {e.capacity != null && count != null && <p className="muted text-xs">{count} of {e.capacity} places taken</p>}
    </Link>
  );
}
