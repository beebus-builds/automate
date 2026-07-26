import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { hashPassword, verifyPassword, createSession, getSessionUser, clearSession } from '@/lib/auth';

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ user: user || null });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'register') {
      const { name, email, password } = body;
      if (!email || !password || !name) {
        return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
      }

      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
      if (existing.rows.length > 0) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
      }

      const passwordHash = hashPassword(password);
      const { rows } = await pool.query(
        'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, vercel_token, created_at',
        [name, email.toLowerCase(), passwordHash]
      );
      const user = rows[0];
      await createSession(user.id);
      return NextResponse.json({ user, message: 'Registered successfully' });
    }

    if (action === 'login') {
      const { email, password } = body;
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
      }

      const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
      if (rows.length === 0 || !verifyPassword(password, rows[0].password_hash)) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      const user = rows[0];
      await createSession(user.id);
      return NextResponse.json({
        user: { id: user.id, name: user.name, email: user.email, vercel_token: user.vercel_token },
        message: 'Logged in successfully',
      });
    }

    if (action === 'logout') {
      await clearSession();
      return NextResponse.json({ message: 'Logged out successfully' });
    }

    if (action === 'token') {
      const user = await getSessionUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const { vercel_token } = body;
      await pool.query('UPDATE users SET vercel_token = $1 WHERE id = $2', [vercel_token || '', user.id]);
      return NextResponse.json({ message: 'Vercel token updated successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
