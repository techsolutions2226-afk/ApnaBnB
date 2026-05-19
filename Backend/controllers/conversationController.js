const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const mongoose = require('mongoose');

// Create new conversation
const createConversation = async (req, res) => {
  const { participants } = req.body;

  if (!participants || participants.length < 2) {
    return res.status(400).json({ message: 'A conversation must have at least two participants.' });
  }

  try {
    const conversation = await Conversation.create({ participants });
    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all conversations for the logged-in user, enriched with the last
// message (decrypted, via the model getter) and the count of unread messages
// sent by the OTHER party. Sorted by most-recently-active first.
const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.id,
    }).populate('participants', 'name email role avatar');

    // Build per-conversation last-message + unread-count maps in two batched
    // queries instead of N+1 round-trips.
    const ids = conversations.map((c) => c._id);
    const [lastMessages, unreadAgg] = await Promise.all([
      Message.aggregate([
        { $match: { conversationId: { $in: ids } } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$conversationId',
            // Keep the FULL document so we can re-hydrate as a Mongoose
            // model below and trigger the decryption getter on content.
            doc: { $first: '$$ROOT' },
          },
        },
      ]),
      Message.aggregate([
        {
          $match: {
            conversationId: { $in: ids },
            read: false,
            sender: { $ne: new mongoose.Types.ObjectId(req.user.id) },
          },
        },
        { $group: { _id: '$conversationId', count: { $sum: 1 } } },
      ]),
    ]);

    const lastByConv = new Map();
    for (const row of lastMessages) {
      // Re-hydrate as a Mongoose doc so the content getter (AES decrypt) fires
      // when we serialise.
      const hydrated = Message.hydrate(row.doc);
      lastByConv.set(row._id.toString(), hydrated.toJSON());
    }
    const unreadByConv = new Map(
      unreadAgg.map((row) => [row._id.toString(), row.count]),
    );

    const enriched = conversations.map((c) => {
      const obj = c.toJSON();
      const key = c._id.toString();
      obj.lastMessage = lastByConv.get(key) || null;
      obj.unreadCount = unreadByConv.get(key) || 0;
      return obj;
    });

    // Sort by lastMessage.createdAt (newest first), conversations with no
    // messages go to the bottom.
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
// create one if it doesn't exist. Used when buyer clicks "Message" on a
// match / dealer profile / property — no need to know about existing convs.
const findOrCreateDirect = async (req, res) => {
  const { otherUserId } = req.body;
  if (!otherUserId) {
    return res.status(400).json({ message: 'otherUserId is required.' });
  }
  if (otherUserId === req.user.id) {
    return res.status(400).json({ message: "Can't message yourself." });
  }

  try {
    // Match a conversation whose participants are EXACTLY these two ids.
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user.id, otherUserId], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user.id, otherUserId],
      });
    }

    const populated = await Conversation.findById(conversation._id).populate(
      'participants',
      'name email role avatar',
    );
    res.status(200).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single conversation by ID
const getConversationById = async (req, res) => {
  const { id } = req.params;

  try {
    const conversation = await Conversation.findById(id).populate('participants', 'name email');
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    // Verify user is a participant
    if (!conversation.participants.some(p => p._id.toString() === req.user.id)) {
      return res.status(403).json({ message: 'You are not a participant in this conversation.' });
    }

    res.status(200).json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update conversation
const updateConversation = async (req, res) => {
  const { id } = req.params;
  const { archived } = req.body;

  try {
    const conversation = await Conversation.findById(id);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    // Verify user is a participant
    if (!conversation.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'You are not a participant in this conversation.' });
    }

    if (archived !== undefined) {
      conversation.archived = archived;
    }

    await conversation.save();
    res.status(200).json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete conversation
const deleteConversation = async (req, res) => {
  const { id } = req.params;

  try {
    const conversation = await Conversation.findById(id);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    // Verify user is a participant
    if (!conversation.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'You are not authorized to delete this conversation.' });
    }

    await Conversation.findByIdAndDelete(id);
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
    const conversation = await Conversation.findById(id);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    // Verify user is a participant (only participants can modify members)
    if (!conversation.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'You are not authorized to modify this conversation.' });
    }

    if (action === 'add') {
      if (conversation.participants.includes(userId)) {
        return res.status(400).json({ message: 'User is already a participant.' });
      }
      conversation.participants.push(userId);
    } else if (action === 'remove') {
      if (!conversation.participants.includes(userId)) {
        return res.status(400).json({ message: 'User is not a participant.' });
      }
      conversation.participants = conversation.participants.filter(p => p.toString() !== userId);
    }

    await conversation.save();
    res.status(200).json(conversation);
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