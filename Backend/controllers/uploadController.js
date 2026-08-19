const { cloudinary } = require('../config/cloudinary');
const prisma = require('../db/prisma');

// A user may only delete images out of their OWN property photo sets (or
// brand-new uploads that haven't been attached to any listing yet and live in
// the property_images folder). Images that belong to somebody else's listing
// are off-limits — so a leaked/guessed publicId can't be used to sabotage
// another seller's photos. Admins can delete anything.
const isPhotoAttachedTo = (publicId, properties) =>
  properties.some((p) =>
    (p.photos || []).some((url) => String(url).includes(publicId)),
  );

// Upload single image to Cloudinary
const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Return the uploaded file info
    const imageData = {
      url: req.file.path, // Cloudinary URL
      public_id: req.file.filename, // Cloudinary public ID
      originalName: req.file.originalname,
      size: req.file.size,
    };

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      image: imageData,
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    next(error);
  }
};

// Upload multiple images to Cloudinary
const uploadMultipleImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No image files provided' });
    }

    // Return array of uploaded file info
    const images = req.files.map((file) => ({
      url: file.path, // Cloudinary URL
      public_id: file.filename, // Cloudinary public ID
      originalName: file.originalname,
      size: file.size,
    }));

    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      images: images,
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    next(error);
  }
};

// Upload a single document (PDF/Word/Excel/text) for deal-room sharing.
const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No document file provided' });
    }
    res.status(200).json({
      success: true,
      message: 'Document uploaded successfully',
      document: {
        url: req.file.path,
        public_id: req.file.filename,
        name: req.file.originalname,
        size: req.file.size,
      },
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    next(error);
  }
};

// Chat attachments — images / documents / voice. All verified by multer MIME
// + size filters; the same Cloudinary folder scheme is used everywhere.
const chatUploadResult = (file) => ({
  url: file.path,
  public_id: file.filename,
  name: file.originalname,
  size: file.size,
  type: file.mimetype || '',
});

const uploadChatImage = (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image file provided' });
    res.status(200).json({ success: true, message: 'Image uploaded successfully', image: chatUploadResult(req.file) });
  } catch (error) {
    console.error('Error uploading chat image:', error);
    next(error);
  }
};

const uploadChatImages = (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No image files provided' });
    }
    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      images: req.files.map(chatUploadResult),
    });
  } catch (error) {
    console.error('Error uploading chat images:', error);
    next(error);
  }
};

const uploadChatDocument = (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No document file provided' });
    res.status(200).json({
      success: true,
      message: 'Document uploaded successfully',
      document: { ...chatUploadResult(req.file), type: 'file' },
    });
  } catch (error) {
    console.error('Error uploading chat document:', error);
    next(error);
  }
};

const uploadChatVoice = (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No audio file provided' });
    res.status(200).json({
      success: true,
      message: 'Voice message uploaded successfully',
      audio: chatUploadResult(req.file),
    });
  } catch (error) {
    console.error('Error uploading chat voice:', error);
    next(error);
  }
};

// Delete image from Cloudinary
const deleteImage = async (req, res, next) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({ message: 'Public ID is required' });
    }

    // Ownership scoping (non-admins only).
    if (req.user?.role !== 'admin') {
      const folder = (process.env.CLOUDINARY_FOLDER || 'property_images').replace(/\/+$/, '');
      if (!String(publicId).startsWith(`${folder}/`)) {
        return res.status(403).json({ message: 'You can only delete property images.' });
      }

      const imageQuery = {
        select: { photos: true },
        take: 100,
      };

      const ownProperties = await prisma.property.findMany({
        ...imageQuery,
        where: { listedById: req.user.id },
      });

      const owned = isPhotoAttachedTo(publicId, ownProperties);

      if (!owned) {
        const others = await prisma.property.findMany({
          ...imageQuery,
          where: { NOT: { listedById: req.user.id } },
        });
        if (isPhotoAttachedTo(publicId, others)) {
          return res.status(403).json({ message: 'This image belongs to another listing.' });
        }
      }
    }

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok') {
      res.status(200).json({
        success: true,
        message: 'Image deleted successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to delete image',
        result,
      });
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    next(error);
  }
};

module.exports = {
  uploadImage,
  uploadMultipleImages,
  uploadDocument,
  uploadChatImage,
  uploadChatImages,
  uploadChatDocument,
  uploadChatVoice,
  deleteImage,
};
