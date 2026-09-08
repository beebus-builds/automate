import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIME: Record<string, string> = {
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.html': 'text/html',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teacherId: string; path: string[] }> },
) {
  try {
    const { teacherId, path: pathSegments } = await params;
    if (!/^\d+$/.test(teacherId)) {
      return new NextResponse('Not found', { status: 404 });
    }

    const siteRoot = path.join(process.cwd(), 'public', '_site', teacherId);
    let filePath = path.resolve(siteRoot, ...(pathSegments || []));

    // Path-traversal guard: resolved path must stay inside the site root.
    const rootWithSep = siteRoot.endsWith(path.sep) ? siteRoot : siteRoot + path.sep;
    if (filePath !== siteRoot && !filePath.startsWith(rootWithSep)) {
      return new NextResponse('Not found', { status: 404 });
    }

    // Multi-page sites: directories serve their index.html, and clean
    // URLs like /s/1/about resolve to about.html.
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    } else if (!fs.existsSync(filePath) && !path.extname(filePath)) {
      const htmlCandidate = filePath + '.html';
      if (fs.existsSync(htmlCandidate)) filePath = htmlCandidate;
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      return new NextResponse('Not found', { status: 404 });
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);
    const isHtml = ext === '.html';
    const extraHeaders: Record<string, string> = isHtml
      ? {
          'Content-Security-Policy': [
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
          ].join('; '),
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'X-Frame-Options': 'SAMEORIGIN',
        }
      : {};

    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': isHtml ? 'no-cache, no-store, must-revalidate' : 'public, max-age=3600, stale-while-revalidate=86400',
        ...extraHeaders,
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}