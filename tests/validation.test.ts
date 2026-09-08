import { describe, it, expect } from 'vitest';
import {
  chatSaveSchema,
  deployBodySchema,
  historySaveSchema,
  contentSchema,
  byteSizeOf,
  MAX_CHAT_BYTES,
  MAX_CONTENT_BYTES,
} from '../lib/validation';

describe('chatSaveSchema', () => {
  it('accepts a minimal valid payload with defaults', () => {
    const out = chatSaveSchema.safeParse({});
    expect(out.success).toBe(true);
    if (out.success) {
      expect(out.data.messages).toEqual([]);
      expect(out.data.step).toBe('name');
    }
  });

  it('rejects oversized message arrays and steps', () => {
    const tooMany = Array.from({ length: 201 }, () => ({ content: 'hi' }));
    expect(chatSaveSchema.safeParse({ messages: tooMany }).success).toBe(false);
    expect(chatSaveSchema.safeParse({ step: 'x'.repeat(101) }).success).toBe(false);
  });

  it('caps individual message content', () => {
    expect(
      chatSaveSchema.safeParse({ messages: [{ content: 'x'.repeat(5001) }] }).success
    ).toBe(false);
  });
});

describe('deployBodySchema', () => {
  it('allows empty and trims names', () => {
    expect(deployBodySchema.safeParse({}).success).toBe(true);
    const out = deployBodySchema.safeParse({ name: '  My Site  ' });
    expect(out.success && out.data.name).toBe('My Site');
  });

  it('rejects overlong names', () => {
    expect(deployBodySchema.safeParse({ name: 'x'.repeat(101) }).success).toBe(false);
  });
});

describe('historySaveSchema / contentSchema', () => {
  it('rejects nulls and arrays', () => {
    expect(historySaveSchema.safeParse(null).success).toBe(false);
    expect(historySaveSchema.safeParse([]).success).toBe(false);
    expect(contentSchema.safeParse([]).success).toBe(false);
  });

  it('rejects content docs with too many keys', () => {
    const big: Record<string, unknown> = {};
    for (let i = 0; i < 101; i++) big[`k${i}`] = i;
    expect(contentSchema.safeParse(big).success).toBe(false);
  });

  it('byteSizeOf measures JSON payload size', () => {
    expect(byteSizeOf({})).toBeGreaterThan(0);
    expect(byteSizeOf({ a: 'x'.repeat(1000) })).toBeGreaterThan(1000);
    expect(MAX_CHAT_BYTES).toBeGreaterThan(0);
    expect(MAX_CONTENT_BYTES).toBeGreaterThan(MAX_CHAT_BYTES);
  });
});
