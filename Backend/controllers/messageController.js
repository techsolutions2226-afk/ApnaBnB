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

// Edit a message
const updateMessage = async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ message: 'Message content is required.' });
  }

  try {
    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    // Only sender can edit their message
    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit your own messages.' });
    }

    // Sanitize content
    const sanitizedContent = content.replace(personalInfoRegex, '[filtered]');
    message.content = sanitizedContent;
    await message.save();

    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a message
const deleteMessage = async (req, res) => {
  const { id } = req.params;

  try {
    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    // Only sender can delete their message
    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own messages.' });
    }

    await Message.findByIdAndDelete(id);
    res.status(200).json({ message: 'Message deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark a message as read
const markMessageAsRead = async (req, res) => {
  const { id } = req.params;

  try {
    const message = await Message.findByIdAndUpdate(
      id,
      { read: true },
      { new: true }
    ).populate('sender', 'name email');

    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get unread message count in a conversation
const getUnreadCount = async (req, res) => {
  const { conversationId } = req.params;

  try {
    const count = await Message.countDocuments({
      conversationId,
      read: false,
      sender: { $ne: req.user.id } // Don't count own messages
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
    const result = await Message.updateMany(
      { _id: { $in: messageIds } },
      { read: true }
    );

    res.status(200).json({ 
      message: `${result.modifiedCount} messages marked as read.`,
      modifiedCount: result.modifiedCount 
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
  markMultipleAsRead 
};