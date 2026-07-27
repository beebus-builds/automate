import crypto from 'crypto';
import { cookies } from 'next/headers';
import { pool } from './db';

const PBKDF2_ITERATIONS = 210000;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 64, 'sha512').toString('hex');
  return `${PBKDF2_ITERATIONS}:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  let iterations: number, salt: string, originalHash: string;

  if (parts.length === 3) {
    iterations = parseInt(parts[0], 10);
    salt = parts[1];
    originalHash = parts[2];
  } else if (parts.length === 2) {
    iterations = 10000;
    salt = parts[0];
    originalHash = parts[1];
  } else {
    return false;
  }

  if (!salt || !originalHash || isNaN(iterations)) return false;
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

export function generateSessionToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

export async function createSession(userId: number): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await pool.query(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)',
    [token, userId, expiresAt]
  );

  const cookieStore = await cookies();
  cookieStore.set('tf_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
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
  }
}

export async function rotateSession(userId: number): Promise<string> {
  try {
    const cookieStore = await cookies();
    const oldToken = cookieStore.get('tf_session')?.value;
    if (oldToken) {
      await pool.query('DELETE FROM sessions WHERE token = $1', [oldToken]);
    }
  } catch (err) {
  }
  return createSession(userId);
}
