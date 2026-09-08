import { describe, it, expect } from 'vitest';
import { slugifyTeacherName, teacherDisplayName } from '../lib/slug';
import { escHtml, newBlock } from '../lib/sections';
import { slugify, truncateWords, deepMerge, reorderArray, isValidEmail } from '../lib/algorithms';

describe('slug helpers', () => {
  it('slugifies accented names for project domains', () => {
    expect(slugifyTeacherName('José María O’Brien')).toBe('jose-maria-o-brien');
    expect(slugifyTeacherName('')).toBe('teacher-site');
    expect(slugifyTeacherName('A'.repeat(100))).toHaveLength(40);
  });

  it('prefers the teacher display name with fallbacks', () => {
    expect(teacherDisplayName({ site: { title: 'Site' }, hero: { title: 'Hero' } })).toBe('Site');
    expect(teacherDisplayName({ hero: { title: 'Hero' } })).toBe('Hero');
    expect(teacherDisplayName({}, 'Fallback')).toBe('Fallback');
    expect(teacherDisplayName({})).toBe('Teacher');
  });
});

describe('section helpers', () => {
  it('escapes HTML for safe render', () => {
    expect(escHtml('<b>O’Brien & "co"</b>')).toBe('&lt;b&gt;O’Brien &amp; &quot;co&quot;&lt;/b&gt;');
    expect(escHtml("it's")).toBe('it&#39;s');
  });

  it('creates blocks with ids', () => {
    const a = newBlock('text');
    const b = newBlock('text');
    expect(a.id).toBeTruthy();
    expect(b.id).toBeTruthy();
    expect(a.id).not.toBe(b.id);
  });
});

describe('algorithm helpers', () => {
  it('slugifies and truncates text', () => {
    expect(slugify('Hello World!')).toBe('hello-world');
    expect(truncateWords('a b c d e', 3)).toBe('a b c...');
  });

  it('deep merges section updates', () => {
    const out = deepMerge({ a: 1, nested: { x: 1, y: 2 } }, { nested: { y: 9 } });
    expect(out).toEqual({ a: 1, nested: { x: 1, y: 9 } });
  });

  it('reorders arrays for drag-sort', () => {
    expect(reorderArray(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });

  it('validates emails', () => {
    expect(isValidEmail('teacher@school.edu')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
  });
});
