import { NextResponse } from 'next/server';
import { getContent } from '@/lib/db';
import { ensureSiteBuild } from '@/lib/builder';
import { getSessionUser } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Builds tie up CPU/disk and are a classic DoS vector — authenticated + rate-limited.
export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const rl = await rateLimit(`build:${user.id}`, 10, 10 * 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many builds. Try again in a few minutes.' }, { status: 429 });
    }
    const data = await getContent(user.id);
    const result = await ensureSiteBuild(data, user.id, true);
    return NextResponse.json({ message: result.message });
  } catch (err) {
    console.error('Build error:', err);
    return NextResponse.json({ error: 'Build failed' }, { status: 500 });
  }
}