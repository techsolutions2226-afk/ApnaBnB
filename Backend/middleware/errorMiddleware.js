// Global error handler middleware.
//
// Controllers call `next(error)` on unexpected failures; anything that reaches
// here is an internal/DB error that must NOT be echoed back to the client
// (Prisma messages can leak schema/connection details). We log the full stack
// server-side and reply with a generic message. Errors that carry an explicit
// `status` below 500 (set by our own code) keep their safe message.
const errorHandler = (err, req, res, next) => {
  // Cloudinary SDK errors expose `http_code` (e.g. 400 Upload preset not found).
  const status = err.status || err.statusCode || err.http_code || 500;

  if (status >= 500) {
    console.error(err.stack || err);
    return res.status(status).json({ message: 'Internal Server Error' });
  }

  // 4xx errors thrown by our code (e.g. validate/not-found helpers) already
  // carry a client-safe message. Cloudinary 4xx messages are also safe to show.
  console.error(`${status}: ${err.message}`);
  return res.status(status).json({ message: err.message || 'Request failed.' });
};

module.exports = errorHandler;
