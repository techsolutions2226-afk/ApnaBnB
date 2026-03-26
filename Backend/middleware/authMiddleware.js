const jwt = require('jsonwebtoken');

// Middleware to verify user token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    // Verify token and decode payload
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach decoded token payload to request
    next();
  } catch (error) {
    // Check for token expiration and return detailed error messages
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please log in again.' });
    } else {
      return res.status(403).json({ message: 'Invalid token.' });
    }
  }
};

module.exports = verifyToken;