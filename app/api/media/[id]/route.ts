import { NextRequest, NextResponse } from 'next/server';
import { deleteMedia } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  const parsed = parseInt(id, 10);
  if (isNaN(parsed) || parsed <= 0) {
    return NextResponse.json({ error: 'Invalid media id' }, { status: 400 });
  }
  const ok = await deleteMedia(parsed, user.id);
  return NextResponse.json({ ok });
}