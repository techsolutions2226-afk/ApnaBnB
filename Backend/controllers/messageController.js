const prisma = require('../db/prisma');
const { encryptMessage, decryptMessage } = require('../utils/messageCrypto');

// Regex to filter personal information
const personalInfoRegex = /(\d{10,}|\+[0-9]{1,4}[- .]?\d{6,}|\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,6}|(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9._-]+\.[a-zA-Z]{2,6})/g;

const senderSelect = {
  select: { id: true, name: true, email: true, role: true, avatar: true },
};

// Return a message with its `content` decrypted to plaintext (the DB stores the
// AES-256-GCM blob). Spreading a Prisma record preserves the computed `_id`.
const withPlaintext = (msg) => ({ ...msg, content: decryptMessage(msg.content) });

// Send a message via REST (fallback for clients without an active socket).
const sendMessage = async (req, res) => {
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
      ? String(content).replace(personalInfoRegex, '[filtered]')
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
    res.status(500).json({ message: error.message });
  }
};

// Get all messages in a conversation, oldest → newest (content decrypted).
const getMessages = async (req, res) => {
  const { conversationId } = req.params;

  try {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: { sender: senderSelect },
      orderBy: { createdAt: 'asc' },
    });
    res.status(200).json(messages.map(withPlaintext));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Edit a message
const updateMessage = async (req, res) => {
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

    const sanitizedContent = content.replace(personalInfoRegex, '[filtered]');
    const updated = await prisma.message.update({
      where: { id },
      data: { content: encryptMessage(sanitizedContent) },
    });

    res.status(200).json(withPlaintext(updated));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a message
const deleteMessage = async (req, res) => {
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
    res.status(200).json({ message: 'Message deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark a message as read
const markMessageAsRead = async (req, res) => {
  const { id } = req.params;

  try {
    const message = await prisma.message.update({
      where: { id },
      data: { read: true },
      include: { sender: { select: { id: true, name: true, email: true } } },
    });
    res.status(200).json(withPlaintext(message));
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Message not found.' });
    }
    res.status(500).json({ message: error.message });
  }
};

// Get unread message count in a conversation
const getUnreadCount = async (req, res) => {
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
    res.status(500).json({ message: error.message });
  }
};

// Mark multiple messages as read
const markMultipleAsRead = async (req, res) => {
  const { messageIds } = req.body;

  if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
    return res.status(400).json({ message: 'Message IDs array is required.' });
  }

  try {
    const result = await prisma.message.updateMany({
      where: { id: { in: messageIds } },
      data: { read: true },
    });

    res.status(200).json({
      message: `${result.count} messages marked as read.`,
      modifiedCount: result.count,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
};
