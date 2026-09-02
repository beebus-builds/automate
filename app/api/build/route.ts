import { NextResponse } from 'next/server';
import { getContent } from '@/lib/db';
import { ensureSiteBuild } from '@/lib/builder';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Builds tie up CPU/disk and are a classic DoS vector — authenticated only.
export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const data = await getContent();
    const result = await ensureSiteBuild(data, undefined, true);
    return NextResponse.json({ message: result.message });
  } catch (err) {
    console.error('Build error:', err);
    return NextResponse.json({ error: 'Build failed' }, { status: 500 });
  }
}