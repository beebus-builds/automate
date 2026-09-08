import { NextRequest, NextResponse } from 'next/server';
import { getContent, saveContent, getHistoryEntries, getHistoryEntry, pushHistory, popHistory } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { historySaveSchema, byteSizeOf, MAX_HISTORY_BYTES } from '@/lib/validation';
import { z } from 'zod';

const restoreSchema = z.object({ id: z.number().int().positive() });

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const singleId = searchParams.get('id');
  if (singleId) {
    const id = parseInt(singleId, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid version id' }, { status: 400 });
    }
    const entry = await getHistoryEntry(id, user.id);
    if (!entry) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }
    return NextResponse.json(entry);
  }
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10) || 20, 1), 50);
  return NextResponse.json(await getHistoryEntries(user.id, limit));
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const rl = await rateLimit(`history:${user.id}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  try {
    const data = await request.json();
    const parsed = historySaveSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    if (byteSizeOf(parsed.data) > MAX_HISTORY_BYTES) {
      return NextResponse.json({ error: 'History entry too large' }, { status: 413 });
    }
    await pushHistory(parsed.data, user.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to save history' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const rl = await rateLimit(`history-del:${user.id}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const prev = await popHistory(user.id);
  return NextResponse.json(prev || {});
}

/**
 * Restore a version: pushes the CURRENT content onto the history stack first
 * (so a restore is itself undoable), then saves the version as live content.
 */
export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const rl = await rateLimit(`history-restore:${user.id}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many restore attempts. Try again shortly.' }, { status: 429 });
  }
  try {
    const raw = await request.json().catch(() => null);
    const parsed = restoreSchema.safeParse(raw ?? {});
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid version id' }, { status: 400 });
    }
    const entry = await getHistoryEntry(parsed.data.id, user.id);
    if (!entry) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }
    // Snapshot current state so the restore can be undone with one Undo.
    const current = await getContent(user.id);
    if (current && Object.keys(current).length > 0) {
      await pushHistory(current, user.id);
    }
    await saveContent(entry.data, user.id);
    return NextResponse.json({ ok: true, data: entry.data });
  } catch {
    return NextResponse.json({ error: 'Failed to restore version' }, { status: 500 });
  }
}