import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getContent, listDomains, addDomain, setDomainVerified, deleteDomain } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HOST_RE = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*\.[A-Za-z]{2,}$/;

function cleanDomain(raw: unknown): string | null {
  let d = String(raw || '').trim().toLowerCase();
  d = d.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  if (!d || d.length > 253 || !HOST_RE.test(d)) return null;
  return d;
}

function vercelToken(user: any): string {
  return user?.vercel_token || process.env.VERCEL_TOKEN || '';
}

async function projectNameFor(userId: number): Promise<string | null> {
  const data = await getContent(userId);
  return data?.deployment?.projectName || null;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  return NextResponse.json({ domains: await listDomains(user.id) });
}

/** Add a domain: registers it on the teacher's Vercel project, stores locally. */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const rl = await rateLimit(`domains:${user.id}`, 10, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too fast. Slow down.' }, { status: 429 });
  const body = await request.json().catch(() => null);
  const domain = cleanDomain(body?.domain);
  if (!domain) return NextResponse.json({ error: 'Enter a valid domain like you.example.com.' }, { status: 400 });

  const token = vercelToken(user);
  if (!token) return NextResponse.json({ error: 'VERCEL_TOKEN not configured — add it in Settings or .env.' }, { status: 400 });
  const project = await projectNameFor(user.id);
  if (!project) return NextResponse.json({ error: 'Deploy your site first, then add a domain.' }, { status: 400 });

  try {
    const res = await fetch(`https://api.vercel.com/v10/projects/${encodeURIComponent(project)}/domains`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: domain }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json({ error: json?.error?.message || 'Vercel rejected the domain.' }, { status: 400 });
    }
    const rec = await addDomain(user.id, domain);
    const verified = !!json?.verified;
    if (verified) await setDomainVerified(rec.id, user.id, true);
    return NextResponse.json({
      ok: true,
      domain: { ...rec, verified: verified ? 1 : 0 },
      verification: json?.verification || [],
      verified,
    });
  } catch {
    return NextResponse.json({ error: 'Could not reach Vercel.' }, { status: 502 });
  }
}

/** Re-check verification with Vercel. */
export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = parseInt(body?.id, 10);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const token = vercelToken(user);
  if (!token) return NextResponse.json({ error: 'VERCEL_TOKEN not configured.' }, { status: 400 });
  const project = await projectNameFor(user.id);
  if (!project) return NextResponse.json({ error: 'Deploy your site first.' }, { status: 400 });
  const mine = (await listDomains(user.id)).find(d => d.id === id);
  if (!mine) return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
  try {
    const res = await fetch(
      `https://api.vercel.com/v10/projects/${encodeURIComponent(project)}/domains/${encodeURIComponent(mine.domain)}/verify`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
    );
    const json = await res.json().catch(() => null);
    const verified = res.ok && !!json?.verified;
    await setDomainVerified(id, user.id, verified);
    return NextResponse.json({ ok: true, verified, verification: json?.verification || [] });
  } catch {
    return NextResponse.json({ error: 'Could not reach Vercel.' }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get('id') || '', 10);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const mine = (await listDomains(user.id)).find(d => d.id === id);
  if (!mine) return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
  const token = vercelToken(user);
  const project = await projectNameFor(user.id);
  if (token && project) {
    try {
      await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(project)}/domains/${encodeURIComponent(mine.domain)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
  }
  await deleteDomain(id, user.id);
  return NextResponse.json({ ok: true });
}
