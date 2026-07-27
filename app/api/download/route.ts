import { NextRequest, NextResponse } from 'next/server';
import { getContent, runBuild } from '@/lib/db';
const { ZipArchive } = require('archiver');
import path from 'path';
import fs from 'fs';

export async function GET(request: NextRequest) {
  try {
    const siteDir = path.join(process.cwd(), 'public', '_site');

    if (!fs.existsSync(path.join(siteDir, 'index.html'))) {
      const data = await getContent();
      await runBuild(data);
    }

    if (!fs.existsSync(path.join(siteDir, 'index.html'))) {
      return NextResponse.json({ error: 'No built site found. Generate your site first.' }, { status: 400 });
    }

    const teacherName = request.nextUrl.searchParams.get('name') || 'teacher';
    const safeName = teacherName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'teacher';

    const chunks: Buffer[] = [];
    const archive = new ZipArchive({ zlib: { level: 9 } });

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));

    const promise = new Promise<void>((resolve, reject) => {
      archive.on('end', () => resolve());
      archive.on('error', (err: any) => reject(err));
    });

    archive.directory(siteDir, `${safeName}-portfolio`);
    archive.finalize();

    await promise;

    const zipBuffer = Buffer.concat(chunks);

    return new Response(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${safeName}-portfolio.zip"`,
        'Content-Length': zipBuffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    console.error('Download error:', err.message);
    return NextResponse.json({ error: `Download failed: ${err.message}` }, { status: 500 });
  }
}
