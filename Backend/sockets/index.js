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
     rather than connected-then-idle, so a bad token can never sit in a room. */
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      return next();
    } catch {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(roomFor(socket.userId));
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

const getIO = () => io;

module.exports = { initSockets, emitToUser, getIO };
