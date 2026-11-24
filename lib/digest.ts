import type { EventRow, Faculty } from './types';
import { fmtDay, fmtTime, lagosDate } from './time';

/** Ready-to-paste WhatsApp text for the unit secretary. */
export function buildDigest(events: EventRow[], faculties: Faculty[]) {
  const fac = new Map(faculties.map((f) => [f.id, f.name]));
  const sorted = [...events].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const out = ['*This week at GLT Academic Unit*', ''];
  if (!sorted.length) out.push('No events yet. Check the app for updates.');
  let day = '';
  for (const e of sorted) {
    const d = lagosDate(e.starts_at);
    if (d !== day) { day = d; out.push(`*${fmtDay(e.starts_at)}*`); }
    const where = e.venue ? ` at ${e.venue}` : e.online_link ? ' (online)' : '';
    const who = e.faculty_id != null ? ` [${fac.get(e.faculty_id) ?? 'Faculty'}]` : '';
    out.push(`• ${fmtTime(e.starts_at)}: ${e.title}${where}${who}`);
  }
  out.push('', 'Sign up and set your reminders in the app.');
  return out.join('\n');
}
