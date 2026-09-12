const { cloudinary } = require('../config/cloudinary');
const prisma = require('../db/prisma');

const isPhotoAttachedTo = (publicId, properties) =>
  properties.some((p) =>
    (p.photos || []).some((url) => String(url).includes(publicId)),
  );

// Same ownership rule for videos: only a video that is attached to one of the
// caller's OWN property.videoUrl values may be removed by a non-admin.
const isVideoAttachedTo = (publicId, properties) =>
  properties.some((p) => Boolean(p.videoUrl) && String(p.videoUrl).includes(publicId));

// Upload single image to Cloudinary
const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    // Return the uploaded file info. Videos flow through this same handler —
    // multer already placed them in the apnaBnB/videos folder, so the shape
    // (`url` + `public_id`) is identical and clients can't tell the difference.
    const isVideo = String(req.file.mimetype || '').startsWith('video/');
    const imageData = {
      url: req.file.path,
      public_id: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      resource_type: isVideo ? 'video' : 'image',
    };

    res.status(200).json({
      success: true,
      message: isVideo ? 'Video uploaded successfully' : 'Image uploaded successfully',
      image: imageData,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    next(error);
  }
};

const uploadMultipleImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No image files provided' });
    }

    const images = req.files.map((file) => ({
      url: file.path,
      public_id: file.filename,
      originalName: file.originalname,
      size: file.size,
    }));

    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      images,
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    next(error);
  }
};

// Delete image/video from Cloudinary
const deleteImage = async (req, res, next) => {
  try {
    const publicId = req.query.publicId || req.params.publicId;
    // Clients delete videos with ?resourceType=video — Cloudinary stores both
    // in separate pipelines and destroy() needs to know which one to hit.
    const resourceType = req.query.resourceType || req.query.type || 'image';
    if (resourceType !== 'image' && resourceType !== 'video') {
      return res.status(400).json({ message: 'resourceType must be "image" or "video".' });
    }

    if (!publicId) {
      return res.status(400).json({ message: 'Public ID is required' });
    }

    if (req.user?.role !== 'admin') {
      const folder = resourceType === 'video'
        ? (process.env.CLOUDINARY_VIDEO_FOLDER || 'apnaBnB/videos').replace(/\/+$/, '')
        : (process.env.CLOUDINARY_FOLDER || 'apnaBnB/properties').replace(/\/+$/, '');
      if (!String(publicId).startsWith(`${folder}/`)) {
        return res.status(403).json({
          message: resourceType === 'video'
            ? 'You can only delete property videos.'
            : 'You can only delete property images.',
        });
      }

      const ownProperties = await prisma.property.findMany({
        select: { photos: true, videoUrl: true },
        where: { listedById: req.user.id },
        take: 100,
      });

      const owned = resourceType === 'video'
        ? isVideoAttachedTo(publicId, ownProperties)
        : isPhotoAttachedTo(publicId, ownProperties);

      if (!owned) {
        const others = await prisma.property.findMany({
          select: { photos: true, videoUrl: true },
          where: { NOT: { listedById: req.user.id } },
          take: 100,
        });
        const inOthers = resourceType === 'video'
          ? isVideoAttachedTo(publicId, others)
          : isPhotoAttachedTo(publicId, others);
        if (inOthers) {
          return res.status(403).json({
            message: resourceType === 'video'
              ? 'This video belongs to another listing.'
              : 'This image belongs to another listing.',
          });
        }
      }
    }

    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });

    if (result.result === 'ok') {
      res.status(200).json({
        success: true,
        message: resourceType === 'video' ? 'Video deleted successfully' : 'Image deleted successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to delete asset',
        result,
      });
    }
  } catch (error) {
    console.error('Error deleting asset:', error);
    next(error);
  }
};

module.exports = {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
};
