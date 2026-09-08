import { z } from 'zod';

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']).optional().default('user'),
  content: z.string().max(5000).optional().default(''),
  text: z.string().max(5000).optional(),
});

export const chatSaveSchema = z.object({
  messages: z.array(chatMessageSchema).max(200).optional().default([]),
  step: z.string().min(1).max(100).optional().default('name'),
  data: z.record(z.string(), z.unknown()).optional().default({}),
  memory: z.record(z.string(), z.unknown()).optional(),
});

/** Chat turn sent to the LLM field extractor, plus what's already collected. */
export const extractRequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  current: z
    .object({
      name: z.string().max(200).optional(),
      subject: z.string().max(200).optional(),
      years: z.string().max(20).optional(),
      bio: z.string().max(2000).optional(),
      courses: z.array(z.string().max(200)).max(50).optional(),
      quote: z.string().max(1000).optional(),
      achievements: z.string().max(2000).optional(),
      email: z.string().max(320).optional(),
      phone: z.string().max(60).optional(),
    })
    .optional()
    .default({}),
});

export const deployBodySchema = z.object({
  name: z.string().trim().max(100).optional(),
});

export const historySaveSchema = z
  .record(z.string(), z.unknown())
  .refine((v) => v !== null && typeof v === 'object' && !Array.isArray(v), {
    message: 'Invalid payload',
  });

/** Site content doc: plain object of sections; keys bounded to stop key-spam. */
export const contentSchema = z
  .record(z.string().min(1).max(100), z.unknown())
  .refine((v) => v !== null && typeof v === 'object' && !Array.isArray(v), {
    message: 'Invalid content payload',
  })
  .refine((v) => Object.keys(v).length <= 100, {
    message: 'Too many content sections',
  });

export function byteSizeOf(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8');
  } catch {
    return 0;
  }
}

/** Reject absurdly large payloads before they hit the DB (DoS guard). */
export const MAX_CHAT_BYTES = 500_000; // ~500KB
export const MAX_HISTORY_BYTES = 500_000;
export const MAX_CONTENT_BYTES = 1_000_000; // ~1MB content doc
