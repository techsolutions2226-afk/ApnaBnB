/**
 * Cloudinary destroy helpers (requires CLOUDINARY_* env via config/cloudinary).
 */
const { cloudinary } = require('../config/cloudinary');
const { urlToCloudinaryAsset } = require('./cloudinaryPublicId');

const destroyCloudinaryAsset = (publicId, options = {}) => {
  if (!publicId) return;
  cloudinary.uploader.destroy(publicId, { invalidate: true, ...options }).catch((err) => {
    console.error('Cloudinary destroy failed:', publicId, err.message);
  });
};

const destroyCloudinaryUrl = (url) => {
  const asset = urlToCloudinaryAsset(url);
  if (!asset?.publicId) return;
  destroyCloudinaryAsset(asset.publicId, { resource_type: asset.resourceType });
};

/**
 * Destroy Cloudinary assets for URLs present in `previous` but not in `next`.
 * Handles image arrays and single video/image strings interchangeably.
 */
const destroyRemovedUrls = (previous = [], next = []) => {
  const prev = Array.isArray(previous) ? previous : [previous];
  const keep = new Set((Array.isArray(next) ? next : [next]).filter(Boolean));
  prev.forEach((url) => {
    if (url && !keep.has(url)) destroyCloudinaryUrl(url);
  });
};

const destroyRemovedPhotoUrls = destroyRemovedUrls;

module.exports = {
  urlToCloudinaryAsset,
  destroyCloudinaryAsset,
  destroyCloudinaryUrl,
  destroyRemovedUrls,
  destroyRemovedPhotoUrls,
};