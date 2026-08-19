const prisma = require('../db/prisma');
const { encryptMessage } = require('../utils/messageCrypto');
const { getIO } = require('../sockets');
const { withIds } = require('../utils/serializeIds');
const { filterPersonalInfo } = require('../utils/personalInfo');
const { messageInclude, serializeMessage } = require('../utils/messageUtils');
const { presence } = require('../sockets/presence');

const MESSAGE_TYPES = ['text', 'image', 'video', 'document', 'audio', 'location', 'property'];

// Emit an event only when the socket layer is live.
const emit = (event, payload) => {
  const io = getIO();
  if (io) io.to(`conv:${payload.conversationId}`).emit(event, payload);
};

const emitToUser = (event, payload) => {
  const io = getIO();
  if (io) io.to(`user:${payload.userId}`).emit(event, payload);
};

const notifyConversationUpdated = (conversationId, messagePayload) => {
  emit('conversation_updated', { conversationId, lastMessage: messagePayload });
};

// Send a message via REST (fallback for clients without an active socket).
const sendMessage = async (req, res, next) => {
  const { conversationId, content, attachments, type, parentMessageId, propertyId, location, forwarded } = req.body;

  let kind = type || 'text';
  if (!MESSAGE_TYPES.includes(kind)) kind = 'text';
  const atts = Array.isArray(attachments) ? attachments : [];
  const hasContent = content && String(content).trim().length > 0;
  const hasAttachments = atts.length > 0;
  const isLocation = kind === 'location' && !!location;
  const isProperty = kind === 'property' && !!propertyId;
  if (!conversationId || (!hasContent && !hasAttachments && !isLocation && !isProperty)) {
    return res.status(400).json({ message: 'Conversation ID and message payload are required.' });
  }
  if (!hasContent && hasAttachments && (kind === 'text' || !type)) {
    const first = atts[0];
    if (first.type === 'image') kind = 'image';
    else if (first.type === 'audio' || first.type === 'voice') kind = 'audio';
    else if (first.type === 'video') kind = 'video';
    else kind = 'document';
  }

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: { select: { id: true } } },
    });
    if (!conversation) return res.status(404).json({ message: 'Conversation not found.' });
    if (!conversation.participants.some((p) => p.id === req.user.id)) {
      return res.status(403).json({ message: 'You are not authorized to send messages in this conversation.' });
    }

    if (parentMessageId) {
      const parent = await prisma.message.findUnique({
        where: { id: parentMessageId },
        select: { id: true, conversationId: true },
      });
      if (!parent || parent.conversationId !== conversationId) {
        return res.status(400).json({ message: 'Reply target is not in this conversation.' });
      }
    }

    if (isProperty) {
      const exists = await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true } });
      if (!exists) return res.status(404).json({ message: 'Property not found.' });
    }

    const otherIds = conversation.participants.map((p) => p.id).filter((id) => id !== req.user.id);
    const deliveredAt = otherIds.some((id) => presence.isOnline(id)) ? new Date() : null;
    const sanitizedContent = hasContent ? filterPersonalInfo(content) : '';

    const created = await prisma.message.create({
      data: {
        conversationId,
        senderId: req.user.id,
        type: kind,
        content: hasContent ? encryptMessage(sanitizedContent) : '',
        attachments: atts,
        parentMessageId: parentMessageId || null,
        propertyId: isProperty ? propertyId : null,
        location: isLocation ? location : null,
        forwarded: !!forwarded,
        deliveredAt,
      },
    });

    const populated = await prisma.message.findUnique({ where: { id: created.id }, include: messageInclude });
    const payload = withIds({ ...serializeMessage(populated), delivered: !!deliveredAt });

    // Broadcast exactly like a socket send when the socket layer is live.
    if (getIO()) {
      emit('new_message', payload);
      notifyConversationUpdated(conversationId, payload);
    }

    res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
};

