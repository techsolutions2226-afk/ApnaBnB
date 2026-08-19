/* Socket.IO realtime layer — WhatsApp-style chat + presence.
 *
 *  Handshake auth:
 *    client passes JWT in `auth.token` (or `Authorization` header).
 *    On success we attach the user id to `socket.user` and auto-join
 *    `user:<userId>` plus every `conv:<convId>` the user participates in.
 *
 *  Events from client:
 *    join_conversation  { conversationId }
 *    leave_conversation { conversationId }
 *    send_message       { conversationId, content?, attachments?,
 *                          type?, parentMessageId?, propertyId?,
 *                          location?, forwarded? }                ack(message)
 *    typing             { conversationId, isTyping }  (relayed, debounced by client)
 *    read_messages      { conversationId }             (bulk read on open)
 *
 *  Events to client:
 *    new_message        full populated message
 *    conversation_updated { conversationId, lastMessage }
 *    message_updated    { ...message }                 (edits/stars propagate)
 *    message_deleted    { messageId, conversationId, deletedAt }   (soft)
 *    message_hidden     { messageId, conversationId }
 *    message_read       { messageId, conversationId, readAt }
 *    message_reaction   { messageId, conversationId, reactions, reactorId }
 *    typing             { conversationId, userId, isTyping }
 *    presence           { userId, online, lastSeenAt? }
 */

const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const prisma = require('../db/prisma');
const { encryptMessage } = require('../utils/messageCrypto');
const { withIds } = require('../utils/serializeIds');
const { filterPersonalInfo } = require('../utils/personalInfo');
const { messageInclude, serializeMessage } = require('../utils/messageUtils');
const { presence } = require('./presence');

const TYPES = ['text', 'image', 'video', 'document', 'audio', 'location', 'property'];

let io = null;

