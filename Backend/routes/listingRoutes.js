const express = require('express');
const { createListing, getListings, getUserListings, getListingById, updateListing, deleteListing } = require('../controllers/listingController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// Listing endpoints
router.post('/', verifyToken, createListing);
router.get('/', getListings);
router.get('/user/:userId', getUserListings); // Get listings for a specific user
router.get('/search', getListings); // Search properties (same handler as getListings with query params)
router.get('/:id', getListingById); // Get single listing by ID
router.put('/:id', verifyToken, updateListing);
router.delete('/:id', verifyToken, deleteListing);

module.exports = router;