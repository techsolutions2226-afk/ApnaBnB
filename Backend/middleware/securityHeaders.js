// Lightweight security headers — dependency-free alternative to helmet.
//
// Deliberately NO Content-Security-Policy here: the app inlines styles/scripts
// and loads third-party resources (Cloudinary, Unsplash, Google Maps, Leaflet,
// pravatar, socket.io) — a strict CSP would break those pages. The headers
// below harden behavior without breaking anything.
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  // The listing form uses the Geolocation API (same-origin); everything else
  // (camera/mic/etc.) is off for all origins.
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(self), camera=(), microphone=(), payment=(), usb=()'
  );
  next();
};

module.exports = securityHeaders;