import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { chatJson, llmEnabled } from '@/lib/llm';
import { rateLimit } from '@/lib/rate-limit';
import { sanitizeText } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const FIELDS: Record<string, { label: string; system: string; maxLen: number }> = {
  bio: {
    label: 'teaching bio',
    system: 'You polish teacher portfolio bios. Keep the first person, the facts, and the approximate length. Return warm, specific, professional copy with no clichés and no invented credentials.',
    maxLen: 1200,
  },
  quote: {
    label: 'teaching quote',
    system: 'You refine teaching mottos. Keep the meaning, make it memorable and quotable in one or two sentences.',
    maxLen: 400,
  },
  achievements: {
    label: 'achievements',
    system: 'You tighten achievement summaries for a teacher portfolio. Keep every fact, drop filler, stay truthful.',
    maxLen: 800,
  },
  course: {
    label: 'course description',
    system: 'You write crisp course descriptions for a teacher portfolio: what students learn and why it matters, in 1-2 sentences.',
    maxLen: 600,
  },
  post: {
    label: 'blog post',
    system: 'You lightly edit a teacher blog post: fix grammar and flow, keep the voice and all facts. Return the full improved text.',
    maxLen: 8000,
  },
};

// One-click AI rewrite for Studio text fields (Ollama-backed, honest fallback).
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const rl = await rateLimit(`polish:${user.id}`, 20, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too fast. Slow down.' }, { status: 429 });

  const body = await request.json().catch(() => null);
  const field = FIELDS[String(body?.field || '')];
  const text = sanitizeText(body?.text, field?.maxLen || 500);
  if (!field || !text) return NextResponse.json({ error: 'Field and text required.' }, { status: 400 });
  if (!llmEnabled()) {
    return NextResponse.json(
      { error: 'AI is not running. Start Ollama (OLLAMA_HOST) to enable polishing.' },
      { status: 503 }
    );
  }
  const out = await chatJson<{ text: string }>({
    system: field.system,
    user: `Polish this ${field.label}:\n\n${text}`,
    format: {
      type: 'object',
      properties: { text: { type: 'string' } },
      required: ['text'],
    },
    timeoutMs: 25000,
  });
  const polished = (out?.text || '').trim().slice(0, field.maxLen);
  if (!polished) {
    return NextResponse.json({ error: 'AI returned nothing useful. Try again.' }, { status: 502 });
  }
  return NextResponse.json({ ok: true, text: polished });
}
