import { NextRequest, NextResponse } from 'next/server';
import { getContent, runBuild } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import path from 'path';
import fs from 'fs';

function getFilesRecursively(dir: string, baseDir: string = dir): any[] {
  let results: any[] = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir);
  list.forEach((filename) => {
    const filePath = path.join(dir, filename);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(filePath, baseDir));
    } else {
      const relativePath = path.relative(baseDir, filePath).replace(/\\/g, '/');
      const ext = path.extname(filename).toLowerCase();
      if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.eot'].includes(ext)) {
        results.push({ file: relativePath, encoding: 'base64', data: undefined });
      } else {
        results.push({ file: relativePath, data: fs.readFileSync(filePath, 'utf8') });
      }
    }
  });
  return results;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const teacherId = body?.teacherId ? parseInt(body.teacherId, 10) : undefined;
    const siteName = body?.name || 'teacher';

    const sessionUser = await getSessionUser();
    const token = sessionUser?.vercel_token || process.env.VERCEL_TOKEN;
    if (!token) {
      return NextResponse.json({
        message: 'VERCEL_TOKEN not configured. Add it to .env.local',
        url: '',
      });
    }

    const data = teacherId ? await getContent(teacherId) : await getContent();
    if (!data || !data.hero?.initials) {
      return NextResponse.json({ message: 'No site data found' }, { status: 400 });
    }

    const result = await runBuild(data, teacherId);
    const distDir = teacherId
      ? path.join(process.cwd(), 'public', '_site', String(teacherId))
      : path.join(process.cwd(), 'public', '_site');

    const safeName = siteName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'teacher-portfolio';
    const projName = teacherId ? `${safeName}-${teacherId}` : safeName;

    const files = getFilesRecursively(distDir);
    for (const f of files) {
      if (f.data === undefined) {
        const fullPath = path.join(distDir, f.file);
        const buf = fs.readFileSync(fullPath);
        f.data = buf.toString('base64');
      }
    }

    const payload: any = {
      name: projName,
      files,
      target: 'production',
      projectSettings: {
        framework: null,
        buildCommand: null,
        outputDirectory: '.',
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
      return NextResponse.json({
        url: `https://${json.url}`,
        message: 'Site is live! Anyone can access it at this URL.',
      });
    }

    return NextResponse.json({
      message: `Vercel error: ${json.error?.message || JSON.stringify(json)}`,
    }, { status: 400 });

  } catch (e: any) {
    return NextResponse.json({ message: `Deployment failed: ${e.message}` }, { status: 500 });
  }
}
