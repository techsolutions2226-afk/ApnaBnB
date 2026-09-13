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
  // apnaBnB/properties — property & listing images.
  // Signed uploads (API key + secret) do NOT use upload presets. A bad
  // CLOUDINARY_UPLOAD_PRESET value caused Cloudinary "Upload preset not found".
  folder: process.env.CLOUDINARY_FOLDER || 'apnaBnB/properties',
  allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  transformation: [
    { width: 1200, height: 800, crop: 'limit' },
    { quality: 'auto:good', fetch_format: 'auto' },
  ],
};

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

// Profile images — apnaBnB/profile-images (square crop tuned for avatars).
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: process.env.CLOUDINARY_PROFILE_FOLDER || 'apnaBnB/profile-images',
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

// Payment proof screenshots (EasyPaisa QR flow) → apnaBnB/payment-proofs.
const paymentProofStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: process.env.CLOUDINARY_PAYMENT_FOLDER || 'apnaBnB/payment-proofs',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto:good' }],
  },
});

const paymentProofUpload = multer({
  storage: paymentProofStorage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type. Only JPG, PNG, and WebP images are allowed.'), false);
  },
});

// Property walkthrough videos → apnaBnB/videos. Uploaded through Cloudinary's
// video pipeline (resource_type: 'video') so streaming is handled for us.
// Kept separate from photos so image-only code paths (avatars, proofs) never
// see video assets, and so per-type file filters/limits can differ.
const videoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: process.env.CLOUDINARY_VIDEO_FOLDER || 'apnaBnB/videos',
    resource_type: 'video',
    allowed_formats: ['mp4', 'm4v', 'mov', 'webm', 'mkv', 'avi'],
  },
});

const videoUpload = multer({
  storage: videoStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max — plenty for a walkthrough clip
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'video/mp4',
      'video/m4v',
      'video/quicktime', // .mov
      'video/webm',
      'video/x-matroska', // .mkv
      'video/x-msvideo', // .avi
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP4, MOV, WEBM, MKV, and AVI videos are allowed.'), false);
    }
  },
});

module.exports = {
  cloudinary,
  upload,
  profileUpload,
  paymentProofUpload,
  videoUpload,
};
