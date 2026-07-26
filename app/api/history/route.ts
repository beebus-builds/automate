import { NextResponse } from 'next/server';
import { getHistory, pushHistory, popHistory } from '@/lib/db';

export async function GET() {
  return NextResponse.json(await getHistory());
}

export async function POST(request: Request) {
  const data = await request.json();
  await pushHistory(data);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const prev = await popHistory();
  return NextResponse.json(prev || {});
}
