import { NextRequest, NextResponse } from 'next/server';
import { getContent } from '@/lib/db';
import { chatJson, llmEnabled } from '@/lib/llm';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { sanitizeText } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function parseTeacherId(value: unknown): number | null {
  const n = typeof value === 'string' ? parseInt(value, 10) : Number(value);
  return Number.isInteger(n) && (n as number) > 0 ? (n as number) : null;
}

function siteContext(data: any): string {
  const d = data || {};
  const lines: string[] = [];
  if (d?.hero?.title) lines.push(`Teacher: ${d.hero.title}`);
  if (d?.hero?.description) lines.push(`Bio: ${String(d.hero.description).slice(0, 600)}`);
  if (Array.isArray(d?.courses)) {
    lines.push('Courses: ' + d.courses.slice(0, 12).map((c: any) => c.title || c).join('; ').slice(0, 600));
  }
  if (d?.philosophy?.quote) lines.push(`Philosophy: ${String(d.philosophy.quote).slice(0, 300)}`);
  if (d?.contact?.email) lines.push(`Contact email: ${d.contact.email}`);
  if (d?.contact?.phone) lines.push(`Contact phone: ${d.contact.phone}`);
  if (Array.isArray(d?.achievements)) {
    lines.push('Achievements: ' + d.achievements.slice(0, 8).map((a: any) => a.title || a).join('; ').slice(0, 400));
  }
  return lines.join('\n');
}

/**
 * Public AI Q&A for generated sites. Answers strictly from the teacher's
 * own content; says so honestly when the answer isn't there.
 */
export async function POST(request: NextRequest) {
  try {
    const rl = await rateLimit(`ask:${clientIp(request.headers)}`, 20, 60_000);
    if (!rl.allowed) return NextResponse.json({ error: 'Too fast. Slow down.' }, { status: 429 });
    const body = await request.json().catch(() => null);
    const teacherId = parseTeacherId(body?.teacherId);
    const question = sanitizeText(body?.question, 500);
    if (!teacherId || !question) {
      return NextResponse.json({ error: 'teacherId and question required' }, { status: 400 });
    }
    if (!llmEnabled()) return NextResponse.json({ ok: false, fallback: true });
    const data = await getContent(teacherId);
    if (!data || !data.hero?.initials) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

    const out = await chatJson<{ answer: string; confident: boolean }>({
      system: 'You are the helpful assistant on a teacher portfolio website. Answer ONLY from the teacher information below, in 1-3 short sentences. If the answer is not in the information, say so briefly and suggest contacting the teacher. Never invent credentials, prices, or schedules.',
      user: `Teacher information:\n${siteContext(data)}\n\nVisitor question: ${question}`,
      format: {
        type: 'object',
        properties: { answer: { type: 'string' }, confident: { type: 'boolean' } },
        required: ['answer', 'confident'],
      },
      timeoutMs: 20000,
    });
    if (!out?.answer) return NextResponse.json({ ok: false, fallback: true });
    return NextResponse.json({ ok: true, answer: out.answer.slice(0, 800), confident: !!out.confident });
  } catch {
    return NextResponse.json({ ok: false, fallback: true });
  }
}
