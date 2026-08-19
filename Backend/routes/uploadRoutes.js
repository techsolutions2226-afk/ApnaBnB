const express = require('express');
const {
  uploadImage,
  uploadMultipleImages,
  uploadDocument,
  uploadChatImage,
  uploadChatImages,
  uploadChatDocument,
  uploadChatVoice,
  deleteImage,
} = require('../controllers/uploadController');
const {
  upload,
  profileUpload,
  documentUpload,
  chatImageUpload,
  chatDocumentUpload,
  chatVoiceUpload,
} = require('../config/cloudinary');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// All upload endpoints require an authenticated user — Cloudinary writes cost
// money, so anonymous callers must not be able to trigger them.
router.post('/image', verifyToken, upload.single('image'), uploadImage);
router.post('/images', verifyToken, upload.array('images', 6), uploadMultipleImages);
router.post('/profile', verifyToken, profileUpload.single('image'), uploadImage); // → Profile-Images/
router.post('/document', verifyToken, documentUpload.single('document'), uploadDocument); // → deal_documents/

// Chat attachments → messages/images · messages/documents · messages/voice.
router.post('/chat/image', verifyToken, chatImageUpload.single('image'), uploadChatImage);
router.post('/chat/images', verifyToken, chatImageUpload.array('images', 10), uploadChatImages);
router.post('/chat/document', verifyToken, chatDocumentUpload.single('document'), uploadChatDocument);
router.post('/chat/voice', verifyToken, chatVoiceUpload.single('audio'), uploadChatVoice);

router.delete('/image/:publicId', verifyToken, deleteImage);

module.exports = router;
