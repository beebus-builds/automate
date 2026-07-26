import { NextResponse } from 'next/server';
import { getContent, runBuild } from '@/lib/db';

export async function POST() {
  const data = getContent();
  const msg = runBuild(data);
  return NextResponse.json({ message: msg });
}
