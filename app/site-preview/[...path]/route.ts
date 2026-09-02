import { NextRequest, NextResponse } from 'next/server';
import { getContent } from '@/lib/db';
import { ensureSiteBuild } from '@/lib/builder';
import fs from 'fs';
import path from 'path';

const mimeTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const pathSegments = resolvedParams.path || [];
    const siteDir = path.join(process.cwd(), 'public', '_site');

    const data = await getContent();
    await ensureSiteBuild(data, undefined, false);

    if (!fs.existsSync(path.join(siteDir, 'index.html'))) {
      return NextResponse.json({ error: 'Site not built' }, { status: 500 });
    }

    let targetPath = path.resolve(siteDir, ...pathSegments);

    // Path-traversal guard: resolved path must stay inside the site root.
    const rootWithSep = siteDir.endsWith(path.sep) ? siteDir : siteDir + path.sep;
    if (targetPath !== siteDir && !targetPath.startsWith(rootWithSep)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
      targetPath = path.join(targetPath, 'index.html');
    }

    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
      const ext = path.extname(targetPath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      const fileBuffer = fs.readFileSync(targetPath);

      return new NextResponse(new Uint8Array(fileBuffer), {
        headers: {
          'Content-Type': contentType,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  } catch (err) {
    console.error('Preview error:', err);
    return NextResponse.json({ error: 'Preview failed' }, { status: 500 });
  }
}