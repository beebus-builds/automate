import { NextResponse } from 'next/server';
import { getContent, saveContent } from '@/lib/db';

export async function GET() {
  const data = await getContent();
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const data = await request.json();
  await saveContent(data);
  return NextResponse.json({ ok: true });
}
