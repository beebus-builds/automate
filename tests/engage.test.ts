import { describe, it, expect } from 'vitest';
import {
  sanitizeSlots, timesForWeekday, validateBooking, isValidDate, isValidTime,
} from '../lib/bookings';
import { slugify, excerpt, readingMinutes, sanitizePostInput } from '../lib/blog';
import { renderSection, newBlock, makeId } from '../lib/sections';
import { bookingToIcs } from '../lib/bookings';
import { validateDocument } from '../lib/security';

describe('sanitizeSlots', () => {
  it('accepts a valid weekly schedule', () => {
    const r = sanitizeSlots([
      { weekday: 1, start: '15:00', end: '17:00' },
      { weekday: 3, start: '09:00', end: '12:00' },
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.slots).toHaveLength(2);
  });

  it('rejects bad weekdays, times and inverted ranges', () => {
    expect(sanitizeSlots([{ weekday: 7, start: '09:00', end: '10:00' }]).ok).toBe(false);
    expect(sanitizeSlots([{ weekday: 1, start: '9am', end: '10:00' }]).ok).toBe(false);
    expect(sanitizeSlots([{ weekday: 1, start: '10:00', end: '09:00' }]).ok).toBe(false);
    expect(sanitizeSlots('nope').ok).toBe(false);
    expect(sanitizeSlots(Array.from({ length: 29 }, () => ({ weekday: 1, start: '09:00', end: '10:00' }))).ok).toBe(false);
  });
});

describe('timesForWeekday', () => {
  it('expands slots into 30-minute starts', () => {
    const times = timesForWeekday([{ weekday: 1, start: '15:00', end: '16:00' }], 1);
    expect(times).toEqual(['15:00', '15:30']);
    expect(timesForWeekday([{ weekday: 1, start: '15:00', end: '16:00' }], 2)).toEqual([]);
  });
});

describe('validateBooking', () => {
  const slots = [{ weekday: 1, start: '15:00', end: '17:00' }];
  // 2026-09-07 is a Monday
  it('accepts a free slot in the future', () => {
    expect(validateBooking(slots, [], '2026-09-07', '15:30', new Date('2026-09-01T00:00:00Z')).ok).toBe(true);
  });

  it('rejects outside-hours, past, and double-booked times', () => {
    const now = new Date('2026-09-01T00:00:00Z');
    expect(validateBooking(slots, [], '2026-09-07', '14:30', now).ok).toBe(false);
    expect(validateBooking(slots, [], '2026-09-08', '15:30', now).ok).toBe(false); // Tuesday
    expect(validateBooking(slots, [], '2020-01-06', '15:30', now).ok).toBe(false);
    expect(validateBooking(slots, [{ date: '2026-09-07', time: '15:30' }], '2026-09-07', '15:30', now).ok).toBe(false);
    expect(validateBooking(slots, [], 'not-a-date', '15:30', now).ok).toBe(false);
  });
});

describe('date/time guards', () => {
  it('validates calendar dates strictly', () => {
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('2026-09-07')).toBe(true);
    expect(isValidTime('24:00')).toBe(false);
    expect(isValidTime('09:30')).toBe(true);
  });
});

describe('slugify', () => {
  it('makes URL-safe slugs', () => {
    expect(slugify('My First Classroom Story!')).toBe('my-first-classroom-story');
    expect(slugify('  Gamification & AI  ')).toBe('gamification-ai');
    expect(slugify('')).toBe('post');
  });
});

describe('excerpt + readingMinutes', () => {
  it('strips tags and truncates at word boundaries', () => {
    expect(excerpt('<p>Hello <b>world</b> this is a test of the excerpt function</p>', 20)).toBe('Hello world this is…');
    expect(excerpt('short', 160)).toBe('short');
  });

  it('estimates minutes at 200wpm, minimum 1', () => {
    expect(readingMinutes('one two')).toBe(1);
    expect(readingMinutes(Array(400).fill('word').join(' '))).toBe(2);
  });
});

describe('booking block render', () => {
  it('emits a booking form with a build-time teacher placeholder', () => {
    const sec = {
      id: makeId('sec'), title: 'Meet me', badge: '', subtitle: '', showHeader: true,
      layout: 'stack' as const, bg: '#111827', bgStyle: 'alt' as const, pattern: 'dots',
      padding: 'normal' as const, radius: 'rounded' as const, align: 'left' as const,
      maxWidth: 'normal' as const, blocks: [newBlock('booking')],
    };
    const html = renderSection(sec);
    expect(html).toContain('data-booking-form');
    expect(html).toContain('{{TEACHER_ID}}');
    expect(html).toContain('type="date"');
  });

  it('emits scoped custom CSS without leaking across sections', () => {
    const sec = {
      id: 'sec-abc', title: 'T', badge: '', subtitle: '', showHeader: false,
      layout: 'stack' as const, bg: '', bgStyle: 'plain' as const, pattern: 'dots',
      padding: 'normal' as const, radius: 'rounded' as const, align: 'left' as const,
      maxWidth: 'normal' as const, customCss: 'h2 { color: red; }',
      blocks: [newBlock('text', { text: 'hi' })],
    };
    const html = renderSection(sec);
    expect(html).toContain('.csx-sec-abc h2');
  });
});

