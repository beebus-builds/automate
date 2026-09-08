import { NextResponse } from 'next/server';
import { getContent, saveContent } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { contentSchema, byteSizeOf, MAX_CONTENT_BYTES } from '@/lib/validation';

export async function GET() {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const data = await getContent(user.id);
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  // Generous per-user cap: autosave fires often, but floods still get slowed.
  const rl = await rateLimit(`data:${user.id}`, 120, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Saving too fast. Pause a moment and try again.' }, { status: 429 });
  }
  try {
    const raw = await request.json().catch(() => null);
    const parsed = contentSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid content payload' }, { status: 400 });
    }
    if (byteSizeOf(parsed.data) > MAX_CONTENT_BYTES) {
      return NextResponse.json({ error: 'Content too large' }, { status: 413 });
    }
    await saveContent(parsed.data, user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Save content error:', err);
    return NextResponse.json({ error: 'Failed to save content' }, { status: 500 });
  }
}