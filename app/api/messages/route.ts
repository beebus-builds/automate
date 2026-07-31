import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    if (!teacherId) {
      return NextResponse.json({ error: 'teacherId required' }, { status: 400 });
    }
    const { rows } = await pool.query(
      'SELECT * FROM visitor_messages WHERE teacher_id = $1 ORDER BY created_at ASC',
      [parseInt(teacherId)]
    );
    return NextResponse.json({ messages: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teacherId, text, from } = body;
    if (!teacherId || !text) {
      return NextResponse.json({ error: 'teacherId and text required' }, { status: 400 });
    }
    const { rows } = await pool.query(
      'INSERT INTO visitor_messages (teacher_id, text, sender) VALUES ($1, $2, $3) RETURNING *',
      [parseInt(teacherId), text, from || 'visitor']
    );
    return NextResponse.json({ success: true, message: rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
