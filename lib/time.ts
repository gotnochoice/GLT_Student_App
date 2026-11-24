// All times are stored in UTC. Lagos is UTC+1 all year (no daylight saving),
// so a fixed offset is exact and needs no library.
export const TZ = 'Africa/Lagos';
const HOUR = 3600_000;
const DAY = 24 * HOUR;

/** A Date shifted so its getUTC* fields read as Lagos wall-clock time. */
const shifted = (d: Date | string) => new Date(new Date(d).getTime() + HOUR);
const p2 = (n: number) => String(n).padStart(2, '0');

export const lagosDate = (d: Date | string) => shifted(d).toISOString().slice(0, 10); // YYYY-MM-DD
export const lagosMinutes = (d: Date | string) => { const s = shifted(d); return s.getUTCHours() * 60 + s.getUTCMinutes(); };
/** 1 = Monday ... 7 = Sunday */
export const lagosDow = (d: Date | string) => ((shifted(d).getUTCDay() + 6) % 7) + 1;

/** "2026-11-28T10:00" typed in Lagos time -> UTC ISO string. */
export const lagosInputToIso = (v: string) => new Date(`${v}:00+01:00`).toISOString();
/** UTC ISO -> "2026-11-28T10:00" for a datetime-local input, in Lagos time. */
export const isoToLagosInput = (iso: string) => shifted(iso).toISOString().slice(0, 16);

/** Monday of the week (Lagos) containing d, as YYYY-MM-DD. */
export function weekStart(d: Date | string = new Date()) {
  const s = shifted(d);
  const back = (s.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate() - back)).toISOString().slice(0, 10);
}
export const addDays = (ymd: string, n: number) => new Date(Date.parse(ymd + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10);

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-NG', { timeZone: TZ, ...o });
export const fmtDay = (d: Date | string) => fmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(d));
export const fmtTime = (d: Date | string) => fmt({ hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(d));
export const fmtDayTime = (d: Date | string) => `${fmtDay(d)}, ${fmtTime(d)}`;
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const hhmm = (t: string) => t.slice(0, 5);
export const toMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const fmtClock = (t: string) => { const m = toMinutes(t); const h = Math.floor(m / 60); return `${((h + 11) % 12) + 1}:${p2(m % 60)} ${h < 12 ? 'am' : 'pm'}`; };

/** Start of the Lagos day (as UTC ISO) n days from today. */
export function lagosDayStartIso(n = 0, now: Date = new Date()) {
  return new Date(Date.parse(addDays(lagosDate(now), n) + 'T00:00:00+01:00')).toISOString();
}
