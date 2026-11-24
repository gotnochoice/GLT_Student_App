import type { EventRow } from './types';

const stamp = (d: Date | string) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\;');
// RFC 5545: long lines are folded with CRLF + space.
const fold = (l: string): string => {
  const parts: string[] = [];
  for (let i = 0; i < l.length; i += 74) parts.push(l.slice(i, i + 74));
  return parts.join('\r\n ');
};

export function buildIcs(e: EventRow, now = new Date()) {
  const end = e.ends_at ?? new Date(new Date(e.starts_at).getTime() + 3600_000).toISOString();
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GLT Academic Unit//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${e.id}@glt-academic-unit`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(e.starts_at)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(e.title)}`,
    ...(e.venue ? [`LOCATION:${esc(e.venue)}`] : []),
    ...(e.description || e.online_link ? [`DESCRIPTION:${esc([e.description, e.online_link].filter(Boolean).join('\n'))}`] : []),
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.title)}`, 'TRIGGER:-PT1H', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function downloadIcs(e: EventRow) {
  const url = URL.createObjectURL(new Blob([buildIcs(e)], { type: 'text/calendar' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `${e.title.replace(/[^\w]+/g, '-')}.ics` });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
