import { NextRequest, NextResponse } from 'next/server';
import { getContent, runBuild } from '@/lib/db';
import path from 'path';
import fs from 'fs';

function getFilesRecursively(dir: string, baseDir: string = dir): { file: string; data: string }[] {
  let results: { file: string; data: string }[] = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir);
  list.forEach((filename) => {
    const filePath = path.join(dir, filename);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(filePath, baseDir));
    } else {
      const relativePath = path.relative(baseDir, filePath).replace(/\\/g, '/');
      const content = fs.readFileSync(filePath, 'utf8');
      results.push({
        file: relativePath,
        data: content,
      });
    }
  });
  return results;
}

export async function POST(request: NextRequest) {
  const teacherName = request.nextUrl.searchParams.get('name') || 'teacher';
  const safeName = teacherName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'teacher';
  const data = await getContent();

  const siteDir = path.join(process.cwd(), 'public', '_site');
  if (!fs.existsSync(path.join(siteDir, 'index.html'))) {
    await runBuild(data);
  }

  const token = process.env.VERCEL_TOKEN;
  if (token) {
    try {
      const files = getFilesRecursively(siteDir);
      const payload = {
        name: `${safeName}-portfolio`,
        files,
        projectSettings: {
          framework: null,
        },
      };

      const res = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.url) {
        return NextResponse.json({ url: `https://${json.url}`, message: 'Deployed successfully to Vercel!' });
      }
      return NextResponse.json({ message: `Vercel error: ${json.error?.message || JSON.stringify(json)}` }, { status: 400 });
    } catch (e: any) {
      return NextResponse.json({ message: `Deployment failed: ${e.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({
    message: 'VERCEL_TOKEN environment variable is not configured in .env.local.\n\nTo enable 1-click live deployments:\n1. Get a token at https://vercel.com/account/tokens\n2. Add VERCEL_TOKEN=your_token_here to .env.local\n3. Restart the dev server.',
    url: '',
  });
}
