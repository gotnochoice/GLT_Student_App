'use client';
import { useState } from 'react';
import { Gate } from '@/components/Gate';
import { useData } from '@/lib/data';
import { useSession } from '@/lib/session';
import { buildDigest } from '@/lib/digest';
import { addDays, lagosDate } from '@/lib/time';

export default function Digest() {
  const { events } = useData();
  const { faculties } = useSession();
  const [copied, setCopied] = useState(false);
  const end = addDays(lagosDate(new Date()), 8);
  const text = buildDigest(events.filter((e) => lagosDate(e.starts_at) >= lagosDate(new Date()) && lagosDate(e.starts_at) < end), faculties);
  async function copy() { try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setCopied(false); } }
  return (
    <Gate roles={['admin']} title="Weekly digest">
      <p className="muted text-sm">Next 7 days. Copy it and paste it into the unit&apos;s WhatsApp broadcast.</p>
      <textarea className="input font-mono text-sm" readOnly rows={14} value={text} aria-label="Digest text" />
      <button className="btn btn-primary w-full" onClick={copy}>{copied ? 'Copied ✓' : 'Copy text'}</button>
    </Gate>
  );
}
