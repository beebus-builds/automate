import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { sanitizeText, MAX_MESSAGE_TEXT, MAX_MESSAGE_SENDER } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseTeacherId(value: string | null): number | null {
  if (!value) return null;
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Visitor messages are private to the owning teacher — authenticated only.
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const teacherId = parseTeacherId(searchParams.get('teacherId'));
    if (!teacherId) {
      return NextResponse.json({ error: 'teacherId required' }, { status: 400 });
    }
    if (teacherId !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    const { rows } = await pool.query(
      'SELECT * FROM visitor_messages WHERE teacher_id = $1 ORDER BY created_at ASC',
      [teacherId]
    );
    return NextResponse.json({ messages: rows });
  } catch {
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}

// Public — visitors on generated sites can leave a message for the teacher.
export async function POST(request: NextRequest) {
  try {
    const rl = await rateLimit(`msg:${clientIp(request.headers)}`, 15, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many messages. Please slow down.' }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const teacherId = parseTeacherId(body?.teacherId);
    const text = sanitizeText(body?.text, MAX_MESSAGE_TEXT);
    const sender = sanitizeText(body?.from, MAX_MESSAGE_SENDER) || 'visitor';

    if (!teacherId || !text) {
      return NextResponse.json({ error: 'teacherId and text required' }, { status: 400 });
    }

    const { rows } = await pool.query(
      'INSERT INTO visitor_messages (teacher_id, text, sender) VALUES ($1, $2, $3) RETURNING *',
      [teacherId, text, sender]
    );
    return NextResponse.json({ success: true, message: rows[0] });
  } catch {
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  }
}