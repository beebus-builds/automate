import { NextRequest, NextResponse } from 'next/server';
import { getContent, runBuild } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const siteDir = path.join(process.cwd(), 'public', '_site');
    const indexPath = path.join(siteDir, 'index.html');

    if (!fs.existsSync(indexPath)) {
      const data = await getContent();
      await runBuild(data);
    }

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
  } catch (err: any) {
    console.error('Preview error:', err.message);
    return NextResponse.json({ error: `Preview error: ${err.message}` }, { status: 500 });
  }
}
