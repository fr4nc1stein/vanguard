/**
 * lib/crypto.ts — Application-layer AES-GCM-256 encryption
 *
 * Uses the Web Crypto API (available in all edge runtimes and modern browsers).
 * The key is loaded from process.env.ENCRYPTION_KEY (64 hex chars = 32 bytes).
 * Each encryption call generates a fresh random 96-bit IV.
 *
 * Security notes:
 *  - AES-GCM provides both confidentiality and integrity (AEAD).
 *  - IV is unique per encryption (never reused with the same key).
 *  - Ciphertext and IV are stored separately; combine to decrypt.
 */

const ALGORITHM = 'AES-GCM';
const IV_BYTES   = 12; // 96-bit IV — optimal for GCM

// ── Hex utilities ─────────────────────────────────────────────────────────────
function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex string length');
  const buf   = new ArrayBuffer(hex.length / 2);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Key import ────────────────────────────────────────────────────────────────
async function importKey(keyHex: string): Promise<CryptoKey> {
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
      'Generate one with: openssl rand -hex 32'
    );
  }
  const keyBytes = hexToBytes(keyHex);
  return crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt'],
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface EncryptedPayload {
  ciphertext: string; // hex-encoded
  iv:         string; // hex-encoded
}

/**
 * Encrypts a UTF-8 string using AES-GCM-256.
 * Returns the ciphertext and IV as hex strings — store both in D1.
 */
export async function encryptText(
  plaintext: string,
  keyHex?: string,
): Promise<EncryptedPayload> {
  const encryptionKey = keyHex ?? process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
      'Generate one with: openssl rand -hex 32'
    );
  }
  const key     = await importKey(encryptionKey);
  const iv      = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encoded = new TextEncoder().encode(plaintext);
  const cipher  = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded);
  return {
    ciphertext: bytesToHex(cipher),
    iv:         bytesToHex(iv),
  };
}

/**
 * Decrypts a previously encrypted payload.
 * Throws if the key or ciphertext is invalid (GCM authentication failure).
 */
export async function decryptText(
  ciphertextHex: string,
  ivHex:         string,
  keyHex?: string,
): Promise<string> {
  const encryptionKey = keyHex ?? process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
      'Generate one with: openssl rand -hex 32'
    );
  }
  const key        = await importKey(encryptionKey);
  const iv         = hexToBytes(ivHex);
  const ciphertext = hexToBytes(ciphertextHex);
  const decrypted  = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

/**
 * Hashes a value (e.g. IP address) with SHA-256 for privacy-preserving storage.
 */
export async function hashValue(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest  = await crypto.subtle.digest('SHA-256', encoded);
  return bytesToHex(digest);
}
