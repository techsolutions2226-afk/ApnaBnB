/* AES-256-GCM encryption helpers for messages at rest.
 *
 *   - Key comes from MESSAGE_ENC_KEY in .env (64 hex chars = 32 bytes)
 *   - IV is random 12 bytes per message (GCM standard)
 *   - AuthTag is 16 bytes — appended for tamper detection
 *   - Stored format:  "v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 *     The "v1:" prefix lets us migrate to a new scheme later without ambiguity.
 *
 * Plaintext goes in, encrypted blob comes out (and vice versa). Mongoose
 * setter/getter on Message.content does the transparent dance so controllers
 * never see ciphertext.
 */

const crypto = require('crypto');

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;
const VERSION = 'v1';

const loadKey = () => {
  const raw = process.env.MESSAGE_ENC_KEY;
  if (!raw) {
    throw new Error(
      'MESSAGE_ENC_KEY is not set in .env. Generate one with: '
      + 'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  const key = Buffer.from(raw, 'hex');
  if (key.length !== 32) {
    throw new Error(
      `MESSAGE_ENC_KEY must be 64 hex chars (32 bytes). Got ${key.length} bytes.`,
    );
  }
  return key;
};

/** Returns true when `value` already looks like our stored ciphertext format.
 *  Used to avoid double-encryption when documents are re-saved. */
const isEncrypted = (value) =>
  typeof value === 'string' && value.startsWith(`${VERSION}:`);

/** Encrypt plaintext → "v1:iv:tag:cipher" hex blob. */
const encryptMessage = (plaintext) => {
  if (plaintext === null || plaintext === undefined) return plaintext;
  const text = String(plaintext);
  if (isEncrypted(text)) return text; // idempotent
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, loadKey(), iv);
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
};

/** Decrypt our blob back to plaintext. Returns the input unchanged if it
 *  doesn't match the encrypted format — keeps the function safe to run on
 *  legacy plaintext rows during migration. */
const decryptMessage = (value) => {
  if (value === null || value === undefined) return value;
  const text = String(value);
  if (!isEncrypted(text)) return text;
  const parts = text.split(':');
  if (parts.length !== 4) return text;
  const [, ivHex, tagHex, cipherHex] = parts;
  try {
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    if (iv.length !== IV_LEN || tag.length !== TAG_LEN) return text;
    const decipher = crypto.createDecipheriv(ALGO, loadKey(), iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([
      decipher.update(Buffer.from(cipherHex, 'hex')),
      decipher.final(),
    ]);
    return dec.toString('utf8');
  } catch {
    // Tamper or wrong key — return placeholder rather than crashing the request.
    return '[unable to decrypt message]';
  }
};

module.exports = { encryptMessage, decryptMessage, isEncrypted };
