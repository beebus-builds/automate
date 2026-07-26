import { NextResponse } from 'next/server';
const archiver = require('archiver');
import path from 'path';
import fs from 'fs';

export async function GET() {
  const siteDir = path.join(process.cwd(), 'public', '_site');

  if (!fs.existsSync(siteDir)) {
    return NextResponse.json({ error: 'No built site found. Click "Build Site" first.' }, { status: 400 });
  }

  const chunks: Buffer[] = [];
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.on('data', (chunk: Buffer) => chunks.push(chunk));

  const promise = new Promise<void>((resolve, reject) => {
    archive.on('end', () => resolve());
    archive.on('error', reject);
  });

  archive.directory(siteDir, 'portfolio');
  archive.finalize();

  await promise;

  return new NextResponse(Buffer.concat(chunks), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="teacher-portfolio.zip"',
    },
  });
}
