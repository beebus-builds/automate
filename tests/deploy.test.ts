import { describe, it, expect } from 'vitest';
import { slugifyTeacherName, teacherDisplayName } from '../lib/slug';

describe('slugifyTeacherName', () => {
  it('slugifies a plain name', () => {
    expect(slugifyTeacherName('Sarah Johnson')).toBe('sarah-johnson');
  });

  it('strips accents, punctuation and extra spacing', () => {
    expect(slugifyTeacherName('  José María  López!! ')).toBe('jose-maria-lopez');
    expect(slugifyTeacherName("Anne-Marie O'Brien")).toBe('anne-marie-o-brien');
    expect(slugifyTeacherName('Dr. A. P. J. Kalam')).toBe('dr-a-p-j-kalam');
  });

  it('falls back for empty input', () => {
    expect(slugifyTeacherName('')).toBe('teacher-site');
    expect(slugifyTeacherName(undefined)).toBe('teacher-site');
    expect(slugifyTeacherName('---')).toBe('teacher-site');
  });

  it('caps length so id suffixes stay within limits', () => {
    expect(slugifyTeacherName('A'.repeat(100))).toBe('a'.repeat(40));
  });

  it('never emits invalid Vercel project characters', () => {
    const names = ['Sarah Johnson', 'Ünïcodé Naam 123', '  --x--  ', 'a/b\\c:d'];
    for (const n of names) {
      expect(slugifyTeacherName(n)).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$|^(teacher-site)$/);
    }
  });
});

describe('teacherDisplayName', () => {
  it('prefers site.title, then hero.title, then initials', () => {
    expect(teacherDisplayName({ site: { title: 'Ms Smith' }, hero: { title: 'H', initials: 'S' } })).toBe('Ms Smith');
    expect(teacherDisplayName({ hero: { title: 'H', initials: 'S' } })).toBe('H');
    expect(teacherDisplayName({ hero: { initials: 'S' } })).toBe('S');
    expect(teacherDisplayName({})).toBe('Teacher');
  });
});
