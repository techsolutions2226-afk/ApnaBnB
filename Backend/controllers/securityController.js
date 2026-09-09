const bcrypt = require('bcrypt');
const prisma = require('../db/prisma');
const {
  createTotpSecret,
  buildTotpQrDataUrl,
  verifyTotp,
  generateEmailCode,
  createRecoveryCodes,
  findRecoveryCodeIndex,
  EMAIL_CODE_TTL_MS,
} = require('../utils/twoFactor');
const { sendTwoFactorCodeEmail, sendSecurityAlertEmail } = require('../utils/mailer');
const { logActivity } = require('../utils/activityLogger');

/* ─── securityController ───
   Everything behind Account → Login & security. Every route here is
   authenticated (see routes/securityRoutes.js) and every state-changing
   action re-checks the account password first: a stolen JWT alone must not
   be enough to turn 2FA off or delete the account.
*/

const MIN_PASSWORD_LENGTH = 8;

/* Setup secrets live here until the user proves they can generate a code
   from them. Storing an unconfirmed secret on the User row risks locking
   someone out if they abandon setup halfway. Keyed by user id, short TTL. */
const pendingTotpSetups = new Map();
const PENDING_TTL_MS = 10 * 60 * 1000;

const putPendingSetup = (userId, secret) => {
  pendingTotpSetups.set(userId, { secret, expiresAt: Date.now() + PENDING_TTL_MS });
};

const takePendingSetup = (userId) => {
  const entry = pendingTotpSetups.get(userId);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    pendingTotpSetups.delete(userId);
    return null;
  }
  return entry.secret;
};

// Opportunistic sweep so an abandoned setup cannot pile up in memory.
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of pendingTotpSetups) {
    if (entry.expiresAt < now) pendingTotpSetups.delete(id);
  }
}, PENDING_TTL_MS).unref();

/* Security mail is a courtesy, never a gate: a mail outage must not stop
   someone changing their password. */
const notify = (user, headline, detail) => {
  sendSecurityAlertEmail(user.email, headline, detail, user.name).catch(() => {});
};

const requirePassword = async (user, password) => {
  // Google-created accounts have no password — there is nothing to compare
  // against, so every "enter your current password" gate must reject cleanly.
  if (!user.password) return { ok: false, code: 'SOCIAL_ACCOUNT', message: 'This account has no password. Sign in with Google.' };
  if (!password) return { ok: false, code: 'PASSWORD_REQUIRED', message: 'Enter your current password.' };
  const match = await bcrypt.compare(String(password), user.password);
  if (!match) return { ok: false, code: 'WRONG_PASSWORD', message: 'That password is not correct.' };
  return { ok: true };
};

/* ── GET /api/security/overview ──
   What the Login & security page renders from. */
const getOverview = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        email: true,
        verified: true,
        authProvider: true,
        password: true,
        twoFactorEnabled: true,
        twoFactorMethod: true,
        twoFactorRecoveryCodes: true,
        loginAlertsEnabled: true,
        deactivated: true,
        updatedAt: true,
      },
    });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    res.status(200).json({
      email: user.email,
      emailVerified: user.verified,
      // Google-created accounts have no password; the Login & security page
      // uses this to hide the "change password" section for them.
      authProvider: user.authProvider || 'email',
      hasPassword: !!user.password,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorMethod: user.twoFactorMethod,
      // The codes themselves are never re-sent — only how many remain.
      recoveryCodesRemaining: user.twoFactorRecoveryCodes.length,
      loginAlertsEnabled: user.loginAlertsEnabled,
      deactivated: user.deactivated,
    });
  } catch (error) {
    next(error);
  }
};

