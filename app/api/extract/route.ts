import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { extractRequestSchema } from '@/lib/validation';
import { extractTeacherFields } from '@/lib/extract';
import { llmEnabled } from '@/lib/llm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Extract teacher profile fields from a chat message.
 *
 * `extracted: null` means "no model available / model failed" — the client
 * falls back to the regex parser, so this route never returns 5xx for an
 * unreachable Ollama.
 */
export async function POST(request: NextRequest) {
  if (!llmEnabled()) {
    return NextResponse.json({ extracted: null });
  }

  const user = await getSessionUser();
  const key = user?.id ? `extract:${user.id}` : `extract:ip:${clientIp(request.headers)}`;
  const rl = await rateLimit(key, 40, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = extractRequestSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const extracted = await extractTeacherFields(parsed.data.message, parsed.data.current);
    return NextResponse.json({ extracted });
  } catch {
    return NextResponse.json({ extracted: null });
  }
}
