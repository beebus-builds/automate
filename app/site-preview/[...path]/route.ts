import { NextRequest, NextResponse } from 'next/server';
import { getContent, runBuild } from '@/lib/db';
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
    const relativePath = pathSegments.join('/');
    const siteDir = path.join(process.cwd(), 'public', '_site');
    let targetPath = path.join(siteDir, relativePath);

    if (!fs.existsSync(path.join(siteDir, 'index.html'))) {
      const data = await getContent();
      await runBuild(data);
    }

    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
      targetPath = path.join(targetPath, 'index.html');
    }

    if (fs.existsSync(targetPath)) {
      const ext = path.extname(targetPath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      const fileBuffer = fs.readFileSync(targetPath);

      return new NextResponse(new Uint8Array(fileBuffer), {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  } catch (err: any) {
    console.error('Preview error:', err.message);
    return NextResponse.json({ error: `Preview error: ${err.message}` }, { status: 500 });
  }
}
