import type { EventRow, Profile } from './types';
import { lagosDate } from './time';

export const LEVELS = [100, 200, 300, 400, 500, 600];
export const levelLabel = (l: number | null) => (l == null ? '' : l === 600 ? 'PG' : `${l}L`);
export const KIND_LABEL: Record<string, string> = { church: 'Church', tutorial: 'Tutorial', unit: 'Unit', part2: 'Part 2' };

export type Filter = { facultyId: number | null; level: number | null };
export const filterFromProfile = (p: Profile | null): Filter => ({ facultyId: p?.faculty_id ?? null, level: p?.level ?? null });

/** Whole-church events (no faculty) always show. Others must match faculty and level. */
export function appliesTo(e: EventRow, f: Filter) {
  if (e.faculty_id != null && f.facultyId != null && e.faculty_id !== f.facultyId) return false;
  if (f.level != null && (f.level < e.level_min || f.level > e.level_max)) return false;
  return true;
}
export const isToday = (e: EventRow, now = new Date()) => lagosDate(e.starts_at) === lagosDate(now);
export const upcoming = (events: EventRow[], now = new Date()) =>
  events.filter((e) => new Date(e.ends_at ?? e.starts_at).getTime() >= now.getTime() - 3600_000)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
