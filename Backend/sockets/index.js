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
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

// Same PII regex the REST controller uses — we re-run it on socket messages
// so going through WebSocket can't bypass the filter.
const personalInfoRegex =
  /(\d{10,}|\+[0-9]{1,4}[- .]?\d{6,}|\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,6}|(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9._-]+\.[a-zA-Z]{2,6})/g;

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
  // can't even open a socket, let alone subscribe to rooms.
  io.use((socket, next) => {
    const token =
      socket.handshake?.auth?.token ||
      socket.handshake?.headers?.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return next(new Error('No auth token'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: decoded.id, role: decoded.role };
      next();
    } catch (err) {
      next(new Error(`Auth failed: ${err.message}`));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id;

    // Personal room so any other service can target this user directly
    // (e.g. notifications about matches, listings, etc. in the future).
    socket.join(`user:${userId}`);

    // Auto-join every conversation room the user is a participant in.
    try {
      const convs = await Conversation.find({
        participants: userId,
      }).select('_id');
      convs.forEach((c) => socket.join(`conv:${c._id}`));
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
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          return ack && ack({ ok: false, error: 'Conversation not found' });
        }
        if (!conversation.participants.some((p) => p.toString() === userId)) {
          return ack && ack({ ok: false, error: 'Not a participant' });
        }

        // PII filter before encryption (so the filter sees plaintext).
        const sanitized = hasContent
          ? String(content).replace(personalInfoRegex, '[filtered]')
          : '';

        // Persist — Mongoose setter encrypts content with AES-256-GCM.
        const messageDoc = await Message.create({
          conversationId,
          sender: userId,
          content: sanitized,
          attachments: hasAttachments ? attachments : [],
        });

        // Re-fetch with populate so the broadcast carries sender info too.
        // toJSON() runs the getter → plaintext reaches every receiver.
        const populated = await Message.findById(messageDoc._id).populate(
          'sender',
          'name email role avatar',
        );

        const payloadToBroadcast = populated.toJSON();
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
