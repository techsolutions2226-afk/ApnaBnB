/* ─── Socket.IO — notifications only ───
 *
 * Deliberately minimal. The previous socket server carried chat, presence,
 * typing indicators and read receipts, and was removed with the messaging
 * system in b420f6c. This one exists for a single job: push a notification to
 * one user the moment it is written.
 *
 * The only room is `user:<id>`. There are no inbound events — the client never
 * emits, it only listens. Keeping the surface this small is what stops it
 * growing back into the system that was just deleted.
 * ─────────────────────────────────────────────── */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const prisma = require('../db/prisma');

let io = null;

const roomFor = (userId) => `user:${userId}`;

const initSockets = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5174',
      credentials: true,
    },
  });

  /* Authenticate the handshake. An unauthenticated socket is refused outright
     rather than connected-then-idle, so a bad token can never sit in a room.
     The account is re-checked against the DB so a revoked/suspended/deleted
     session (see authMiddleware.verifyToken) cannot keep a live socket. */
  io.use(async (socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) return next(new Error('Authentication required'));
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return next(new Error('Invalid token'));
    }
    try {
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, role: true, verified: true, suspended: true, deactivated: true, tokenVersion: true },
      });
      if (!user || !user.verified || user.suspended || user.deactivated) {
        return next(new Error('Session no longer valid'));
      }
      if (user.tokenVersion > 0 && (decoded.tokenVersion ?? 0) !== user.tokenVersion) {
        return next(new Error('Session revoked'));
      }
      socket.userId = user.id;
      socket.role = user.role;
      return next();
    } catch {
      return next(new Error('Session check failed'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(roomFor(socket.userId));
    /* Admins get a shared room so badge counts can be pushed to the panel
       the moment a new match/visit is written. */
    if (socket.role === 'admin') socket.join('admins');
  });

  console.log('Socket.IO ready (notifications)');
  return io;
};

/* Push to one user. Null-guarded and wrapped: with sockets down (or not yet
   initialised, as in tests and seeders) this is a no-op, so a delivery failure
   can never fail the request that wrote the notification. */
const emitToUser = (userId, event, payload) => {
  if (!io || !userId) return false;
  try {
    io.to(roomFor(userId)).emit(event, payload);
    return true;
  } catch (err) {
    console.error('Socket emit failed:', err.message);
    return false;
  }
};

/* Push to every connected admin (the `admins` room). Null-guarded the same
   way as emitToUser: fires only when sockets are initialised, so a delivery
   failure can never fail the request that triggered it. */
const emitToAdmins = (event, payload) => {
  if (!io) return false;
  try {
    io.to('admins').emit(event, payload);
    return true;
  } catch (err) {
    console.error('Socket emit to admins failed:', err.message);
    return false;
  }
};

/* Force-logout a user across every device they are connected on.

   Called when an admin deletes, suspends or deactivates an account. Tells the
   client to drop its local session (auth_token + current_user) before the
   socket disconnects, so the logout is instant and does not depend on the
   client's next REST call hitting a 401/403. Then disconnects every socket in
   that user's room so a muted-but-connected client cannot keep listening.

   Null-guarded like the emitters above: with sockets down this is a no-op, so
   the admin request that triggered it still completes. */
const kickUser = (userId, reason = 'account disabled') => {
  if (!io || !userId) return false;
  try {
    io.to(roomFor(userId)).emit('session:revoked', { reason });
    io.in(roomFor(userId)).disconnectSockets(true);
    return true;
  } catch (err) {
    console.error('Socket kick failed:', err.message);
    return false;
  }
};

const getIO = () => io;

module.exports = { initSockets, emitToUser, emitToAdmins, kickUser, getIO };
