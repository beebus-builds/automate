import { NextResponse } from 'next/server';
import { getContent, saveContent } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  const data = await getContent();
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  try {
    const data = await request.json();
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      return NextResponse.json({ error: 'Invalid content payload' }, { status: 400 });
    }
    await saveContent(data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Save content error:', err);
    return NextResponse.json({ error: 'Failed to save content' }, { status: 500 });
  }
}