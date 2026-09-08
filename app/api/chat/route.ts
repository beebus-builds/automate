import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getChatState, saveChatState } from '@/lib/db';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { chatSaveSchema, byteSizeOf, MAX_CHAT_BYTES } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user?.id) {
      return NextResponse.json({ state: null });
    }
    const state = await getChatState(user.id);
    return NextResponse.json({ state });
  } catch {
    return NextResponse.json({ state: null });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const rl = await rateLimit(`chat:${user.id}`, 60, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 });
    }
    const raw = await request.json().catch(() => null);
    const parsed = chatSaveSchema.safeParse(raw ?? {});
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid chat payload' }, { status: 400 });
    }
    if (byteSizeOf(parsed.data) > MAX_CHAT_BYTES) {
      return NextResponse.json({ error: 'Chat payload too large' }, { status: 413 });
    }
    const { messages, step, data, memory } = parsed.data;
    await saveChatState(user.id, messages, step, data || {}, memory);
    return NextResponse.json({ ok: true });
  } catch {
    // Never leak internals (e.g. SQL errors) to the client.
    return NextResponse.json({ error: 'Failed to save chat' }, { status: 500 });
  }
}
