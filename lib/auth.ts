import crypto from 'crypto';
import { cookies } from 'next/headers';
import { pool } from './db';

// Hash password securely with PBKDF2
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, originalHash] = storedHash.split(':');
  if (!salt || !originalHash) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createSession(userId: number): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await pool.query(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)',
    [token, userId, expiresAt]
  );

  const cookieStore = await cookies();
  cookieStore.set('tf_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });

  return token;
}

export async function getSessionUser(): Promise<any | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('tf_session')?.value;
    if (!token) return null;

    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.name, u.vercel_token, u.created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );

    return rows.length > 0 ? rows[0] : null;
  } catch (err) {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('tf_session')?.value;
    if (token) {
      await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
    }
    cookieStore.delete('tf_session');
  } catch (err) {
    // Ignore error on clearing
  }
}
