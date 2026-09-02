import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Issues the signaling-server teacher token to authenticated users.
 * The token is required to join a call room as the "teacher" role and
 * must match SIGNALING_TEACHER_TOKEN on the Python signaling server.
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const token = process.env.SIGNALING_TEACHER_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: 'Signaling is not configured. Set SIGNALING_TEACHER_TOKEN.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: 'Failed to issue token' }, { status: 500 });
  }
}