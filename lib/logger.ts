type Level = 'debug' | 'info' | 'warn' | 'error';

interface LogFields {
  [k: string]: unknown;
  err?: unknown;
  durationMs?: number;
  route?: string;
  userId?: number | string;
}

function fmt(level: Level, msg: string, fields?: LogFields) {
  const rec: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...fields,
  };
  // Normalize err to string without leaking secrets
  if (rec.err instanceof Error) {
    rec.err = { name: (rec.err as Error).name, message: (rec.err as Error).message };
  }
  // Strip obvious secrets if someone accidentally logs them
  for (const k of Object.keys(rec)) {
    if (/token|password|secret|key/i.test(k) && typeof rec[k] === 'string') {
      const v = String(rec[k]);
      rec[k] = v.length > 8 ? v.slice(0, 4) + '***' : '***';
    }
  }
  const line = JSON.stringify(rec);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, fields?: LogFields) => {
    if (process.env.LOG_LEVEL === 'debug') fmt('debug', msg, fields);
  },
  info: (msg: string, fields?: LogFields) => fmt('info', msg, fields),
  warn: (msg: string, fields?: LogFields) => fmt('warn', msg, fields),
  error: (msg: string, fields?: LogFields) => fmt('error', msg, fields),
};

/** Wrap a handler to log duration + outcome — use in API routes. */
export async function withRequestLogging<T>(route: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    const res = await fn();
    logger.info('request ok', { route, durationMs: Date.now() - start });
    return res;
  } catch (err) {
    logger.error('request failed', { route, err, durationMs: Date.now() - start });
    throw err;
  }
}
