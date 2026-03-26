// Middleware to ensure user has a specific role
const roleCheck = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Insufficient privileges.' });
    }
    next();
  };
};

module.exports = roleCheck;