import { NextResponse } from 'next/server';
import { getMediaList, addMedia } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function GET() {
  const list = getMediaList();
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
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const ext = file.name.split('.').pop() || 'png';
  const filename = Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + ext;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  const record = addMedia(filename, file.name, file.size) as any;
  return NextResponse.json({
    id: record.id,
    filename,
    original_name: file.name,
    size: file.size,
    url: '/uploads/' + filename,
  });
}