// Get messages in a conversation, oldest → newest (content decrypted).
// Supports cursor pagination via `before` + `limit`; without `before` it keeps
// the legacy behaviour of returning the full list so older callers still work.
// Messages the requesting user hid with "delete for me" are excluded.
const getMessages = async (req, res, next) => {
  const { conversationId } = req.params;
  const { before, limit } = req.query;

  try {
    const membership = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: { select: { id: true } } },
    });
    if (!membership) return res.status(404).json({ message: 'Conversation not found.' });
    if (!membership.participants.some((p) => p.id === req.user.id)) {
      return res.status(403).json({ message: 'You are not a participant in this conversation.' });
    }

    const where = {
      conversationId,
      NOT: { deletedForMe: { has: req.user.id } },
    };
    if (before) {
      where.createdAt = { lt: new Date(before) };
    }

    const take = limit ? Math.min(parseInt(limit, 10) || 50, 100) : undefined;
    const got = await prisma.message.findMany({
      where,
      include: messageInclude,
      orderBy: { createdAt: 'desc' },
      take: take ? take + 1 : undefined,
    });

    let hasMore = false;
    if (take) {
      if (got.length > take) {
        got.pop();
        hasMore = true;
      }
    }

    const ascending = got.reverse();
    const plain = ascending.map((m) => serializeMessage(m));

    if (before) {
      const oldest = plain[0];
      return res.status(200).json({
        messages: plain,
        hasMore,
        nextBefore: oldest ? oldest.createdAt : null,
      });
    }
    res.status(200).json(plain);
  } catch (error) {
    next(error);
  }
};

// Edit a message (mark as edited so the UI can show the "edited" tag).
const updateMessage = async (req, res, next) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content || !String(content).trim()) {
    return res.status(400).json({ message: 'Message content is required.' });
  }

  try {
    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) return res.status(404).json({ message: 'Message not found.' });
    if (message.senderId !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit your own messages.' });
    }
    if (message.deletedAt) {
      return res.status(400).json({ message: 'Deleted messages cannot be edited.' });
    }

    const sanitizedContent = filterPersonalInfo(content);
    const now = new Date();
    const updated = await prisma.message.update({
      where: { id },
      data: { content: encryptMessage(sanitizedContent), edited: true, editedAt: now },
      include: messageInclude,
    });

    const payload = withIds(serializeMessage(updated));
    emit('message_updated', payload);
    notifyConversationUpdated(message.conversationId, payload);

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

// Delete a message "for everyone" — SOFT delete (additive). The row stays for
// admin audit; every participant sees "This message was deleted" instead of the
// content. Sender-only, matching the previous hard-delete authorization.
const deleteMessage = async (req, res, next) => {
  const { id } = req.params;

  try {
    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) return res.status(404).json({ message: 'Message not found.' });
    if (message.senderId !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own messages.' });
    }
    if (message.deletedAt) {
      return res.status(400).json({ message: 'Message is already deleted.' });
    }

    const deletedAt = new Date();
    await prisma.message.update({ where: { id }, data: { deletedAt } });

    const io = getIO();
    if (io) {
      io.to(`conv:${message.conversationId}`).emit('message_deleted', {
        messageId: id,
        conversationId: message.conversationId,
        deletedAt: deletedAt.toISOString(),
      });
    }

    res.status(200).json({ message: 'Message deleted.', messageId: id, deletedAt: deletedAt.toISOString() });
  } catch (error) {
    next(error);
  }
};

// Mark a message as read (sets readAt so the sender's "Message info" works).
const markMessageAsRead = async (req, res, next) => {
  const { id } = req.params;

  try {
    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) return res.status(404).json({ message: 'Message not found.' });

    const conversation = await prisma.conversation.findUnique({
      where: { id: message.conversationId },
      include: { participants: { select: { id: true } } },
    });
    if (!conversation || !conversation.participants.some((p) => p.id === req.user.id)) {
      return res.status(403).json({ message: 'You are not a participant in this conversation.' });
    }

    const readAt = new Date();
    const updated = await prisma.message.update({
      where: { id },
      data: { read: true, readAt },
      include: messageInclude,
    });

    const io = getIO();
    if (io) {
      io.to(`conv:${message.conversationId}`).emit('message_read', {
        messageId: id,
        conversationId: message.conversationId,
        readAt: readAt.toISOString(),
      });
    }

    res.status(200).json(withIds(serializeMessage(updated)));
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Message not found.' });
    }
    next(error);
  }
};

