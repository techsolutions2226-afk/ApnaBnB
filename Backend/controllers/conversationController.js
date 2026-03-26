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

module.exports = { createConversation, getConversations };