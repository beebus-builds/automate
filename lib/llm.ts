/**
 * Minimal Ollama client for JSON-schema-constrained completions.
 *
 * Every failure path returns null rather than throwing: callers are expected to
 * fall back to deterministic parsing, so a missing/slow/broken Ollama must
 * degrade the experience instead of breaking the chat.
 */

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * After a failure, stop calling Ollama for a while. OLLAMA_HOST is commonly set
 * while the daemon isn't running, and without this every chat turn would stall
 * for the full timeout before falling back.
 */
const COOLDOWN_MS = 60_000;
let cooldownUntil = 0;

export function llmHost(): string {
  return (process.env.OLLAMA_HOST || '').replace(/\/+$/, '');
}

export function llmEnabled(): boolean {
  return llmHost().length > 0 && Date.now() >= cooldownUntil;
}

export async function chatJson<T = unknown>(opts: {
  system: string;
  user: string;
  /** JSON Schema the model's output is constrained to. */
  format: Record<string, unknown>;
  timeoutMs?: number;
}): Promise<T | null> {
  const host = llmHost();
  if (!host || Date.now() < cooldownUntil) return null;

  try {
    const res = await fetch(`${host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      body: JSON.stringify({
        model: process.env.OLLAMA_CHAT_MODEL || 'qwen3:8b',
        stream: false,
        format: opts.format,
        options: { temperature: 0 },
        messages: [
          { role: 'system', content: opts.system },
          { role: 'user', content: opts.user },
        ],
      }),
    });
    if (!res.ok) return fail();
    const body = await res.json();
    const content: string = body?.message?.content ?? '';
    if (!content.trim()) return fail();
    return JSON.parse(content) as T;
  } catch {
    return fail();
  }
}

function fail(): null {
  cooldownUntil = Date.now() + COOLDOWN_MS;
  return null;
}
