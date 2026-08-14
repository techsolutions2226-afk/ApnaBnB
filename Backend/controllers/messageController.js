const prisma = require('../db/prisma');
const { encryptMessage, decryptMessage } = require('../utils/messageCrypto');
const { getIO } = require('../sockets');
const { withIds } = require('../utils/serializeIds');
const { filterPersonalInfo } = require('../utils/personalInfo');

const senderSelect = {
  select: { id: true, name: true, email: true, role: true, avatar: true },
};

// Return a message with its `content` decrypted to plaintext (the DB stores the
// AES-256-GCM blob). Spreading a Prisma record preserves the computed `_id`.
const withPlaintext = (msg) => ({ ...msg, content: decryptMessage(msg.content) });

// Send a message via REST (fallback for clients without an active socket).
const sendMessage = async (req, res, next) => {
  const { conversationId, content, attachments } = req.body;
  const hasContent = content && String(content).trim().length > 0;
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

  if (!conversationId || (!hasContent && !hasAttachments)) {
    return res
      .status(400)
      .json({ message: 'Conversation ID and content or attachments are required.' });
  }

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: { select: { id: true } } },
    });
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }
    if (!conversation.participants.some((p) => p.id === req.user.id)) {
      return res
        .status(403)
        .json({ message: 'You are not authorized to send messages in this conversation.' });
    }

    const sanitizedContent = hasContent
      ? filterPersonalInfo(content)
      : '';

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: req.user.id,
        content: encryptMessage(sanitizedContent),
        attachments: hasAttachments ? attachments : [],
      },
      include: { sender: senderSelect },
    });

    res.status(201).json(withPlaintext(message));
  } catch (error) {
    next(error);
  }
};

// Get all messages in a conversation, oldest → newest (content decrypted).
// Messages the requesting user hid with "delete for me" are excluded.
const getMessages = async (req, res, next) => {
  const { conversationId } = req.params;

  try {
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        NOT: { deletedForMe: { has: req.user.id } },
      },
      include: { sender: senderSelect },
      orderBy: { createdAt: 'asc' },
    });
    res.status(200).json(messages.map(withPlaintext));
  } catch (error) {
    next(error);
  }
};

// Edit a message
const updateMessage = async (req, res, next) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ message: 'Message content is required.' });
  }

  try {
    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    // Only sender can edit their message
    if (message.senderId !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit your own messages.' });
    }

    const sanitizedContent = filterPersonalInfo(content);
    const updated = await prisma.message.update({
      where: { id },
      data: { content: encryptMessage(sanitizedContent) },
      include: { sender: senderSelect },
    });

    const payload = withIds(withPlaintext(updated));

    // Let the other participant see the edit live.
    const io = getIO();
    if (io) {
      io.to(`conv:${updated.conversationId}`).emit('message_updated', payload);
      io.to(`conv:${updated.conversationId}`).emit('conversation_updated', {
        conversationId: updated.conversationId,
        lastMessage: payload,
      });
    }

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

// Delete a message
const deleteMessage = async (req, res, next) => {
  const { id } = req.params;

  try {
    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    // Only sender can delete their message
    if (message.senderId !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own messages.' });
    }

    await prisma.message.delete({ where: { id } });

    // Let the other participant see the deletion live.
    const io = getIO();
    if (io) {
      io.to(`conv:${message.conversationId}`).emit('message_deleted', {
        messageId: id,
        conversationId: message.conversationId,
      });
    }

    res.status(200).json({ message: 'Message deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// Mark a message as read
const markMessageAsRead = async (req, res, next) => {
  const { id } = req.params;

  try {
    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    // Only participants of the conversation may mark its messages as read.
    const conversation = await prisma.conversation.findUnique({
      where: { id: message.conversationId },
      include: { participants: { select: { id: true } } },
    });
    if (
      !conversation ||
      !conversation.participants.some((p) => p.id === req.user.id)
    ) {
      return res
        .status(403)
        .json({ message: 'You are not a participant in this conversation.' });
    }

    const updated = await prisma.message.update({
      where: { id },
      data: { read: true },
      include: { sender: { select: { id: true, name: true, email: true } } },
    });

    // Push the ✓✓ to the sender live.
    const io = getIO();
    if (io) {
      io.to(`conv:${message.conversationId}`).emit('message_read', {
        messageId: id,
        conversationId: message.conversationId,
      });
    }

    res.status(200).json(withPlaintext(updated));
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
        senderId: { not: req.user.id }, // Don't count own messages
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
    // Only mark messages the requesting user can actually see — those living
    // in a conversation they participate in.
    const result = await prisma.message.updateMany({
      where: {
        id: { in: messageIds },
        conversation: {
          is: { participants: { some: { id: req.user.id } } },
        },
      },
      data: { read: true },
    });

    if (result.count === 0) {
      return res
        .status(403)
        .json({ message: 'No messages found, or you are not a participant.' });
    }

    // Push ✓✓ to the senders live (all ids belong to the same conversation).
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
          }),
        );
      }
    }

    res.status(200).json({
      message: `${result.count} messages marked as read.`,
      modifiedCount: result.count,
    });
  } catch (error) {
    next(error);
  }
};

// "Delete for me" — the requesting user hides the message from their own
// view only. Works on any message in a conversation they participate in
// (their own or received). Everyone else still sees it.
const hideMessage = async (req, res, next) => {
  const { id } = req.params;

  try {
    const message = await prisma.message.findUnique({
      where: { id },
      select: { id: true, conversationId: true, deletedForMe: true },
    });
    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: message.conversationId },
      include: { participants: { select: { id: true } } },
    });
    if (
      !conversation ||
      !conversation.participants.some((p) => p.id === req.user.id)
    ) {
      return res
        .status(403)
        .json({ message: 'You are not part of this conversation.' });
    }

    if (!message.deletedForMe.includes(req.user.id)) {
      await prisma.message.update({
        where: { id },
        data: { deletedForMe: { push: req.user.id } },
      });
    }

    // Sync to the user's OTHER devices/sessions (they stay on this device
    // via the optimistic local removal; the room push covers the rest).
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

module.exports = {
  sendMessage,
  getMessages,
  updateMessage,
  deleteMessage,
  markMessageAsRead,
  getUnreadCount,
  markMultipleAsRead,
  hideMessage,
};
