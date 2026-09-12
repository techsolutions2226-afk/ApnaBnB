/**
 * Derive Cloudinary public_id + resource_type from a delivery URL.
 * https://res.cloudinary.com/<cloud>/image/upload/v123/path/file.jpg → { publicId: "path/file", resourceType: "image" }
 * https://res.cloudinary.com/<cloud>/video/upload/v123/path/file.mp4 → { publicId: "path/file", resourceType: "video" }
 */
export function urlToCloudinaryAsset(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const parsed = new URL(url);
    if (!/cloudinary\.com$/i.test(parsed.hostname)) return null;

    let marker = null;
    let resourceType = null;
    if (parsed.pathname.includes("/image/upload/")) {
      marker = "/image/upload/";
      resourceType = "image";
    } else if (parsed.pathname.includes("/video/upload/")) {
      marker = "/video/upload/";
      resourceType = "video";
    } else {
      return null;
    }

    let rest = parsed.pathname.split(marker)[1];
    if (!rest) return null;
    const parts = rest.split("/");
    if (parts[0] && /^v\d+$/.test(parts[0])) parts.shift();
    const publicId = parts.join("/").replace(/\.[a-zA-Z0-9]+$/, "");
    return publicId ? { publicId, resourceType } : null;
  } catch {
    return null;
  }
}

export function urlToCloudinaryPublicId(url) {
  return urlToCloudinaryAsset(url)?.publicId || null;
}

/**
 * True when a URL points at a directly-playable video file (Cloudinary video
 * delivery or a plain .mp4/.webm/.mov/.m4v file). Used by property pages to
 * decide between an embedded <video> player and a legacy external link.
 */
export function isDirectVideoUrl(url) {
  if (!url || typeof url !== "string") return false;
  const asset = urlToCloudinaryAsset(url);
  if (asset && asset.resourceType === "video") return true;
  return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url);
}

/** Map a photo URL (or image object) into ListingForm image shape with publicId. */
export function photoUrlToFormImage(url, { isCover = false } = {}) {
  if (!url || typeof url !== "string") return null;
  const publicId = urlToCloudinaryPublicId(url);
  return {
    url,
    ...(publicId ? { publicId } : {}),
    ...(isCover ? { isCover: true } : {}),
  };
}