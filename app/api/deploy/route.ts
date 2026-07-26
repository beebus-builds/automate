import { NextRequest, NextResponse } from 'next/server';
import { getContent, runBuild } from '@/lib/db';
const archiver = require('archiver');
import path from 'path';
import fs from 'fs';

async function createTarGz(): Promise<Buffer> {
  const siteDir = path.join(process.cwd(), 'public', '_site');
  const chunks: Buffer[] = [];
  const archive = archiver('tar', { gzip: true });
  archive.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<void>((resolve, reject) => {
    archive.on('end', () => resolve());
    archive.on('error', reject);
  });
  archive.directory(siteDir, false);
  archive.finalize();
  await done;
  return Buffer.concat(chunks);
}

export async function POST(request: NextRequest) {
  const teacherName = request.nextUrl.searchParams.get('name') || 'My Portfolio';
  const safeName = teacherName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'portfolio';
  const data = await getContent();

  // Build if not already built
  const siteDir = path.join(process.cwd(), 'public', '_site');
  if (!fs.existsSync(path.join(siteDir, 'index.html'))) {
    runBuild(data);
  }

  // Try Vercel deploy if token available
  const token = process.env.VERCEL_TOKEN;
  if (token) {
    try {
      const tarball = await createTarGz();
      const res = await fetch(`https://api.vercel.com/v13/deployments?name=${safeName}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
        },
        body: new Blob([new Uint8Array(tarball)]),
      });
      const json = await res.json();
      if (json.url) {
        return NextResponse.json({ url: `https://${json.url}`, message: 'Deployed to Vercel!' });
      }
      return NextResponse.json({ message: `Vercel response: ${JSON.stringify(json)}` });
    } catch (e: any) {
      return NextResponse.json({ message: `Vercel deploy failed: ${e.message}. You can still download the ZIP.` });
    }
  }

  // No token — return instructions
  return NextResponse.json({
    message: 'No VERCEL_TOKEN set. To enable one-click deploy:\n\n1. Go to https://vercel.com/account/tokens\n2. Create a token\n3. Add VERCEL_TOKEN=your_token to .env.local\n\nYour site is ready at /_site/ and as a ZIP download.',
    url: '',
  });
}
