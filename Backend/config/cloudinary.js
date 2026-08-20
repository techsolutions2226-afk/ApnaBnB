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
  folder: process.env.CLOUDINARY_FOLDER || 'apnaBnB/properties',
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

// Deal-room / chat documents — apnaBnB/messages/documents (raw resources).
const DOCUMENT_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

const documentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: process.env.CLOUDINARY_DOC_FOLDER || 'apnaBnB/messages/documents',
    resource_type: 'raw',
  },
});

const documentUpload = multer({
  storage: documentStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (DOCUMENT_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, Word, Excel, or text documents are allowed.'), false);
    }
  },
});

// ── Chat uploads — everything under apnaBnB/messages/ with per-kind
//    subfolders: images (chat pictures), documents, audio, videos.
const messageBase = (sub) =>
  `${process.env.CLOUDINARY_MESSAGE_FOLDER || 'apnaBnB/messages'}/${sub}`;

const chatImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: messageBase('images'),
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ quality: 'auto:good', fetch_format: 'auto' }],
    format: 'auto',
  },
});

const chatDocumentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: messageBase('documents'), resource_type: 'raw' },
});

const chatVoiceStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: messageBase('audio'), resource_type: 'raw' },
});

// Max 10 images at once — chat galleries can batch-select multiple.
const chatImageUpload = multer({
  storage: chatImageStorage,
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type. Only JPG, PNG, WebP, or GIF images are allowed.'), false);
  },
});

const chatDocumentUpload = multer({
  storage: chatDocumentStorage,
  limits: { fileSize: 20 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    if (DOCUMENT_MIMES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF, Word, Excel, or text documents are allowed.'), false);
  },
});

// Voice messages — MediaRecorder WebM/Opus plus common audio containers.
const AUDIO_MIMES = [
  'audio/webm',
  'audio/ogg',
  'audio/ogg; codecs=opus',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/m4a',
  'audio/aac',
  'audio/x-m4a',
];

const chatVoiceUpload = multer({
  storage: chatVoiceStorage,
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase();
    if (AUDIO_MIMES.includes(mime)) cb(null, true);
    else cb(new Error('Only audio files (WebM/OGG/MP3/WAV/M4A) are allowed.'), false);
  },
});

// Video clips shared in chat → messages/videos.
const VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/3gpp'];

const chatVideoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: messageBase('videos'), resource_type: 'video', transformation: [] },
});

const chatVideoUpload = multer({
  storage: chatVideoStorage,
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (VIDEO_MIMES.includes((file.mimetype || '').toLowerCase())) cb(null, true);
    else cb(new Error('Only MP4, WebM, MOV or 3GP video files are allowed.'), false);
  },
});

module.exports = {
  cloudinary,
  upload,
  profileUpload,
  documentUpload,
  chatImageUpload,
  chatDocumentUpload,
  chatVoiceUpload,
  chatVideoUpload,
};
