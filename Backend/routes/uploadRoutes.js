const express = require('express');
const { uploadImage, uploadMultipleImages, deleteImage } = require('../controllers/uploadController');
const { upload, profileUpload } = require('../config/cloudinary');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// All upload endpoints require an authenticated user — Cloudinary writes cost
// money, so anonymous callers must not be able to trigger them.
router.post('/image', verifyToken, upload.single('image'), uploadImage);
router.post('/images', verifyToken, upload.array('images', 6), uploadMultipleImages);
router.post('/profile', verifyToken, profileUpload.single('image'), uploadImage); // → Profile-Images/
router.delete('/image/:publicId', verifyToken, deleteImage);

module.exports = router;