// Get unread message count in a conversation
const getUnreadCount = async (req, res, next) => {
  const { conversationId } = req.params;

  try {
    const count = await prisma.message.count({
      where: {
        conversationId,
        read: false,
        senderId: { not: req.user.id },
        conversation: { is: { participants: { some: { id: req.user.id } } } },
      },
    });

    res.status(200).json({ conversationId, unreadCount: count });
  } catch (error) {
    next(error);
  }
};

// Mark multiple messages as read
const markMultipleAsRead = async (req, res, next) => {
  const { messageIds } = req.body;

  if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
    return res.status(400).json({ message: 'Message IDs array is required.' });
  }

  try {
    const readAt = new Date();
    const result = await prisma.message.updateMany({
      where: {
        id: { in: messageIds },
        conversation: { is: { participants: { some: { id: req.user.id } } } },
      },
      data: { read: true, readAt },
    });

    if (result.count === 0) {
      return res.status(403).json({ message: 'No messages found, or you are not a participant.' });
    }

    const io = getIO();
    if (io) {
      const sample = await prisma.message.findFirst({
        where: { id: { in: messageIds } },
        select: { conversationId: true },
      });
      if (sample) {
        messageIds.forEach((id) =>
          io.to(`conv:${sample.conversationId}`).emit('message_read', {
            messageId: id,
            conversationId: sample.conversationId,
            readAt: readAt.toISOString(),
          }),
        );
      }
    }

    res.status(200).json({ message: `${result.count} messages marked as read.`, modifiedCount: result.count });
  } catch (error) {
    next(error);
  }
};

// "Delete for me" — the requesting user hides the message from their own view.
const hideMessage = async (req, res, next) => {
  const { id } = req.params;

  try {
    const message = await prisma.message.findUnique({
      where: { id },
      select: { id: true, conversationId: true, deletedForMe: true },
    });
    if (!message) return res.status(404).json({ message: 'Message not found.' });

    const conversation = await prisma.conversation.findUnique({
      where: { id: message.conversationId },
      include: { participants: { select: { id: true } } },
    });
    if (!conversation || !conversation.participants.some((p) => p.id === req.user.id)) {
      return res.status(403).json({ message: 'You are not part of this conversation.' });
    }

    if (!message.deletedForMe.includes(req.user.id)) {
      await prisma.message.update({ where: { id }, data: { deletedForMe: { push: req.user.id } } });
    }

    const io = getIO();
    if (io) {
      io.to(`user:${req.user.id}`).emit('message_hidden', {
        messageId: id,
        conversationId: message.conversationId,
      });
    }

    res.status(200).json({ message: 'Message hidden.' });
  } catch (error) {
    next(error);
  }
};

