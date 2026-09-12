const express = require('express');
const { createListing, getListings, getUserListings, getListingById, updateListing, deleteListing } = require('../controllers/listingController');
const verifyToken = require('../middleware/authMiddleware');
const { optionalAuth } = verifyToken;

const router = express.Router();

// Listing endpoints
router.post('/', verifyToken, createListing);
// Public reads, but optionalAuth lets the owner/admin see their own hidden
// contact fields — the edit form loads from these endpoints.
router.get('/', optionalAuth, getListings);
// Signed-in only: this is a per-user listing index (profile page, dashboards).
router.get('/user/:userId', verifyToken, getUserListings);
router.get('/search', optionalAuth, getListings); // Search properties (same handler as getListings with query params)
router.get('/:id', optionalAuth, getListingById); // Get single listing by ID
router.put('/:id', verifyToken, updateListing);
router.delete('/:id', verifyToken, deleteListing);

module.exports = router;