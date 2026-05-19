const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  throw new Error(
    'Missing Cloudinary configuration. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file.'
  );
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

const storageParams = {
  folder: process.env.CLOUDINARY_FOLDER || 'property_images',
  allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  transformation: [
    { width: 1200, height: 800, crop: 'limit' },
    { quality: 'auto:good', fetch_format: 'auto' },
  ],
};
if (process.env.CLOUDINARY_UPLOAD_PRESET) {
  storageParams.upload_preset = process.env.CLOUDINARY_UPLOAD_PRESET;
}

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: storageParams,
});

// Property images — landscape format.
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 6, // max 6 files (1 cover + 5 gallery)
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and WebP images are allowed.'), false);
    }
  },
});

// Profile images — separate Cloudinary folder + square crop tuned for avatars.
// Defaults to "Profile-Images" (override with CLOUDINARY_PROFILE_FOLDER).
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: process.env.CLOUDINARY_PROFILE_FOLDER || 'Profile-Images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto:good', fetch_format: 'auto' },
    ],
  },
});

const profileUpload = multer({
  storage: profileStorage,
  limits: {
    fileSize: 3 * 1024 * 1024, // 3MB is plenty for an avatar
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and WebP images are allowed.'), false);
    }
  },
});

module.exports = { cloudinary, upload, profileUpload };
