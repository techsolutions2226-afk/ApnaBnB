const express = require('express');
const {
  getMyWishlists,
  createWishlist,
  updateWishlist,
  deleteWishlist,
  addProperty,
  removeProperty,
  removeFromAll,
} = require('../controllers/wishlistController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// All wishlist endpoints require an authenticated user.
router.get('/', verifyToken, getMyWishlists);
router.post('/', verifyToken, createWishlist);
router.put('/:id', verifyToken, updateWishlist);
router.delete('/:id', verifyToken, deleteWishlist);

router.post('/:id/properties', verifyToken, addProperty);
router.delete('/:id/properties/:propertyId', verifyToken, removeProperty);

// Remove a property from every wishlist the user owns.
router.delete('/properties/:propertyId', verifyToken, removeFromAll);

module.exports = router;
