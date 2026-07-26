import { NextRequest, NextResponse } from 'next/server';
const archiver = require('archiver');
import path from 'path';
import fs from 'fs';

export async function GET(request: NextRequest) {
  const siteDir = path.join(process.cwd(), 'public', '_site');

  if (!fs.existsSync(siteDir)) {
    return NextResponse.json({ error: 'No built site found. Click "Build Site" first.' }, { status: 400 });
  }

  const teacherName = request.nextUrl.searchParams.get('name') || 'teacher';
  const safeName = teacherName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'teacher';

  const chunks: Buffer[] = [];
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.on('data', (chunk: Buffer) => chunks.push(chunk));

  const promise = new Promise<void>((resolve, reject) => {
    archive.on('end', () => resolve());
    archive.on('error', reject);
  });

  archive.directory(siteDir, safeName + '-portfolio');
  archive.finalize();

  await promise;

  return new NextResponse(Buffer.concat(chunks), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeName}-portfolio.zip"`,
    },
  });
}
