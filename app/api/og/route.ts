import { NextRequest, NextResponse } from 'next/server';
import { getContent } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function escXml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseTeacherId(value: string | null): number | null {
  if (!value) return null;
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Auto social-preview card (SVG) for sites without a photo:
 * /api/og?teacherId=123 — 1200x630, theme-colored, cacheable.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const teacherId = parseTeacherId(searchParams.get('teacherId'));
  if (!teacherId) return new NextResponse('teacherId required', { status: 400 });
  const data = await getContent(teacherId).catch(() => null);
  if (!data || !data.hero?.initials) return new NextResponse('Site not found', { status: 404 });

  const name = String(data.hero?.title || data.site?.title || 'Teacher Portfolio').slice(0, 60);
  const tagline = String(data.hero?.tagline || '').slice(0, 80);
  const initials = String(data.hero?.initials || 'TP').slice(0, 3);
  const primary = /^#[0-9a-f]{6}$/i.test(data.theme?.colors?.primary || '') ? data.theme.colors.primary : '#4f46e5';
  const accent = /^#[0-9a-f]{6}$/i.test(data.theme?.colors?.accent || '') ? data.theme.colors.accent : '#059669';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#0b0f1a"/><stop offset="1" stop-color="#111827"/>
  </linearGradient></defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="150" cy="315" r="90" fill="${primary}" opacity="0.9"/>
  <text x="150" y="340" font-family="Arial,sans-serif" font-size="64" font-weight="bold" fill="#ffffff" text-anchor="middle">${escXml(initials)}</text>
  <text x="280" y="290" font-family="Arial,sans-serif" font-size="64" font-weight="bold" fill="#ffffff">${escXml(name)}</text>
  <text x="282" y="350" font-family="Arial,sans-serif" font-size="34" fill="${accent}">${escXml(tagline)}</text>
  <text x="282" y="410" font-family="Arial,sans-serif" font-size="28" fill="#94a3b8">Teacher Portfolio</text>
  <rect x="80" y="500" width="1040" height="6" rx="3" fill="${primary}" opacity="0.5"/>
</svg>`;
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
