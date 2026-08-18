/* Socket.IO realtime layer.
 *
 *  Handshake auth:
 *    client passes JWT in `auth.token` (or `Authorization` header).
 *    On success we attach the user id to `socket.user` and auto-join
 *    `user:<userId>` plus every `conv:<convId>` the user participates in.
 *
 *  Events from client:
 *    join_conversation  { conversationId }
 *    leave_conversation { conversationId }
 *    send_message       { conversationId, content, attachments? }   ack(message)
 *    typing             { conversationId, isTyping } — reserved for future
 *
 *  Events to client:
 *    new_message        full populated message
 *    conversation_updated { conversationId, lastMessage }
 */

const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const prisma = require('../db/prisma');
const { encryptMessage, decryptMessage } = require('../utils/messageCrypto');
const { withIds } = require('../utils/serializeIds');
const { filterPersonalInfo } = require('../utils/personalInfo');

let io = null;

const initSockets = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      // FRONTEND_URL covers prod; the localhost variants cover dev (Vite picks
      // any of these depending on whether the port is in use).
      origin: [
        process.env.FRONTEND_URL || 'http://localhost:5174',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174',
      ],
      credentials: true,
    },
  });

  // ── Auth handshake ──
  // Reject connections without a valid JWT so unauthenticated browsers
  // can't even open a socket, let alone subscribe to rooms. Also re-verify
  // the account still exists in the DB — a deleted/suspended user's socket is
  // rejected even while their JWT is technically still valid.
  io.use(async (socket, next) => {
    const token =
      socket.handshake?.auth?.token ||
      socket.handshake?.headers?.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return next(new Error('No auth token'));
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return next(new Error(`Auth failed: ${err.message}`));
    }
    try {
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, role: true, verified: true, suspended: true },
      });
      if (!user) return next(new Error('Account no longer exists.'));
      if (user.suspended) return next(new Error('Account suspended.'));
      if (!user.verified) return next(new Error('Email not verified.'));
      socket.user = { id: user.id, role: user.role };
      next();
    } catch (err) {
      console.error('Socket auth DB check failed:', err.message);
      next(new Error('Auth failed: internal error'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id;

    // Personal room so any other service can target this user directly
    // (e.g. notifications about matches, listings, etc. in the future).
    socket.join(`user:${userId}`);

    // Auto-join every conversation room the user is a participant in.
    try {
      const convs = await prisma.conversation.findMany({
        where: { participants: { some: { id: userId } } },
        select: { id: true },
      });
      convs.forEach((c) => socket.join(`conv:${c.id}`));
    } catch (err) {
      console.error('Failed to auto-join conversation rooms:', err.message);
    }

    // Explicit join — useful when a conversation is created mid-session.
    socket.on('join_conversation', ({ conversationId }) => {
      if (conversationId) socket.join(`conv:${conversationId}`);
    });

    socket.on('leave_conversation', ({ conversationId }) => {
      if (conversationId) socket.leave(`conv:${conversationId}`);
    });

    socket.on('send_message', async (payload, ack) => {
      try {
        const { conversationId, content, attachments } = payload || {};
        if (!conversationId) {
          return ack && ack({ ok: false, error: 'conversationId required' });
        }
        const hasContent = content && String(content).trim().length > 0;
        const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
        if (!hasContent && !hasAttachments) {
          return ack && ack({ ok: false, error: 'Message is empty' });
        }

        // Membership check — only participants can post into the room.
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: { participants: { select: { id: true } } },
        });
        if (!conversation) {
          return ack && ack({ ok: false, error: 'Conversation not found' });
        }
        if (!conversation.participants.some((p) => p.id === userId)) {
          return ack && ack({ ok: false, error: 'Not a participant' });
        }

        // PII filter before encryption (so the filter sees plaintext).
        const sanitized = hasContent ? filterPersonalInfo(content) : '';

        // Persist — content is encrypted with AES-256-GCM before it hits the DB.
        const populated = await prisma.message.create({
          data: {
            conversationId,
            senderId: userId,
            content: encryptMessage(sanitized),
            attachments: hasAttachments ? attachments : [],
          },
          include: {
            sender: { select: { id: true, name: true, email: true, role: true, avatar: true } },
          },
        });

        // Broadcast with plaintext content (decrypted back for receivers) and
        // `_id` filled in on the message + nested sender.
        const payloadToBroadcast = withIds({
          ...populated,
          content: decryptMessage(populated.content),
        });
        io.to(`conv:${conversationId}`).emit('new_message', payloadToBroadcast);

        // Lightweight conversation-list update for sidebars.
        io.to(`conv:${conversationId}`).emit('conversation_updated', {
          conversationId,
          lastMessage: payloadToBroadcast,
        });

        if (ack) ack({ ok: true, message: payloadToBroadcast });
      } catch (err) {
        console.error('send_message failed:', err);
        if (ack) ack({ ok: false, error: err.message });
      }
    });

    // Reserved for future typing indicator — server just relays.
    socket.on('typing', ({ conversationId, isTyping }) => {
      if (!conversationId) return;
      socket.to(`conv:${conversationId}`).emit('typing', {
        conversationId,
        userId,
        isTyping: !!isTyping,
      });
    });
  });

  return io;
};

const getIO = () => io;

module.exports = { initSockets, getIO };
