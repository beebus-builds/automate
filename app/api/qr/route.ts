import { NextRequest, NextResponse } from 'next/server';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** QR share card for a live site: /api/qr?teacherId=123[&download=1] */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const n = parseInt(searchParams.get('teacherId') || '', 10);
  if (!Number.isInteger(n) || n <= 0) {
    return new NextResponse('teacherId required', { status: 400 });
  }
  const base = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '') || request.nextUrl.origin;
  const url = `${base}/s/${n}`;
  try {
    const QRCode = require('qrcode');
    const buf: Buffer = await QRCode.toBuffer(url, { width: 440, margin: 2 });
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
        ...(searchParams.get('download')
          ? { 'Content-Disposition': `attachment; filename="site-${n}-qr.png"` }
          : {}),
      },
    });
  } catch {
    return new NextResponse('QR generation failed', { status: 500 });
  }
}
