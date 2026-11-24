import { lagosDate, lagosDow, lagosMinutes, toMinutes } from './time';
import type { EventRow, Slot } from './types';

export type Block = { id: string; label: string; dow: number; date?: string; start: number; end: number };

export const slotBlock = (s: Slot): Block => ({
  id: s.id, label: s.course, dow: s.day_of_week, start: toMinutes(s.start_time), end: toMinutes(s.end_time),
});

export function eventBlock(e: EventRow): Block {
  const start = lagosMinutes(e.starts_at);
  let end = e.ends_at ? lagosMinutes(e.ends_at) : start + 60;
  if (e.ends_at && lagosDate(e.ends_at) !== lagosDate(e.starts_at)) end = 1440;
  if (end <= start) end = Math.min(start + 60, 1440);
  return { id: e.id, label: e.title, dow: lagosDow(e.starts_at), date: lagosDate(e.starts_at), start, end };
}

/** Two blocks clash when they share a day and their times overlap.
 *  A weekly class (no date) clashes with a dated event on the same weekday. */
export function clashes(a: Block, b: Block) {
  if (a.id === b.id) return false;
  const sameDay = a.date && b.date ? a.date === b.date : a.dow === b.dow;
  return sameDay && a.start < b.end && b.start < a.end;
}
export const findClashes = (candidate: Block, others: Block[]) => others.filter((o) => clashes(candidate, o));