// ── Reactions ─────────────────────────────────────────────────────────────
// reactions is a JSON map { userId: "emoji" }. PUT with no/empty emoji removes
// the caller's reaction; otherwise it sets/changes it.
const setReaction = async (req, res, next) => {
  const { id } = req.params;
  const { emoji } = req.body;

  try {
    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) return res.status(404).json({ message: 'Message not found.' });

    const conversation = await prisma.conversation.findUnique({
      where: { id: message.conversationId },
      include: { participants: { select: { id: true } } },
    });
    if (!conversation || !conversation.participants.some((p) => p.id === req.user.id)) {
      return res.status(403).json({ message: 'You are not a participant in this conversation.' });
    }
    if (message.deletedAt) {
      return res.status(400).json({ message: 'Deleted messages cannot be reacted to.' });
    }

    const current = typeof message.reactions === 'object' && message.reactions ? message.reactions : {};
    const next = { ...current };
    const cleanEmoji = typeof emoji === 'string' && emoji.trim() ? emoji.trim() : '';
    if (!cleanEmoji) {
      delete next[req.user.id];
    } else {
      next[req.user.id] = cleanEmoji;
    }

    const updated = await prisma.message.update({
      where: { id },
      data: { reactions: next },
      include: messageInclude,
    });

    const payload = withIds(serializeMessage(updated));
    const io = getIO();
    if (io) emit('message_reaction', {
      messageId: id,
      conversationId: message.conversationId,
      reactions: next,
      reactorId: req.user.id,
    });
    // Keep the sidebar last-message preview in sync (reactions rarely there,
    // but harmless) and let everyone get the full m: the _updated event covers
    // it if this message is being displayed.
    if (io) emit('message_updated', payload);

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

// ── Star / save ───────────────────────────────────────────────────────────
const toggleStar = async (req, res, next) => {
  const { id } = req.params;

  try {
    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) return res.status(404).json({ message: 'Message not found.' });

    const conversation = await prisma.conversation.findUnique({
      where: { id: message.conversationId },
      include: { participants: { select: { id: true } } },
    });
    if (!conversation || !conversation.participants.some((p) => p.id === req.user.id)) {
      return res.status(403).json({ message: 'You are not a participant in this conversation.' });
    }

    const starred = Array.isArray(message.starredBy) ? message.starredBy : [];
    const starredBy = starred.includes(req.user.id)
      ? starred.filter((uid) => uid !== req.user.id)
      : [...starred, req.user.id];

    const updated = await prisma.message.update({
      where: { id },
      data: { starredBy },
      include: messageInclude,
    });

    const payload = withIds(serializeMessage(updated));
    const io = getIO();
    if (io) emit('message_updated', payload);

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

// ── Report ────────────────────────────────────────────────────────────────
// Reports are audited via ActivityLog (no fake backend behavior). Any
// participant can flag a message to admins.
const reportMessage = async (req, res, next) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const message = await prisma.message.findUnique({
      where: { id },
      include: { conversation: { include: { participants: { select: { id: true } } } } },
    });
    if (!message) return res.status(404).json({ message: 'Message not found.' });
    if (!message.conversation.participants.some((p) => p.id === req.user.id)) {
      return res.status(403).json({ message: 'You are not a participant in this conversation.' });
    }

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        userRole: req.user.role,
        userEmail: req.user.email || '',
        userName: req.user.name || '',
        action: 'message.report',
        entityType: 'message',
        entityId: id,
        meta: {
          conversationId: message.conversationId,
          senderId: message.senderId,
          reason: (reason || '').toString().slice(0, 500),
        },
      },
    });

    res.status(200).json({ message: 'Message reported to moderators.' });
  } catch (error) {
    next(error);
  }
};

// ── Search inside a conversation ──────────────────────────────────────────
// Message content is encrypted at rest, so (unlike a normal DB text search)
// we must decrypt server-side. Scoped to one conversation the user is in.
const searchMessages = async (req, res, next) => {
  const { conversationId } = req.params;
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ message: 'Search query is required.' });

  try {
    const membership = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: { select: { id: true } } },
    });
    if (!membership) return res.status(404).json({ message: 'Conversation not found.' });
    if (!membership.participants.some((p) => p.id === req.user.id)) {
      return res.status(403).json({ message: 'You are not a participant in this conversation.' });
    }

    const needle = q.toLowerCase();
    const rows = await prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
        NOT: { deletedForMe: { has: req.user.id } },
      },
      include: messageInclude,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const matches = rows
      .map(serializeMessage)
      .filter((m) => (m.content || '').toLowerCase().includes(needle))
      .slice(0, 60);

    res.status(200).json({ query: q, matches });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendMessage,
  getMessages,
  updateMessage,
  deleteMessage,
  markMessageAsRead,
  getUnreadCount,
  markMultipleAsRead,
  hideMessage,
  setReaction,
  toggleStar,
  reportMessage,
  searchMessages,
};