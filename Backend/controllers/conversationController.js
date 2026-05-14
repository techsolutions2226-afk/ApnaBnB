const Conversation = require('../models/Conversation');

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

// Get all conversations for the logged-in user
const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.id,
    }).populate('participants', 'name email');

    res.status(200).json(conversations);
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
  getConversations, 
  getConversationById,
  updateConversation,
  deleteConversation,
  updateMembers
};