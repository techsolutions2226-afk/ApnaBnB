const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// Regex to filter personal information
const personalInfoRegex = /(\d{10,}|\+[0-9]{1,4}[- .]?\d{6,}|\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,6}|(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9._-]+\.[a-zA-Z]{2,6})/g;

// Send a message
const sendMessage = async (req, res) => {
  const { conversationId, content } = req.body;

  if (!conversationId || !content) {
    return res.status(400).json({ message: 'Conversation ID and content are required.' });
  }

  try {
    // Filter content for personal information
    const sanitizedContent = content.replace(personalInfoRegex, '[filtered]');

    // Verify conversation exists
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    // Ensure sender is a participant
    if (!conversation.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'You are not authorized to send messages in this conversation.' });
    }

    const message = await Message.create({
      conversationId,
      sender: req.user.id,
      content: sanitizedContent,
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all messages in a conversation
const getMessages = async (req, res) => {
  const { conversationId } = req.params;

  try {
    const messages = await Message.find({ conversationId }).populate('sender', 'name email');
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { sendMessage, getMessages };