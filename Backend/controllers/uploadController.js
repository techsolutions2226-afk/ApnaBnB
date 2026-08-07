const { cloudinary } = require('../config/cloudinary');

// Upload single image to Cloudinary
const uploadImage = async (req, res) => {
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
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error.message,
    });
  }
};

// Upload multiple images to Cloudinary
const uploadMultipleImages = async (req, res) => {
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
    res.status(500).json({
      success: false,
      message: 'Failed to upload images',
      error: error.message,
    });
  }
};

// Upload a single document (PDF/Word/Excel/text) for deal-room sharing.
const uploadDocument = async (req, res) => {
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
    res.status(500).json({
      success: false,
      message: 'Failed to upload document',
      error: error.message,
    });
  }
};

// Delete image from Cloudinary
const deleteImage = async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({ message: 'Public ID is required' });
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
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: error.message,
    });
  }
};

module.exports = {
  uploadImage,
  uploadMultipleImages,
  uploadDocument,
  deleteImage,
};
