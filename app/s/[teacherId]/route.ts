import { NextRequest, NextResponse } from 'next/server';
import { getContent, runBuild } from '@/lib/db';
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
    const teacherId = parseInt(teacherIdStr, 10);
    if (isNaN(teacherId)) {
      return new NextResponse('Invalid teacher ID', { status: 400 });
    }

    const data = await getContent(teacherId);
    if (!data || !data.hero?.initials) {
      return new NextResponse('Site not found', { status: 404 });
    }

    // Build and serve
    const result = await runBuild(data, teacherId);
    const distDir = path.join(process.cwd(), 'public', '_site', String(teacherId));
    const indexPath = path.join(distDir, 'index.html');
    if (!fs.existsSync(indexPath)) {
      return new NextResponse('Site not built', { status: 500 });
    }

    let html = fs.readFileSync(indexPath, 'utf8');
    // Inject base tag so relative CSS/JS paths resolve correctly
    html = html.replace('<head>', `<head><base href="/s/${teacherId}/">`);
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    return new NextResponse(`Error: ${err.message}`, { status: 500 });
  }
}