/* ── PUT /api/security/password ── */
const changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || String(newPassword).length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      code: 'WEAK_PASSWORD',
      message: `Your new password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const check = await requirePassword(user, currentPassword);
    if (!check.ok) return res.status(400).json({ code: check.code, message: check.message });

    if (await bcrypt.compare(String(newPassword), user.password)) {
      return res.status(400).json({
        code: 'SAME_PASSWORD',
        message: 'Your new password must be different from your current one.',
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(String(newPassword), 10),
        // A password change invalidates any in-flight reset link.
        resetPasswordTokenHash: null,
        resetPasswordExpiresAt: null,
        // …and every session minted with the old password, including copies
        // on other devices: bump tokenVersion so stale JWTs are rejected.
        tokenVersion: { increment: 1 },
      },
    });

    notify(user, 'Your password was changed', 'Your account password was just updated.');
    logActivity({
      action: 'security.password_changed',
      entityType: 'user',
      entityId: user.id,
      req,
    }).catch(() => {});

    res.status(200).json({ message: 'Password updated.' });
  } catch (error) {
    next(error);
  }
};

/* ── PUT /api/security/login-alerts ── */
const setLoginAlerts = async (req, res, next) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ message: 'enabled must be true or false.' });
  }
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { loginAlertsEnabled: enabled },
    });
    res.status(200).json({ loginAlertsEnabled: enabled });
  } catch (error) {
    next(error);
  }
};

/* ── POST /api/security/2fa/setup ──
   Step 1 of enabling. For TOTP this returns a QR code; for email it sends a
   code. Nothing is enabled until /2fa/enable confirms a working code. */
const startTwoFactorSetup = async (req, res, next) => {
  const method = String(req.body.method || '').toLowerCase();
  if (!['totp', 'email'].includes(method)) {
    return res.status(400).json({ message: "method must be 'totp' or 'email'." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (user.twoFactorEnabled) {
      return res.status(409).json({
        code: 'ALREADY_ENABLED',
        message: 'Two-factor authentication is already on. Turn it off first to change method.',
      });
    }

    if (method === 'totp') {
      const secret = createTotpSecret();
      putPendingSetup(user.id, secret);
      const qrDataUrl = await buildTotpQrDataUrl(secret, user.email);
      return res.status(200).json({
        method: 'totp',
        // Shown so the user can type it in if scanning fails.
        secret,
        qrDataUrl,
      });
    }

    // Email method — prove they can receive mail at the account address.
    const code = generateEmailCode();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorCodeHash: await bcrypt.hash(code, 10),
        twoFactorCodeExpiresAt: new Date(Date.now() + EMAIL_CODE_TTL_MS),
        twoFactorCodeLastSentAt: new Date(),
      },
    });

    try {
      await sendTwoFactorCodeEmail(user.email, code, user.name);
    } catch {
      // Don't leave a live code behind for an email that never arrived.
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorCodeHash: null, twoFactorCodeExpiresAt: null },
      });
      return res.status(502).json({
        code: 'MAIL_FAILED',
        message: 'We could not send the code. Please try again shortly.',
      });
    }

    res.status(200).json({ method: 'email', sentTo: user.email });
  } catch (error) {
    next(error);
  }
};

/* ── POST /api/security/2fa/enable ──
   Step 2: confirm a code, store the method, hand back recovery codes. */
const enableTwoFactor = async (req, res, next) => {
  const method = String(req.body.method || '').toLowerCase();
  const code = String(req.body.code || '').trim();

  if (!['totp', 'email'].includes(method)) {
    return res.status(400).json({ message: "method must be 'totp' or 'email'." });
  }
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ code: 'BAD_CODE', message: 'Enter the 6-digit code.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.twoFactorEnabled) {
      return res.status(409).json({ code: 'ALREADY_ENABLED', message: 'Two-factor is already on.' });
    }

    let secretToStore = null;

    if (method === 'totp') {
      const pending = takePendingSetup(user.id);
      if (!pending) {
        return res.status(400).json({
          code: 'SETUP_EXPIRED',
          message: 'That setup session expired. Start again to get a fresh QR code.',
        });
      }
      if (!(await verifyTotp(pending, code))) {
        // Keep the pending secret so they can retry without rescanning.
        putPendingSetup(user.id, pending);
        return res.status(400).json({
          code: 'INVALID_CODE',
          message: "That code didn't match. Check your authenticator app and try again.",
        });
      }
      secretToStore = pending;
      pendingTotpSetups.delete(user.id);
    } else {
      const expired = !user.twoFactorCodeExpiresAt || user.twoFactorCodeExpiresAt < new Date();
      if (!user.twoFactorCodeHash || expired) {
        return res.status(400).json({
          code: 'CODE_EXPIRED',
          message: 'That code expired. Request a new one.',
        });
      }
      if (!(await bcrypt.compare(code, user.twoFactorCodeHash))) {
        return res.status(400).json({
          code: 'INVALID_CODE',
          message: "That code didn't match. Check your email and try again.",
        });
      }
    }

    const { plain, hashed } = await createRecoveryCodes();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorMethod: method,
        twoFactorSecret: secretToStore,
        twoFactorRecoveryCodes: hashed,
        twoFactorCodeHash: null,
        twoFactorCodeExpiresAt: null,
        // Enabling 2FA changes the trust boundary of every existing session.
        tokenVersion: { increment: 1 },
      },
    });

    notify(
      user,
      'Two-factor authentication is on',
      `Your account now asks for a second step at sign-in (${method === 'totp' ? 'authenticator app' : 'email code'}).`,
    );
    logActivity({
      action: 'security.2fa_enabled',
      entityType: 'user',
      entityId: user.id,
      meta: { method },
      req,
    }).catch(() => {});

    // The only time the plain recovery codes ever leave the server.
    res.status(200).json({
      twoFactorEnabled: true,
      method,
      recoveryCodes: plain,
    });
  } catch (error) {
    next(error);
  }
};

/* ── POST /api/security/2fa/disable ── */
const disableTwoFactor = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (!user.twoFactorEnabled) {
      return res.status(400).json({ code: 'NOT_ENABLED', message: 'Two-factor is not on.' });
    }

    const check = await requirePassword(user, req.body.password);
    if (!check.ok) return res.status(400).json({ code: check.code, message: check.message });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorMethod: null,
        twoFactorSecret: null,
        twoFactorRecoveryCodes: [],
        twoFactorChallengeHash: null,
        twoFactorChallengeExpiresAt: null,
        twoFactorChallengeAttempts: 0,
        twoFactorCodeHash: null,
        twoFactorCodeExpiresAt: null,
        // With 2FA off, sessions minted under the stricter guarantee (or while
        // the previous mode was active) should not silently keep working.
        tokenVersion: { increment: 1 },
      },
    });

    notify(
      user,
      'Two-factor authentication is off',
      'Your account no longer asks for a second step at sign-in.',
    );
    logActivity({
      action: 'security.2fa_disabled',
      entityType: 'user',
      entityId: user.id,
      req,
    }).catch(() => {});

    res.status(200).json({ twoFactorEnabled: false });
  } catch (error) {
    next(error);
  }
};

/* ── POST /api/security/2fa/recovery-codes ──
   Regenerate. Invalidates every previous code. */
const regenerateRecoveryCodes = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (!user.twoFactorEnabled) {
      return res.status(400).json({ code: 'NOT_ENABLED', message: 'Turn on two-factor first.' });
    }

    const check = await requirePassword(user, req.body.password);
    if (!check.ok) return res.status(400).json({ code: check.code, message: check.message });

    const { plain, hashed } = await createRecoveryCodes();
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorRecoveryCodes: hashed },
    });

    notify(
      user,
      'New recovery codes generated',
      'Your previous recovery codes no longer work.',
    );

    res.status(200).json({ recoveryCodes: plain });
  } catch (error) {
    next(error);
  }
};

/* ── POST /api/security/deactivate ──
   Reversible: the row and all its data stay, login is blocked, and public
   surfaces hide the account. Support can undo it. */
const deactivateAccount = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const check = await requirePassword(user, req.body.password);
    if (!check.ok) return res.status(400).json({ code: check.code, message: check.message });

    await prisma.user.update({
      where: { id: user.id },
      data: { deactivated: true, deactivatedAt: new Date() },
    });

    notify(
      user,
      'Your account was deactivated',
      'Your listings and profile are hidden. Contact support to reactivate.',
    );
    logActivity({
      action: 'security.account_deactivated',
      entityType: 'user',
      entityId: user.id,
      req,
    }).catch(() => {});

    res.status(200).json({ deactivated: true });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverview,
  changePassword,
  setLoginAlerts,
  startTwoFactorSetup,
  enableTwoFactor,
  disableTwoFactor,
  regenerateRecoveryCodes,
  deactivateAccount,
  // Exported for the login flow and tests.
  findRecoveryCodeIndex,
};
