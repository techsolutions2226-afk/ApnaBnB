const prisma = require('../db/prisma');
const { serializeMessage, messageInclude, senderSelect } = require('../utils/messageUtils');
const { getIO } = require('../sockets');

const participantSelect = {
  select: { id: true, name: true, email: true, role: true, avatar: true, lastSeenAt: true },
};

const propertyContext = {
  select: {
    id: true,
    title: true,
    photos: true,
    price: true,
    purpose: true,
    category: true,
    propertyType: true,
    location: true,
    status: true,
    size: true,
    sizeUnit: true,
  },
};

// Ensure a per-user ConversationParticipant row exists (idempotent).
const upsertPref = (conversationId, userId) =>
  prisma.conversationParticipant.upsert({
    where: { conversationId_userId: { conversationId, userId } },
    update: {},
    create: { conversationId, userId },
  });

const loadPref = (conversationId, userId) =>
  prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });

// Create new conversation — also seeds per-user prefs rows.
const createConversation = async (req, res, next) => {
  const { participants } = req.body;

  if (!participants || participants.length < 2) {
    return res.status(400).json({ message: 'A conversation must have at least two participants.' });
  }

  try {
    const conversation = await prisma.conversation.create({
      data: {
        participants: { connect: participants.map((id) => ({ id })) },
        propertyId: req.body.propertyId || null,
      },
      include: { participants: participantSelect },
    });
    await Promise.all(participants.map((id) => upsertPref(conversation.id, id)));
    res.status(201).json(conversation);
  } catch (error) {
    next(error);
  }
};

// Get all conversations for the logged-in user, enriched with the last message
// (decrypted), per-user prefs, unread count and property context.
const getConversations = async (req, res, next) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { participants: { some: { id: req.user.id } } },
      include: {
        participants: participantSelect,
        property: propertyContext,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const ids = conversations.map((c) => c.id);

    // Per-user prefs (pinned/muted/archived/lastReadAt).
    const prefRows = await prisma.conversationParticipant.findMany({
      where: { conversationId: { in: ids }, userId: req.user.id },
    });
    const prefByConv = {};
    for (const row of prefRows) prefByConv[row.conversationId] = row;

    // Last message per conversation (decrypted). Sequential to respect the
    // Supabase pooler connection cap.
    const lastByConv = {};
    for (const cid of ids) {
      const m = await prisma.message.findFirst({
        where: { conversationId: cid },
        orderBy: { createdAt: 'desc' },
        include: messageInclude,
      });
      if (m) lastByConv[cid] = serializeMessage(m);
    }

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

    const enriched = conversations.map((c) => {
      const pref = prefByConv[c.id] || {};
      return {
        ...c,
        lastMessage: lastByConv[c.id] || null,
        unreadCount: unreadByConv[c.id] || 0,
        prefs: {
          pinned: !!pref.pinned,
          muted: !!pref.muted,
          archived: !!pref.archived,
          lastReadAt: pref.lastReadAt || null,
        },
      };
    });

    // Sort: pinned first, then most recently active.
    enriched.sort((a, b) => {
      if (!!a.prefs?.pinned !== !!b.prefs?.pinned) return a.prefs?.pinned ? -1 : 1;
      const ta = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.updatedAt).getTime();
      const tb = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.updatedAt).getTime();
      return tb - ta;
    });

    res.status(200).json(enriched);
  } catch (error) {
    next(error);
  }
};

// Find a 1-1 conversation between the current user and `otherUserId`, or
// create one (with per-user prefs + optional property context).
const findOrCreateDirect = async (req, res, next) => {
  const { otherUserId, propertyId } = req.body;
  if (!otherUserId) return res.status(400).json({ message: 'otherUserId is required.' });
  if (otherUserId === req.user.id) return res.status(400).json({ message: "Can't message yourself." });

  try {
    let conversation = await prisma.conversation.findFirst({
      where: {
        participants: { every: { id: { in: [req.user.id, otherUserId] } } },
      },
      include: { participants: participantSelect, property: propertyContext },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          participants: {
            connect: [{ id: req.user.id }, { id: otherUserId }],
          },
          propertyId: propertyId || null,
        },
        include: { participants: participantSelect, property: propertyContext },
      });
      await upsertPref(conversation.id, req.user.id);
      await upsertPref(conversation.id, otherUserId);
    } else if (propertyId && !conversation.propertyId) {
      const existing = await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true } });
      if (existing) {
        conversation = await prisma.conversation.update({
          where: { id: conversation.id },
          data: { propertyId },
          include: { participants: participantSelect, property: propertyContext },
        });
      }
    }

    res.status(200).json(conversation);
  } catch (error) {
    next(error);
  }
};

