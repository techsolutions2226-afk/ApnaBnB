const prisma = require('../db/prisma');
const { decryptMessage } = require('../utils/messageCrypto');

const participantSelect = {
  select: { id: true, name: true, email: true, role: true, avatar: true },
};
const senderSelect = {
  select: { id: true, name: true, email: true, role: true, avatar: true },
};

// Create new conversation
const createConversation = async (req, res) => {
  const { participants } = req.body;

  if (!participants || participants.length < 2) {
    return res.status(400).json({ message: 'A conversation must have at least two participants.' });
  }

  try {
    const conversation = await prisma.conversation.create({
      data: { participants: { connect: participants.map((id) => ({ id })) } },
      include: { participants: participantSelect },
    });
    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all conversations for the logged-in user, enriched with the last message
// (decrypted) and the count of unread messages sent by the OTHER party.
const getConversations = async (req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { participants: { some: { id: req.user.id } } },
      include: { participants: participantSelect },
    });

    const ids = conversations.map((c) => c.id);

    // Last message per conversation (decrypted).
    const lastByConv = {};
    await Promise.all(
      ids.map(async (cid) => {
        const m = await prisma.message.findFirst({
          where: { conversationId: cid },
          orderBy: { createdAt: 'desc' },
          include: { sender: senderSelect },
        });
        if (m) lastByConv[cid] = { ...m, content: decryptMessage(m.content) };
      }),
    );

    // Unread counts (messages from the other party) in one grouped query.
    const unreadRows = await prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: ids },
        read: false,
        senderId: { not: req.user.id },
      },
      _count: { _all: true },
    });
    const unreadByConv = {};
    for (const row of unreadRows) unreadByConv[row.conversationId] = row._count._all;

    const enriched = conversations.map((c) => ({
      ...c,
      lastMessage: lastByConv[c.id] || null,
      unreadCount: unreadByConv[c.id] || 0,
    }));

    // Sort by lastMessage.createdAt (newest first); empty conversations last.
    enriched.sort((a, b) => {
      const ta = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const tb = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return tb - ta;
    });

    res.status(200).json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Find a 1-1 conversation between the current user and `otherUserId`, or
// create one if it doesn't exist.
const findOrCreateDirect = async (req, res) => {
  const { otherUserId } = req.body;
  if (!otherUserId) {
    return res.status(400).json({ message: 'otherUserId is required.' });
  }
  if (otherUserId === req.user.id) {
    return res.status(400).json({ message: "Can't message yourself." });
  }

  try {
    // A conversation whose participants are EXACTLY these two: both present
    // (two `some`) AND every participant is one of the two (`every`).
    let conversation = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { id: req.user.id } } },
          { participants: { some: { id: otherUserId } } },
          { participants: { every: { id: { in: [req.user.id, otherUserId] } } } },
        ],
      },
      include: { participants: participantSelect },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          participants: { connect: [{ id: req.user.id }, { id: otherUserId }] },
        },
        include: { participants: participantSelect },
      });
    }

    res.status(200).json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single conversation by ID
const getConversationById = async (req, res) => {
  const { id } = req.params;

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: { participants: participantSelect },
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    if (!conversation.participants.some((p) => p.id === req.user.id)) {
      return res.status(403).json({ message: 'You are not a participant in this conversation.' });
    }

    res.status(200).json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Load a conversation with just participant ids for membership checks.
const loadForMembership = (id) =>
  prisma.conversation.findUnique({
    where: { id },
    include: { participants: { select: { id: true } } },
  });

const isParticipant = (conversation, userId) =>
  conversation.participants.some((p) => p.id === userId);

// Update conversation
const updateConversation = async (req, res) => {
  const { id } = req.params;
  const { archived } = req.body;

  try {
    const conversation = await loadForMembership(id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }
    if (!isParticipant(conversation, req.user.id)) {
      return res.status(403).json({ message: 'You are not a participant in this conversation.' });
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: archived !== undefined ? { archived } : {},
      include: { participants: participantSelect },
    });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete conversation (messages cascade via FK onDelete)
const deleteConversation = async (req, res) => {
  const { id } = req.params;

  try {
    const conversation = await loadForMembership(id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }
    if (!isParticipant(conversation, req.user.id)) {
      return res.status(403).json({ message: 'You are not authorized to delete this conversation.' });
    }

    await prisma.conversation.delete({ where: { id } });
    res.status(200).json({ message: 'Conversation deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add or remove participants
const updateMembers = async (req, res) => {
  const { id } = req.params;
  const { action, userId } = req.body; // action: 'add' or 'remove'

  if (!action || !userId || !['add', 'remove'].includes(action)) {
    return res.status(400).json({ message: 'Action (add/remove) and userId are required.' });
  }

  try {
    const conversation = await loadForMembership(id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }
    if (!isParticipant(conversation, req.user.id)) {
      return res.status(403).json({ message: 'You are not authorized to modify this conversation.' });
    }

    const alreadyMember = isParticipant(conversation, userId);
    if (action === 'add') {
      if (alreadyMember) {
        return res.status(400).json({ message: 'User is already a participant.' });
      }
    } else if (!alreadyMember) {
      return res.status(400).json({ message: 'User is not a participant.' });
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: {
        participants:
          action === 'add'
            ? { connect: { id: userId } }
            : { disconnect: { id: userId } },
      },
      include: { participants: participantSelect },
    });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createConversation,
  findOrCreateDirect,
  getConversations,
  getConversationById,
  updateConversation,
  deleteConversation,
  updateMembers,
};
