import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getChatState, saveChatState } from '@/lib/db';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ state: null });
  }
  const state = await getChatState(user.id);
  return NextResponse.json({ state: state || null });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { messages, step, data } = await request.json();
    await saveChatState(user.id, messages || [], step || 'name', data || {});
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
