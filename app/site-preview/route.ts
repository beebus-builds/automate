import { NextRequest, NextResponse } from 'next/server';
import { getContent } from '@/lib/db';
import { ensureSiteBuild } from '@/lib/builder';
import { getSessionUser } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const data = await getContent(user.id);
    await ensureSiteBuild(data, user.id, false);

    const siteDir = path.join(process.cwd(), 'public', '_site', String(user.id));
    const indexPath = path.join(siteDir, 'index.html');

    if (fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, 'utf8');
      html = html.replace('<head>', '<head><base href="/site-preview/">');
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    return NextResponse.json({ error: 'Site build failed' }, { status: 500 });
  } catch (err) {
    console.error('Preview error:', err);
    return NextResponse.json({ error: 'Preview failed' }, { status: 500 });
  }
}