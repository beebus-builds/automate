import { describe, it, expect } from 'vitest';
import { sanitizeExtraction } from '../lib/extract';
import { extractRequestSchema } from '../lib/validation';

describe('sanitizeExtraction', () => {
  it('keeps clean fields and normalizes whitespace', () => {
    const out = sanitizeExtraction(
      { name: '  Sarah   Chen ', subject: 'Mathematics', years: '12 years' },
      {}
    );
    expect(out).toEqual({ name: 'Sarah Chen', subject: 'Mathematics', years: '12' });
  });

  it('ignores non-object model output', () => {
    expect(sanitizeExtraction(null, {})).toEqual({});
    expect(sanitizeExtraction('nope', {})).toEqual({});
    expect(sanitizeExtraction(['a'], {})).toEqual({});
  });

  it('drops values identical to what is already collected', () => {
    const out = sanitizeExtraction(
      { name: 'sarah chen', subject: 'Physics' },
      { name: 'Sarah Chen', subject: 'Mathematics' }
    );
    expect(out).toEqual({ subject: 'Physics' });
  });

  it('lets a genuine correction through', () => {
    const out = sanitizeExtraction({ years: '15' }, { years: '12' });
    expect(out.years).toBe('15');
  });

  it('rejects implausible or unparseable years', () => {
    expect(sanitizeExtraction({ years: '0' }, {}).years).toBeUndefined();
    expect(sanitizeExtraction({ years: '400' }, {}).years).toBeUndefined();
    expect(sanitizeExtraction({ years: 'a while' }, {}).years).toBeUndefined();
  });

  it('accepts only well-formed emails, lowercased', () => {
    expect(sanitizeExtraction({ email: 'S.Chen@School.EDU' }, {}).email).toBe('s.chen@school.edu');
    expect(sanitizeExtraction({ email: 'not an email' }, {}).email).toBeUndefined();
  });

  it('merges courses without duplicating existing ones', () => {
    const out = sanitizeExtraction(
      { courses: ['algebra ii', 'AP Calculus', '  ', 'AP Calculus'] },
      { courses: ['Algebra II'] }
    );
    expect(out.courses).toEqual(['AP Calculus']);
  });

  it('caps runaway field lengths', () => {
    const out = sanitizeExtraction({ bio: 'x'.repeat(5000), name: 'y'.repeat(500) }, {});
    expect(out.bio!.length).toBe(1200);
    expect(out.name!.length).toBe(80);
  });

  it('ignores fields outside the allowed set', () => {
    const out = sanitizeExtraction({ theme: 'dark', photo: 'http://x/y.png' } as never, {});
    expect(out).toEqual({});
  });
});

describe('extractRequestSchema', () => {
  it('requires a non-empty, bounded message', () => {
    expect(extractRequestSchema.safeParse({ message: '' }).success).toBe(false);
    expect(extractRequestSchema.safeParse({ message: 'x'.repeat(2001) }).success).toBe(false);
    const ok = extractRequestSchema.safeParse({ message: 'I teach Biology' });
    expect(ok.success && ok.data.current).toEqual({});
  });
});
