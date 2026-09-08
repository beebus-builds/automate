import { NextRequest, NextResponse } from 'next/server';
import { getContent } from '@/lib/db';
import { ensureSiteBuild } from '@/lib/builder';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const data = await getContent(user.id);
    await ensureSiteBuild(data, user.id, false);

    const siteDirFor = require('path').join(process.cwd(), 'public', '_site', String(user.id));
    const fs = require('fs');
    if (!fs.existsSync(require('path').join(siteDirFor, 'index.html'))) {
      return NextResponse.json({ error: 'No built site found. Generate your site first.' }, { status: 400 });
    }

    const teacherName = request.nextUrl.searchParams.get('name') || 'teacher';
    const safeName = teacherName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'teacher';

    const chunks: Buffer[] = [];
    const archive = new (require('archiver').ZipArchive)({ zlib: { level: 9 } });

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));

    const promise = new Promise<void>((resolve, reject) => {
      archive.on('end', () => resolve());
      archive.on('error', (err: any) => reject(err));
    });

    archive.directory(siteDirFor, `${safeName}-portfolio`);
    archive.finalize();

    await promise;

    const zipBuffer = Buffer.concat(chunks);

    return new Response(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${safeName}-portfolio.zip"`,
        'Content-Length': zipBuffer.length.toString(),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Download error:', err);
    return NextResponse.json({ error: 'Failed to create download' }, { status: 500 });
  }
}