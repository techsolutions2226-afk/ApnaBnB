const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { generateSecret, generate, verify, generateURI } = require('otplib');
const QRCode = require('qrcode');

/* ─── twoFactor.js ───
   Shared helpers for both 2FA methods.

   A note on the otplib version: v13 is a rewrite. `verify()` is ASYNC and
   returns a result OBJECT ({ valid, delta }), not a boolean — so `if (verify(...))`
   would pass for every code, because any object is truthy. `verifyTotp` below
   exists to force that through a real boolean.

   `epoch` and `epochTolerance` are in SECONDS, not milliseconds.
*/

// One 30-second step either side, so a code typed as it rolls over still
// works and modest device clock drift is tolerated. Wider than this starts
// meaningfully extending the window an intercepted code stays usable.
const TOTP_TOLERANCE_SECONDS = 30;

const CHALLENGE_TTL_MS = 10 * 60 * 1000;   // login must finish within 10 min
const EMAIL_CODE_TTL_MS = 5 * 60 * 1000;   // matches the signup OTP TTL
const MAX_CHALLENGE_ATTEMPTS = 5;
const RECOVERY_CODE_COUNT = 10;

const ISSUER = 'ApnaBnB';

/* ── TOTP (authenticator apps) ── */

const createTotpSecret = () => generateSecret();

/* The otpauth:// URI an authenticator app scans. */
const buildTotpUri = (secret, accountLabel) =>
  generateURI({ secret, label: accountLabel, issuer: ISSUER });

const buildTotpQrDataUrl = async (secret, accountLabel) =>
  QRCode.toDataURL(buildTotpUri(secret, accountLabel), {
    width: 240,
    margin: 1,
  });

/* Returns a real boolean. See the note above about v13's result object. */
const verifyTotp = async (secret, token) => {
  if (!secret || !/^\d{6}$/.test(String(token || ''))) return false;
  try {
    const result = await verify({
      secret,
      token: String(token),
      epochTolerance: TOTP_TOLERANCE_SECONDS,
    });
    return result?.valid === true;
  } catch {
    return false;
  }
};

/* Used only to prove a freshly generated secret works before we store it. */
const currentTotp = async (secret) => generate({ secret });

/* ── Email codes ── */

const generateEmailCode = () =>
  String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

/* ── Recovery codes ── */

/* Human-friendly, unambiguous alphabet — no O/0 or I/1 to mistype. */
const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateRecoveryCode = () => {
  const pick = () =>
    RECOVERY_ALPHABET[crypto.randomInt(0, RECOVERY_ALPHABET.length)];
  const block = () => Array.from({ length: 5 }, pick).join('');
  return `${block()}-${block()}`;
};

/* Returns { plain, hashed } — `plain` is shown to the user exactly once. */
const createRecoveryCodes = async (count = RECOVERY_CODE_COUNT) => {
  const plain = Array.from({ length: count }, generateRecoveryCode);
  const hashed = await Promise.all(plain.map((code) => bcrypt.hash(code, 10)));
  return { plain, hashed };
};

const normaliseRecoveryCode = (input) =>
  String(input || '').trim().toUpperCase().replace(/\s+/g, '');

/* Finds which stored hash a submitted code matches.
   Returns the index, or -1. Caller burns that entry. */
const findRecoveryCodeIndex = async (submitted, hashes) => {
  const candidate = normaliseRecoveryCode(submitted);
  if (!candidate) return -1;
  for (let i = 0; i < hashes.length; i += 1) {
    // Sequential rather than Promise.all: bcrypt is deliberately slow and
    // firing 10 at once just spikes the event loop for no gain.
    if (await bcrypt.compare(candidate, hashes[i])) return i;
  }
  return -1;
};

/* ── Login challenge ──
   Issued after the password check passes. The raw token goes to the client;
   only its sha256 is stored, so a leaked DB row cannot be replayed. */

const createChallengeToken = () => crypto.randomBytes(32).toString('hex');

const hashChallengeToken = (token) =>
  crypto.createHash('sha256').update(String(token)).digest('hex');

module.exports = {
  TOTP_TOLERANCE_SECONDS,
  CHALLENGE_TTL_MS,
  EMAIL_CODE_TTL_MS,
  MAX_CHALLENGE_ATTEMPTS,
  RECOVERY_CODE_COUNT,
  createTotpSecret,
  buildTotpUri,
  buildTotpQrDataUrl,
  verifyTotp,
  currentTotp,
  generateEmailCode,
  createRecoveryCodes,
  normaliseRecoveryCode,
  findRecoveryCodeIndex,
  createChallengeToken,
  hashChallengeToken,
};
