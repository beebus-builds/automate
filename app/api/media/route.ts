import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { getMediaList, addMedia, deleteMedia } from '@/lib/db';
import { validateUpload, validateDocument, sanitizeFileName } from '@/lib/security';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '100', 10) || 100, 1), 200);
  const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);
  const list = await getMediaList(user.id, limit, (page - 1) * limit);
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

  const isDoc = formData.get('kind') === 'file';
  const buffer = Buffer.from(await file.arrayBuffer());
  const check = isDoc ? validateDocument(buffer, file.name) : validateUpload(buffer, file.name);
  if (!check) {
    return NextResponse.json(
      { error: isDoc ? 'Invalid file. Only PDF documents up to 25MB are allowed.' : 'Invalid file. Only PNG, JPG, GIF, WebP and ICO images up to 10MB are allowed.' },
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