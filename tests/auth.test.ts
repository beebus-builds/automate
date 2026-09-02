import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, generateSessionToken } from '../lib/auth';

describe('password hashing', () => {
  it('round-trips a valid password', () => {
    const stored = hashPassword('correct horse battery staple');
    expect(stored.split(':')).toHaveLength(3);
    expect(verifyPassword('correct horse battery staple', stored)).toBe(true);
  });

  it('rejects a wrong password', () => {
    const stored = hashPassword('password-one');
    expect(verifyPassword('password-two', stored)).toBe(false);
  });

  it('produces unique salts (different hashes per call)', () => {
    const a = hashPassword('same');
    const b = hashPassword('same');
    expect(a).not.toBe(b);
  });

  it('supports the legacy 2-part format', () => {
    // legacy format: salt:hash with fixed 10000 iterations
    const crypto = require('crypto');
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync('legacy-pass', salt, 10000, 64, 'sha512').toString('hex');
    expect(verifyPassword('legacy-pass', `${salt}:${hash}`)).toBe(true);
  });

  it('rejects malformed stored hashes', () => {
    expect(verifyPassword('x', 'garbage')).toBe(false);
    expect(verifyPassword('x', 'a:b:c:d')).toBe(false);
    expect(verifyPassword('x', '')).toBe(false);
  });
});

describe('session tokens', () => {
  it('generates unique 96-char hex tokens', () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).toMatch(/^[0-9a-f]{96}$/);
    expect(a).not.toBe(b);
  });
});