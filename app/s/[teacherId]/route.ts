import { NextRequest, NextResponse } from 'next/server';
import { getContent } from '@/lib/db';
import { ensureSiteBuild } from '@/lib/builder';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> },
) {
  try {
    const { teacherId: teacherIdStr } = await params;
    if (!/^\d+$/.test(teacherIdStr)) {
      return new NextResponse('Invalid teacher ID', { status: 400 });
    }
    const teacherId = parseInt(teacherIdStr, 10);

    const data = await getContent(teacherId);
    if (!data || !data.hero?.initials) {
      return new NextResponse('Site not found', { status: 404 });
    }

    // Rebuilds are cached (30s TTL) and coalesced — visitors can never
    // trigger a rebuild stampede.
    await ensureSiteBuild(data, teacherId, false);
    const distDir = path.join(process.cwd(), 'public', '_site', String(teacherId));
    const indexPath = path.join(distDir, 'index.html');
    if (!fs.existsSync(indexPath)) {
      return new NextResponse('Site not built', { status: 500 });
    }

    let html = fs.readFileSync(indexPath, 'utf8');
    // Inject base tag so relative CSS/JS paths resolve correctly
    html = html.replace('<head>', `<head><base href="/s/${teacherId}/">`);
    const siteCsp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "frame-src https://www.youtube.com https://player.vimeo.com https://www.google.com",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Security-Policy': siteCsp,
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-Frame-Options': 'SAMEORIGIN',
      },
    });
  } catch (err) {
    console.error('Site serve error:', err);
    return new NextResponse('Internal server error', { status: 500 });
  }
}