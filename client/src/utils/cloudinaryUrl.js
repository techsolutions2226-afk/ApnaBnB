/**
 * Derive Cloudinary public_id from a delivery URL.
 * https://res.cloudinary.com/<cloud>/image/upload/v123/path/file.jpg
 * → "path/file"
 */
export function urlToCloudinaryPublicId(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const parsed = new URL(url);
    if (!/cloudinary\.com$/i.test(parsed.hostname)) return null;
    if (!parsed.pathname.includes("/image/upload/")) return null;
    let rest = parsed.pathname.split("/image/upload/")[1];
    if (!rest) return null;
    const parts = rest.split("/");
    if (parts[0] && /^v\d+$/.test(parts[0])) parts.shift();
    const publicId = parts.join("/").replace(/\.[a-zA-Z0-9]+$/, "");
    return publicId || null;
  } catch {
    return null;
  }
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
