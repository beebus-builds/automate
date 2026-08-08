import { NextResponse } from 'next/server';
import { getContent, runBuild } from '@/lib/db';

export async function POST() {
  try {
    console.log('API /api/build was called');
    const data = await getContent();
    const msg = await runBuild(data);
    return NextResponse.json({ message: msg });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
