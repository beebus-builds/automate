/** Pure booking validation + slot math (unit-tested, no I/O). */

export interface SlotInput {
  weekday: number;
  start: string;
  end: string;
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function isValidTime(t: unknown): t is string {
  return typeof t === 'string' && TIME_RE.test(t);
}

export function isValidDate(d: unknown): d is string {
  if (typeof d !== 'string' || !DATE_RE.test(d)) return false;
  const [y, m, day] = d.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, day));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === day;
}

export function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function sanitizeSlots(raw: unknown): { ok: true; slots: SlotInput[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: 'Slots must be an array.' };
  if (raw.length > 28) return { ok: false, error: 'Too many slots (max 28).' };
  const out: SlotInput[] = [];
  for (const s of raw) {
    if (!s || typeof s !== 'object') return { ok: false, error: 'Invalid slot entry.' };
    const { weekday, start, end } = s as Record<string, unknown>;
    if (!Number.isInteger(weekday) || (weekday as number) < 0 || (weekday as number) > 6) {
      return { ok: false, error: 'Weekday must be 0 (Sun) – 6 (Sat).' };
    }
    if (!isValidTime(start) || !isValidTime(end)) return { ok: false, error: 'Times must be HH:MM (24h).' };
    if (toMinutes(start as string) >= toMinutes(end as string)) return { ok: false, error: 'Slot start must be before end.' };
    out.push({ weekday: weekday as number, start: start as string, end: end as string });
  }
  return { ok: true, slots: out };
}

export const BOOKING_MINUTES = 30;

function icsStamp(date: string, time: string): string {
  return `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;
}

function icsEscape(s: string): string {
  return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n').slice(0, 500);
}

/** Build a downloadable .ics calendar file for a confirmed booking. */
export function bookingToIcs(b: { date: string; time: string; name: string; email: string; note?: string }, teacherName: string): string {
  const start = icsStamp(b.date, b.time);
  const [h, m] = b.time.split(':').map(Number);
  const endMin = h * 60 + m + BOOKING_MINUTES;
  const end = `${b.date.replace(/-/g, '')}T${String(Math.floor(endMin / 60)).padStart(2, '0')}${String(endMin % 60).padStart(2, '0')}00`;
  const uid = `booking-${b.date}-${b.time}-${Math.abs(hashStr(b.email + b.date + b.time))}@teacherfolio`;
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TeacherFolio//Bookings//EN', 'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${icsEscape(`Meeting: ${teacherName} × ${b.name}`)}`,
    `DESCRIPTION:${icsEscape(`With: ${b.name} <${b.email}>${b.note ? `\nNote: ${b.note}` : ''}`)}`,
    'STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i);
  }
  return h;
}

/** All bookable start times for a weekday given the teacher's slots. */
export function timesForWeekday(slots: SlotInput[], weekday: number): string[] {
  const times: string[] = [];
  for (const s of slots) {
    if (s.weekday !== weekday) continue;
    let t = toMinutes(s.start);
    const end = toMinutes(s.end);
    while (t + BOOKING_MINUTES <= end) {
      const hh = String(Math.floor(t / 60)).padStart(2, '0');
      const mm = String(t % 60).padStart(2, '0');
      times.push(`${hh}:${mm}`);
      t += BOOKING_MINUTES;
    }
  }
  return [...new Set(times)].sort();
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Validate a booking request against slots + existing bookings.
 * existing: bookings with {date, time} (pending + confirmed only).
 */
export function validateBooking(
  slots: SlotInput[],
  existing: { date: string; time: string }[],
  date: string,
  time: string,
  now = new Date()
): { ok: true } | { ok: false; error: string } {
  if (!isValidDate(date)) return { ok: false, error: 'Invalid date.' };
  if (!isValidTime(time)) return { ok: false, error: 'Invalid time.' };
  const day = new Date(`${date}T${time}:00Z`).getTime();
  if (!Number.isFinite(day) || day < now.getTime() - 60_000) {
    return { ok: false, error: 'That time is in the past.' };
  }
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const allowed = timesForWeekday(slots, weekday);
  if (!allowed.includes(time)) return { ok: false, error: 'Outside office hours.' };
  const start = toMinutes(time);
  const end = start + BOOKING_MINUTES;
  for (const b of existing) {
    if (b.date !== date || !isValidTime(b.time)) continue;
    const bs = toMinutes(b.time);
    if (overlaps(start, end, bs, bs + BOOKING_MINUTES)) {
      return { ok: false, error: 'That slot is already taken.' };
    }
  }
  return { ok: true };
}
