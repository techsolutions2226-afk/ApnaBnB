/**
 * Derive Cloudinary public_id / resource_type from a delivery URL (no SDK /
 * env required).
 * https://res.cloudinary.com/<cloud>/image/upload/v123/path/file.jpg → { publicId: "path/file", resourceType: "image" }
 * https://res.cloudinary.com/<cloud>/video/upload/v123/path/file.mp4 → { publicId: "path/file", resourceType: "video" }
 */
const extractPublicIdFromPath = (pathname, marker) => {
  let rest = pathname.split(marker)[1];
  if (!rest) return null;
  const parts = rest.split('/');
  if (parts[0] && /^v\d+$/.test(parts[0])) parts.shift();
  const publicId = parts.join('/').replace(/\.[a-zA-Z0-9]+$/, '');
  return publicId || null;
};

const urlToCloudinaryAsset = (url) => {
  if (!url || typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    if (!/cloudinary\.com$/i.test(parsed.hostname)) return null;
    if (parsed.pathname.includes('/image/upload/')) {
      return {
        resourceType: 'image',
        publicId: extractPublicIdFromPath(parsed.pathname, '/image/upload/'),
      };
    }
    if (parsed.pathname.includes('/video/upload/')) {
      return {
        resourceType: 'video',
        publicId: extractPublicIdFromPath(parsed.pathname, '/video/upload/'),
      };
    }
    return null;
  } catch {
    return null;
  }
};

const urlToCloudinaryPublicId = (url) => urlToCloudinaryAsset(url)?.publicId || null;

module.exports = { urlToCloudinaryPublicId, urlToCloudinaryAsset };