import { describe, expect, it } from 'vitest';
import { eventBlock, findClashes, slotBlock } from '../lib/clash';
import { buildDigest } from '../lib/digest';
import { appliesTo } from '../lib/events';
import { buildIcs } from '../lib/ics';
import { addDays, isoToLagosInput, lagosDate, lagosDow, lagosInputToIso, weekStart } from '../lib/time';
import { waLink } from '../lib/whatsapp';
import type { EventRow, Slot } from '../lib/types';

const ev = (o: Partial<EventRow>): EventRow => ({
  id: 'e1', title: 'Calculus', description: null, kind: 'tutorial', starts_at: '2026-11-28T09:00:00Z',
  ends_at: '2026-11-28T11:00:00Z', venue: 'LT1', online_link: null, faculty_id: 13, level_min: 100,
  level_max: 300, capacity: null, tutor_id: null, created_by: null, ...o,
});
const slot = (o: Partial<Slot>): Slot => ({ id: 's1', user_id: 'u', course: 'MTH 201', day_of_week: 6, start_time: '10:00', end_time: '12:00', venue: null, ...o });

describe('Lagos time', () => {
  it('shifts UTC to Lagos (UTC+1)', () => {
    expect(isoToLagosInput('2026-11-28T09:00:00Z')).toBe('2026-11-28T10:00');
    expect(lagosInputToIso('2026-11-28T10:00')).toBe('2026-11-28T09:00:00.000Z');
  });
  it('rolls the date over at midnight Lagos', () => {
    expect(lagosDate('2026-11-28T23:30:00Z')).toBe('2026-11-29');
  });
  it('28 Nov 2026 is a Saturday', () => { expect(lagosDow('2026-11-28T09:00:00Z')).toBe(6); });
  it('week starts on Monday', () => {
    expect(weekStart('2026-11-28T09:00:00Z')).toBe('2026-11-23');
    expect(weekStart('2026-11-29T23:30:00Z')).toBe('2026-11-30'); // 00:30 Monday in Lagos
    expect(addDays('2026-11-23', 7)).toBe('2026-11-30');
  });
});

describe('clash detection', () => {
  it('flags a class overlapping a Saturday tutorial (10:00-12:00 Lagos)', () => {
    expect(findClashes(slotBlock(slot({ start_time: '11:00', end_time: '13:00' })), [eventBlock(ev({}))])).toHaveLength(1);
  });
  it('does not flag back-to-back or different days', () => {
    expect(findClashes(slotBlock(slot({ start_time: '12:00', end_time: '13:00' })), [eventBlock(ev({}))])).toHaveLength(0);
    expect(findClashes(slotBlock(slot({ day_of_week: 2 })), [eventBlock(ev({}))])).toHaveLength(0);
  });
  it('flags two overlapping classes', () => {
    const a = slotBlock(slot({ id: 'a' })), b = slotBlock(slot({ id: 'b', start_time: '09:00', end_time: '10:30' }));
    expect(findClashes(a, [b])).toHaveLength(1);
  });
  it('two events clash only on the same date', () => {
    const next = ev({ id: 'e2', starts_at: '2026-12-05T09:00:00Z', ends_at: '2026-12-05T11:00:00Z' });
    expect(findClashes(eventBlock(ev({})), [eventBlock(next)])).toHaveLength(0);
  });
});

describe('filters', () => {
  it('whole-church events apply to everyone', () => {
    expect(appliesTo(ev({ faculty_id: null, level_min: 100, level_max: 600 }), { facultyId: 5, level: 200 })).toBe(true);
  });
  it('faculty and level must match otherwise', () => {
    expect(appliesTo(ev({}), { facultyId: 13, level: 200 })).toBe(true);
    expect(appliesTo(ev({}), { facultyId: 11, level: 200 })).toBe(false);
    expect(appliesTo(ev({}), { facultyId: 13, level: 400 })).toBe(false);
    expect(appliesTo(ev({}), { facultyId: null, level: null })).toBe(true);
  });
});

describe('ics, whatsapp, digest', () => {
  it('builds a valid calendar file', () => {
    const s = buildIcs(ev({ title: 'Calculus, week 3' }), new Date('2026-11-24T00:00:00Z'));
    expect(s).toContain('DTSTART:20261128T090000Z');
    expect(s).toContain('SUMMARY:Calculus\\, week 3');
    expect(s.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(s.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });
  it('makes wa.me links from Nigerian numbers', () => {
    expect(waLink('0803 111 2222')).toBe('https://wa.me/2348031112222');
    expect(waLink('+234 803 111 2222')).toBe('https://wa.me/2348031112222');
    expect(waLink('8031112222')).toBe('https://wa.me/2348031112222');
    expect(waLink('')).toBeNull();
    expect(waLink('123')).toBeNull();
  });
  it('writes a digest', () => {
    const d = buildDigest([ev({})], [{ id: 13, name: 'Technology', sort: 13 }]);
    expect(d).toContain('*This week at GLT Academic Unit*');
    expect(d).toContain('10:00 am: Calculus at LT1 [Technology]');
  });
});
