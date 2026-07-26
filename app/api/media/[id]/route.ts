import { NextResponse } from 'next/server';
import { deleteMedia } from '@/lib/db';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = deleteMedia(parseInt(id));
  return NextResponse.json({ ok });
}