describe('new widgets render', () => {
  const wrap = (type: any, patch: any = {}) => ({
    id: 'sec-w', title: 'W', badge: '', subtitle: '', showHeader: false,
    layout: 'stack' as const, bg: '', bgStyle: 'plain' as const, pattern: 'dots',
    padding: 'normal' as const, radius: 'rounded' as const, align: 'left' as const,
    maxWidth: 'normal' as const, blocks: [{ ...newBlock(type), ...patch }],
  });

  it('embeds YouTube, Vimeo and direct video', () => {
    expect(renderSection(wrap('video', { src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }))).toContain('youtube.com/embed/dQw4w9WgXcQ');
    expect(renderSection(wrap('video', { src: 'https://youtu.be/dQw4w9WgXcQ' }))).toContain('youtube.com/embed/');
    expect(renderSection(wrap('video', { src: 'https://vimeo.com/123456' }))).toContain('player.vimeo.com/video/123456');
    expect(renderSection(wrap('video', { src: 'https://cdn.x.com/v.mp4' }))).toContain('<video');
    expect(renderSection(wrap('video', { src: '' }))).toContain('Paste a YouTube');
  });

  it('renders FAQ pairs, tables, countdowns, maps, files and review forms', () => {
    const faq = renderSection(wrap('faq', { items: ['Q1 ||| A1', 'Q2'] }));
    expect(faq).toContain('<details');
    expect(faq).toContain('Q1');
    expect(faq).toContain('A1');
    const table = renderSection(wrap('table', { items: ['Day | Time', 'Mon | 9:00'] }));
    expect(table).toContain('<table');
    expect(table).toContain('<th');
    expect(table).toContain('Mon');
    const future = new Date(Date.now() + 86400000).toISOString();
    const cd = renderSection(wrap('countdown', { datetime: future }));
    expect(cd).toContain('data-countdown=');
    expect(cd).toContain('data-cd="d"');
    expect(renderSection(wrap('countdown', { datetime: '' }))).toContain('Set a target date');
    const map = renderSection(wrap('map', { src: 'Springfield School' }));
    expect(map).toContain('google.com/maps?q=Springfield%20School');
    const file = renderSection(wrap('file', { title: 'Syllabus', src: '/uploads/a.pdf' }));
    expect(file).toContain('download');
    expect(file).toContain('Syllabus');
    const review = renderSection(wrap('review-form', {}));
    expect(review).toContain('data-review-form');
    expect(review).toContain('{{TEACHER_ID}}');
  });

  it('escapes cell content in tables', () => {
    const html = renderSection(wrap('table', { items: ['H', '<script>alert(1)</script>'] }));
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('bookingToIcs', () => {
  it('emits a valid VCALENDAR with 30-minute duration', () => {
    const ics = bookingToIcs(
      { date: '2026-09-07', time: '15:30', name: 'Ann Lee', email: 'ann@x.com', note: 'Algebra help' },
      'Jane Doe'
    );
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('DTSTART:20260907T153000');
    expect(ics).toContain('DTEND:20260907T160000');
    expect(ics).toContain('Ann Lee');
    expect(ics).toContain('END:VCALENDAR');
  });
});

describe('validateDocument', () => {
  it('accepts real PDFs and rejects the rest', () => {
    const pdf = Buffer.concat([Buffer.from('%PDF-1.4 fake content here'), Buffer.alloc(100)]);
    expect(validateDocument(pdf, 'syllabus.pdf')).toEqual({ ext: 'pdf' });
    expect(validateDocument(Buffer.from('not a pdf'), 'notes.pdf')).toBeNull();
    expect(validateDocument(pdf, 'syllabus.exe')).toBeNull();
    expect(validateDocument(Buffer.alloc(0), 'empty.pdf')).toBeNull();
  });
});

describe('sanitizePostInput', () => {
  it('accepts a valid post and derives the slug', () => {
    const r = sanitizePostInput({ title: 'Hello World', body: 'Hi', cover: '', published: true });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.post.slug).toBe('hello-world');
      expect(r.post.published).toBe(1);
    }
  });

  it('rejects missing titles and bad covers', () => {
    expect(sanitizePostInput({ title: '', body: 'x' }).ok).toBe(false);
    expect(sanitizePostInput(null).ok).toBe(false);
    expect(sanitizePostInput({ title: 'T', cover: 'javascript:alert(1)' }).ok).toBe(false);
  });
});
