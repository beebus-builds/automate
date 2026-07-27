import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { hashPassword, verifyPassword, createSession, getSessionUser, clearSession, rotateSession } from '@/lib/auth';

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 128) return 'Password must be at most 128 characters';
  if (/[\x00-\x1f\x7f]/.test(password)) return 'Password contains invalid characters';
  return null;
}

function sanitizeName(name: string): string {
  return name.replace(/[<>"'&]/g, '').trim().slice(0, 100);
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, maxAttempts = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxAttempts) return false;
  entry.count++;
  return true;
}

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ user: user || null });
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests. Please wait before trying again.' }, { status: 429 });
    }

    const body = await request.json();
    const { action, email, password, name, vercel_token } = body || {};

    if (action === 'token') {
      const user = await getSessionUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const safeToken = typeof vercel_token === 'string' ? vercel_token.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 64) : '';
      await pool.query('UPDATE users SET vercel_token = $1 WHERE id = $2', [safeToken, user.id]);
      return NextResponse.json({ ok: true });
    }

    if (action === 'register') {
      if (!email || !password || !name) {
        return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 });
      }
      if (!validateEmail(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }
      const pwError = validatePassword(password);
      if (pwError) {
        return NextResponse.json({ error: pwError }, { status: 400 });
      }
      const safeName = sanitizeName(name);
      if (!safeName) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      }

      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
      if (existing.rows.length > 0) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
      }

      const hashed = hashPassword(password);
      const { rows } = await pool.query(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, name, email',
        [email.toLowerCase(), hashed, safeName]
      );
      const user = rows[0];
      await createSession(user.id);

      return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
    }

    if (action === 'login') {
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
      }
      if (!validateEmail(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }

      const { rows } = await pool.query(
        'SELECT id, email, name, password_hash FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (rows.length === 0) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      const user = rows[0];
      if (!verifyPassword(password, user.password_hash)) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      await rotateSession(user.id);

      return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
    }

    if (action === 'logout') {
      await clearSession();
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Auth error:', err.message);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
