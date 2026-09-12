const express = require('express');
const {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
} = require('../controllers/uploadController');
const {
  upload,
  profileUpload,
  videoUpload,
} = require('../config/cloudinary');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/image', verifyToken, upload.single('image'), uploadImage);
router.post('/images', verifyToken, upload.array('images', 6), uploadMultipleImages);
router.post('/profile', verifyToken, profileUpload.single('image'), uploadImage); // → Profile-Images/
router.post('/video', verifyToken, videoUpload.single('video'), uploadImage); // → apnaBnB/videos

// Chat attachments → messages/images · messages/documents · messages/voice.

// publicId is a query param so folder slashes (apnaBnB/properties/…) survive.
// Pass `resourceType=video` when deleting a Cloudinary video asset.
router.delete('/image', verifyToken, deleteImage);
router.delete('/video', verifyToken, deleteImage);

module.exports = router;
