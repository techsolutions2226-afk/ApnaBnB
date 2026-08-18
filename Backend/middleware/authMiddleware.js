const jwt = require('jsonwebtoken');
const prisma = require('../db/prisma');

// Sessions are stateless JWTs, so a "deleted user" still holds a technically
// valid token until it expires. The only way to make a deletion take effect
// immediately is to re-verify the account against the DB on EVERY protected
// request — a missing row (admin deleted the user) or a row that is no longer
// usable (suspended / unverified) rejects the token on the spot.
const loadActiveUser = async (userId) =>
  prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, verified: true, suspended: true },
  });

// Middleware to verify user token AND that the account still exists/usable.
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please log in again.' });
    }
    return res.status(403).json({ message: 'Invalid token.' });
  }

  try {
    const user = await loadActiveUser(decoded.id);

    // Account was deleted while the session was still valid → reject it.
    if (!user) {
      return res.status(401).json({
        code: 'USER_NOT_FOUND',
        message: 'Account no longer exists. Please log in again.',
      });
    }

    // Suspended users already can't log in; make sure an old token can't
    // bypass that, either (login-only checks are useless once a session exists).
    if (user.suspended) {
      return res.status(403).json({
        code: 'ACCOUNT_SUSPENDED',
        message: 'This account has been suspended. Contact support.',
      });
    }

    if (!user.verified) {
      return res.status(403).json({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email first.',
      });
    }

    // Attach the DB role, never the JWT role, so role changes (e.g. admin
    // demotes a user) take effect immediately instead of on next login.
    req.user = { id: user.id, role: user.role };
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = verifyToken;