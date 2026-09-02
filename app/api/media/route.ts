import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { getMediaList, addMedia, deleteMedia } from '@/lib/db';
import { validateUpload, sanitizeFileName } from '@/lib/security';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function GET() {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const list = await getMediaList(user.id);
  return NextResponse.json(list.map((m: any) => ({
    id: m.id,
    filename: m.filename,
    original_name: m.original_name,
    size: m.size,
    url: '/uploads/' + m.filename,
    created_at: m.created_at,
  })));
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const rl = await rateLimit(`media:${user.id}`, 30, 10 * 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many uploads. Try again later.' }, { status: 429 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const check = validateUpload(buffer, file.name);
  if (!check) {
    return NextResponse.json(
      { error: 'Invalid file. Only PNG, JPG, GIF, WebP and ICO images up to 10MB are allowed.' },
      { status: 400 }
    );
  }

  const filename = Date.now() + '-' + Math.random().toString(36).slice(2, 10) + '.' + check.ext;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);

  const record = await addMedia(filename, sanitizeFileName(file.name), file.size, user.id) as any;
  return NextResponse.json({
    id: record.id,
    filename,
    original_name: file.name,
    size: file.size,
    url: '/uploads/' + filename,
  });
}