// Get single conversation by ID
const getConversationById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: { participants: participantSelect, property: propertyContext },
    });

    if (!conversation) return res.status(404).json({ message: 'Conversation not found.' });
    if (!conversation.participants.some((p) => p.id === req.user.id)) {
      return res.status(403).json({ message: 'You are not a participant in this conversation.' });
    }

    const pref = await loadPref(id, req.user.id);
    res.status(200).json({
      ...conversation,
      prefs: {
        pinned: !!pref?.pinned,
        muted: !!pref?.muted,
        archived: !!pref?.archived,
        lastReadAt: pref?.lastReadAt || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

const loadForMembership = (id) =>
  prisma.conversation.findUnique({
    where: { id },
    include: { participants: { select: { id: true } } },
  });

const isParticipant = (conversation, userId) => conversation.participants.some((p) => p.id === userId);

// Update a conversation's per-user preferences: pin / mute / archive.
const updateConversationPrefs = async (req, res, next) => {
  const { id } = req.params;
  const { pinned, muted, archived } = req.body;

  try {
    const conversation = await loadForMembership(id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found.' });
    if (!isParticipant(conversation, req.user.id)) {
      return res.status(403).json({ message: 'You are not a participant in this conversation.' });
    }

    const data = {};
    if (pinned !== undefined) data.pinned = !!pinned;
    if (muted !== undefined) data.muted = !!muted;
    // archived only flips from false→true (archiving); unarchiving sets false.
    if (archived !== undefined) data.archived = !!archived;

    const pref = await prisma.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId: id, userId: req.user.id } },
      update: data,
      create: { conversationId: id, userId: req.user.id, ...data },
    });

    const io = getIO();
    if (io) io.to(`user:${req.user.id}`).emit('conversation_prefs', {
      conversationId: id,
      prefs: {
        pinned: !!pref.pinned,
        muted: !!pref.muted,
        archived: !!pref.archived,
        lastReadAt: pref.lastReadAt || null,
      },
    });

    res.status(200).json({
      conversationId: id,
      prefs: { pinned: !!pref.pinned, muted: !!pref.muted, archived: !!pref.archived, lastReadAt: pref.lastReadAt },
    });
  } catch (error) {
    next(error);
  }
};

// Mark a whole conversation read for this user (updates lastReadAt + the legacy
// read flags on the other party's messages, and pokes the senders' sockets).
const markConversationRead = async (req, res, next) => {
  const { id } = req.params;

  try {
    const conversation = await loadForMembership(id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found.' });
    if (!isParticipant(conversation, req.user.id)) {
      return res.status(403).json({ message: 'You are not a participant in this conversation.' });
    }

    const readAt = new Date();
    await prisma.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId: id, userId: req.user.id } },
      update: { lastReadAt: readAt },
      create: { conversationId: id, userId: req.user.id, lastReadAt: readAt },
    });

    const res_count = await prisma.message.updateMany({
      where: { conversationId: id, senderId: { not: req.user.id }, read: false },
      data: { read: true, readAt },
    });

    const io = getIO();
    if (io) {
      io.to(`conv:${id}`).emit('conversation_read', { conversationId: id, userId: req.user.id, readAt: readAt.toISOString() });
      io.to(`user:${req.user.id}`).emit('conversation_prefs', {
        conversationId: id,
        prefs: { lastReadAt: readAt.toISOString() },
      });
    }

    res.status(200).json({ conversationId: id, modifiedCount: res_count.count, readAt: readAt.toISOString() });
  } catch (error) {
    next(error);
  }
};

// Legacy update endpoint — delegates to the per-user prefs handler (it already
// reads `archived` (and pin/mute) from the body).
const updateConversation = (req, res, next) => updateConversationPrefs(req, res, next);

// Delete conversation (messages cascade via FK onDelete)
const deleteConversation = async (req, res, next) => {
  const { id } = req.params;

  try {
    const conversation = await loadForMembership(id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found.' });
    if (!isParticipant(conversation, req.user.id)) {
      return res.status(403).json({ message: 'You are not authorized to delete this conversation.' });
    }

    await prisma.conversation.delete({ where: { id } });
    res.status(200).json({ message: 'Conversation deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// Add or remove participants (also seeds prefs when adding)
const updateMembers = async (req, res, next) => {
  const { id } = req.params;
  const { action, userId } = req.body; // action: 'add' or 'remove'

  if (!action || !userId || !['add', 'remove'].includes(action)) {
    return res.status(400).json({ message: 'Action (add/remove) and userId are required.' });
  }

  try {
    const conversation = await loadForMembership(id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found.' });
    if (!isParticipant(conversation, req.user.id)) {
      return res.status(403).json({ message: 'You are not authorized to modify this conversation.' });
    }

    const alreadyMember = isParticipant(conversation, userId);
    if (action === 'add') {
      if (alreadyMember) return res.status(400).json({ message: 'User is already a participant.' });
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
      include: { participants: participantSelect, property: propertyContext },
    });
    if (action === 'add') await upsertPref(id, userId);

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createConversation,
  findOrCreateDirect,
  getConversations,
  getConversationById,
  updateConversationPrefs,
  markConversationRead,
  updateConversation,
  deleteConversation,
  updateMembers,
};