import { NextRequest, NextResponse } from 'next/server';
import { getContent, saveContent } from '@/lib/db';
import { ensureSiteBuild } from '@/lib/builder';
import { getSessionUser } from '@/lib/auth';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { deployBodySchema } from '@/lib/validation';
import { slugifyTeacherName, teacherDisplayName } from '@/lib/slug';
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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** true when a Vercel project with this name already exists on the token's account. */
async function projectTaken(name: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(name)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 404) return false;
    if (res.ok) return true;
    // On unexpected responses fail safe: assume taken so we use the
    // suffixed name and never overwrite another teacher's project.
    return true;
  } catch {
    return true;
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) {
      return NextResponse.json({
        message: 'Not authenticated. Log in to deploy your site.',
        url: '',
      }, { status: 401 });
    }
    // Deploys fan out to Vercel + rebuild the static bundle — strict limit.
    const rl = await rateLimit(`deploy:${sessionUser.id}`, 5, 10 * 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ message: 'Too many deployments. Try again in a few minutes.', url: '' }, { status: 429 });
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = deployBodySchema.safeParse(rawBody ?? {});
    const body = parsed.success ? parsed.data : {};

    const teacherId = sessionUser.id;

    const token = sessionUser.vercel_token || process.env.VERCEL_TOKEN;
    if (!token) {
      return NextResponse.json({
        message: 'VERCEL_TOKEN not configured. Add it to .env.local',
        url: '',
      }, { status: 400 });
    }

    const data = await getContent(sessionUser.id);
    if (!data || !data.hero?.initials) {
      return NextResponse.json({ message: 'No site data found' }, { status: 400 });
    }

    const result = await ensureSiteBuild(data, sessionUser.id, true);
    const distDir = path.join(process.cwd(), 'public', '_site', String(sessionUser.id));

    // ── Automatic domain: teacher's name, reused on every redeploy ──
    // The chosen project name is stored on the teacher's own content doc,
    // so redeploys update the same URL and never orphan projects.
    let projectName: string | undefined = data?.deployment?.projectName;
    if (!projectName) {
      const base = slugifyTeacherName(body?.name || teacherDisplayName(data));
      projectName = base;
      if (await projectTaken(base, token)) {
        // Another project already owns this slug (e.g. same-name teacher):
        // suffix with the teacher id — still carries their name.
        projectName = `${base}-${teacherId}`.slice(0, 100);
      }
    }
    const files = getFilesRecursively(distDir);
    for (const f of files) {
      if (f.data === undefined) {
        const fullPath = path.join(distDir, f.file);
        const buf = fs.readFileSync(fullPath);
        f.data = buf.toString('base64');
      }
    }

    const payload: any = {
      name: projectName,
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
      const url = `https://${json.url}`;
      // Remember the project so redeploys reuse the same domain.
      try {
        data.deployment = { projectName, url, at: Date.now() };
        await saveContent(data, sessionUser.id);
      } catch {
        // Deploy succeeded; persisting the pointer must not fail the request.
      }
      return NextResponse.json({
        url,
        projectName,
        message: 'Site is live! Anyone can access it at this URL.',
      });
    }

    return NextResponse.json({
      message: `Vercel error: ${json.error?.message || JSON.stringify(json)}`,
    }, { status: 400 });

  } catch (e) {
    console.error('Deploy error:', e);
    return NextResponse.json({ message: 'Deployment failed. Check your Vercel token and try again.' }, { status: 500 });
  }
}
