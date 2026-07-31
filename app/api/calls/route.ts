import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { pool } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user?.id) {
      return NextResponse.json({ calls: [] });
    }
    const { rows } = await pool.query(
      'SELECT id, teacher_name, room_id, status, created_at FROM pending_calls WHERE answered_by = $1 OR (answered_by IS NULL AND status = $2) ORDER BY created_at DESC LIMIT 10',
      [user.id, 'ringing']
    );
    const calls = rows.map(r => ({
      id: r.id,
      teacherName: r.teacher_name,
      roomId: r.room_id,
      status: r.status,
      createdAt: r.created_at,
    }));
    return NextResponse.json({ calls });
  } catch {
    return NextResponse.json({ calls: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teacherName, roomId, action } = body;

    const user = await getSessionUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (action === 'request') {
      const { rows } = await pool.query(
        'INSERT INTO pending_calls (teacher_name, room_id, status, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
        [teacherName || 'Teacher', roomId || '', 'ringing']
      );
      return NextResponse.json({ id: rows[0]?.id, ok: true });
    }

    if (action === 'answer') {
      const callId = body.callId;
      await pool.query(
        'UPDATE pending_calls SET status = $1, answered_by = $2, answered_at = NOW() WHERE id = $3',
        ['connected', user.id, callId]
      );
      return NextResponse.json({ ok: true });
    }

    if (action === 'end') {
      const callId = body.callId;
      await pool.query(
        'UPDATE pending_calls SET status = $1 WHERE id = $2',
        ['ended', callId]
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
