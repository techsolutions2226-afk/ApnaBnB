/**
 * Cloudinary destroy helpers (requires CLOUDINARY_* env via config/cloudinary).
 */
const { cloudinary } = require('../config/cloudinary');
const { urlToCloudinaryPublicId } = require('./cloudinaryPublicId');

const destroyCloudinaryAsset = (publicId) => {
  if (!publicId) return;
  cloudinary.uploader.destroy(publicId, { invalidate: true }).catch((err) => {
    console.error('Cloudinary destroy failed:', publicId, err.message);
  });
};

const destroyCloudinaryUrl = (url) => {
  destroyCloudinaryAsset(urlToCloudinaryPublicId(url));
};

/** Destroy Cloudinary assets for URLs present in `previous` but not in `next`. */
const destroyRemovedPhotoUrls = (previous = [], next = []) => {
  const keep = new Set((next || []).filter(Boolean));
  (previous || []).forEach((url) => {
    if (url && !keep.has(url)) destroyCloudinaryUrl(url);
  });
};

module.exports = {
  urlToCloudinaryPublicId,
  destroyCloudinaryAsset,
  destroyCloudinaryUrl,
  destroyRemovedPhotoUrls,
};
