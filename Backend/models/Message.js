const mongoose = require('mongoose');
const { encryptMessage, decryptMessage } = require('../utils/messageCrypto');

const AttachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ['image', 'file'], default: 'image' },
    name: { type: String, default: '' },
    size: { type: Number, default: 0 },
  },
  { _id: false },
);

const MessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Plaintext in memory (controllers + sockets read this), AES-256-GCM
    // ciphertext on disk. Setter encrypts on assignment, getter decrypts on read.
    // Marker prefix "v1:" prevents double-encryption when a doc is re-saved.
    content: {
      type: String,
      required: true,
      set: encryptMessage,
      get: decryptMessage,
    },
    attachments: { type: [AttachmentSchema], default: [] },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    // Run the getter when serialising to JSON / plain object so the API
    // response carries plaintext. Without these flags the cipherblob leaks out.
    toJSON: { getters: true, versionKey: false },
    toObject: { getters: true, versionKey: false },
  },
);

const Message = mongoose.model('Message', MessageSchema);
module.exports = Message;
