import { NextResponse } from 'next/server';
import { getContent, saveContent } from '@/lib/db';

export async function GET() {
  return NextResponse.json(getContent());
}

export async function PUT(request: Request) {
  const data = await request.json();
  saveContent(data);
  return NextResponse.json({ ok: true });
}
