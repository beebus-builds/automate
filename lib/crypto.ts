import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12; // 96-bit for GCM
const TAG_LEN = 16;

/**
 * AES-256-GCM encrypt/decrypt for secrets at rest (e.g. vercel_token).
 * Key: CSRF_SECRET or ENCRYPTION_KEY or DATABASE_URL derived (32 bytes via sha256).
 * In prod set ENCRYPTION_KEY as 64 hex chars (32 bytes).
 * Ciphertext format: iv(12) + tag(16) + ciphertext — all hex.
 */

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY || process.env.CSRF_SECRET || process.env.DATABASE_URL || 'fallback-key-not-for-prod-please-set-ENCRYPTION_KEY';
  // If raw is 64 hex chars, use directly; else derive 32 bytes via sha256
  if (/^[0-9a-f]{64}$/i.test(raw.trim())) {
    return Buffer.from(raw.trim(), 'hex');
  }
  return crypto.createHash('sha256').update(raw).digest(); // 32 bytes
}

export function encryptSecret(plaintext: string): string {
  if (!plaintext) return '';
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // store as hex: iv + tag + ciphertext
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + enc.toString('hex');
}

export function decryptSecret(ciphertext: string): string {
  if (!ciphertext) return '';
  // Legacy plaintext (not yet encrypted) — detect by absence of colons/hex lengths
  if (!ciphertext.includes(':')) return ciphertext;
  const parts = ciphertext.split(':');
  if (parts.length !== 3) return ciphertext; // corrupted — return as-is to avoid crash
  try {
    const key = getKey();
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const data = Buffer.from(parts[2], 'hex');
    if (iv.length !== IV_LEN || tag.length !== TAG_LEN) return ciphertext;
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString('utf8');
  } catch {
    // Decrypt failed (key rotated?) — return original so caller can handle (e.g. treat as empty)
    return '';
  }
}

export function isEncrypted(value: string): boolean {
  if (!value || !value.includes(':')) return false;
  const parts = value.split(':');
  return parts.length === 3 && /^[0-9a-f]+$/i.test(parts[0]) && /^[0-9a-f]+$/i.test(parts[1]);
}