const initSockets = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
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

    // Personal room so any other service can target this user directly.
    socket.join(`user:${userId}`);

    // Presence — join the online set (multiple tabs → count increments).
    presence.add(userId, socket.id);

    // Auto-join every conversation room the user participates in, remember the
    // list so we can notify partners on disconnect, and mark messages the
    // other party sent as "delivered" now that this user is reachable.
    let convIds = [];
    try {
      const convs = await prisma.conversation.findMany({
        where: { participants: { some: { id: userId } } },
        select: { id: true, participants: { select: { id: true } } },
      });
      convIds = convs.map((c) => c.id);
      convs.forEach((c) => socket.join(`conv:${c.id}`));

      // Anything unread from the other party is now delivered: stamp it.
      if (convIds.length > 0) {
        await prisma.message.updateMany({
          where: {
            conversationId: { in: convIds },
            senderId: { not: userId },
            read: false,
            deliveredAt: null,
          },
          data: { deliveredAt: new Date() },
        });
      }

      // Tell the user's conversation partners (and their own other tabs) that
      // this user is online now.
      const partners = new Set();
      convs.forEach((c) =>
        c.participants.forEach((p) => {
          if (p.id !== userId) partners.add(p.id);
        }),
      );
      const evt = { userId, online: true };
      socket.to(`user:${userId}`).emit('presence', evt);
      [...partners].forEach((pid) => io.to(`user:${pid}`).emit('presence', evt));
    } catch (err) {
      console.error('Socket connect setup failed:', err.message);
    }
    socket.convs = convIds;

    // Explicit join — useful when a conversation is created mid-session.
    socket.on('join_conversation', ({ conversationId }) => {
      if (conversationId) socket.join(`conv:${conversationId}`);
    });

    socket.on('leave_conversation', ({ conversationId }) => {
      if (conversationId) socket.leave(`conv:${conversationId}`);
    });

    // Bulk "I opened this chat" — batch-mark messages read in real time.
    socket.on('read_messages', async ({ conversationId }, ack) => {
      if (!conversationId) return ack && ack({ ok: false, error: 'conversationId required' });
      try {
        const res = await prisma.message.updateMany({
          where: {
            conversationId,
            senderId: { not: userId },
            read: false,
            conversation: { is: { participants: { some: { id: userId } } } },
          },
          data: { read: true, readAt: new Date() },
        });
        const ids = await prisma.message.findMany({
          where: { conversationId, senderId: { not: userId } },
          select: { id: true },
          orderBy: { createdAt: 'desc' },
          take: res.count || 50,
        });
        const readAt = new Date();
        ids.forEach((m) =>
          io.to(`conv:${conversationId}`).emit('message_read', {
            messageId: m.id,
            conversationId,
            readAt: readAt.toISOString(),
          }),
        );
        if (ack) ack({ ok: true, count: res.count });
      } catch (err) {
        console.error('read_messages failed:', err.message);
        if (ack) ack({ ok: false, error: err.message });
      }
    });

    socket.on('send_message', async (payload, ack) => {
      try {
        const original = { ...(payload || {}) };
        const conversationId = original.conversationId;
        if (!conversationId) return ack && ack({ ok: false, error: 'conversationId required' });

        let type = original.type || 'text';
        if (!TYPES.includes(type)) type = 'text';
        const attachments = Array.isArray(original.attachments) ? original.attachments : [];
        const hasContent = original.content && String(original.content).trim().length > 0;
        const hasAttachments = attachments.length > 0;
        const isLocation = type === 'location' && original.location;
        const isProperty = type === 'property' && original.propertyId;
        if (!hasContent && !hasAttachments && !isLocation && !isProperty) {
          return ack && ack({ ok: false, error: 'Message is empty' });
        }
        // Infer a concrete type for attachment-only sends.
        if (!hasContent && hasAttachments && (type === 'text' || !original.type)) {
          const first = attachments[0];
          if (first.type === 'image') type = 'image';
          else if (first.type === 'audio' || first.type === 'voice') type = 'audio';
          else if (first.type === 'video') type = 'video';
          else type = 'document';
        }

        // Membership check — only participants can post into the room.
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: { participants: { select: { id: true } } },
        });
        if (!conversation) return ack && ack({ ok: false, error: 'Conversation not found' });
        if (!conversation.participants.some((p) => p.id === userId)) {
          return ack && ack({ ok: false, error: 'Not a participant' });
        }

        // Reply target must live in the SAME conversation.
        if (original.parentMessageId) {
          const parent = await prisma.message.findUnique({
            where: { id: original.parentMessageId },
            select: { id: true, conversationId: true },
          });
          if (!parent || parent.conversationId !== conversationId) {
            return ack && ack({ ok: false, error: 'Reply target not in this conversation' });
          }
        }

        // Shared property must exist.
        if (isProperty) {
          const exists = await prisma.property.findUnique({
            where: { id: original.propertyId },
            select: { id: true },
          });
          if (!exists) return ack && ack({ ok: false, error: 'Property not found' });
        }

        // Mark as delivered to any online participant (other than the sender).
        const otherIds = conversation.participants
          .map((p) => p.id)
          .filter((id) => id !== userId);
        const deliveredAt = otherIds.some((id) => presence.isOnline(id))
          ? new Date()
          : null;

        const sanitized = hasContent ? filterPersonalInfo(String(original.content)) : '';

        // Persist — content is encrypted with AES-256-GCM before it hits the DB.
        const created = await prisma.message.create({
          data: {
            conversationId,
            senderId: userId,
            type,
            content: hasContent ? encryptMessage(sanitized) : '',
            attachments,
            parentMessageId: original.parentMessageId || null,
            propertyId: isProperty ? original.propertyId : null,
            location: isLocation ? original.location : null,
            forwarded: !!original.forwarded,
            deliveredAt,
          },
        });

        // Re-read with sender/parent/property so the payload is complete.
        const populated = await prisma.message.findUnique({
          where: { id: created.id },
          include: messageInclude,
        });
        if (!populated) return ack && ack({ ok: false, error: 'Message could not be loaded' });

        const payloadToBroadcast = withIds({
          ...serializeMessage(populated),
          delivered: !!deliveredAt,
        });
        io.to(`conv:${conversationId}`).emit('new_message', payloadToBroadcast);
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

    // Typing relay — the client owns the debounce; the server just forwards.
    socket.on('typing', ({ conversationId, isTyping }) => {
      if (!conversationId) return;
      socket.to(`conv:${conversationId}`).emit('typing', {
        conversationId,
        userId,
        isTyping: !!isTyping,
      });
    });

    socket.on('disconnect', async () => {
      const wentOffline = presence.remove(userId, socket.id);
      const convs = socket.convs || [];
      if (wentOffline) {
        const lastSeenAt = new Date();
        try {
          await prisma.user.update({
            where: { id: userId },
            data: { lastSeenAt },
          });
        } catch (err) {
          console.error('Failed to persist lastSeenAt:', err.message);
        }
        const evt = { userId, online: false, lastSeenAt: lastSeenAt.toISOString() };
        // tell the user's conversation partners they're now offline
        try {
          const convRows = await prisma.conversation.findMany({
            where: { id: { in: convs } },
            select: { participants: { select: { id: true } } },
          });
          const partners = new Set();
          convRows.forEach((c) =>
            c.participants.forEach((p) => {
              if (p.id !== userId) partners.add(p.id);
            }),
          );
          [...partners].forEach((pid) => io.to(`user:${pid}`).emit('presence', evt));
        } catch (err) {
          console.error('Presence-offline notify failed:', err.message);
        }
      }
    });
  });

  return io;
};

const getIO = () => io;

module.exports = { initSockets, getIO };