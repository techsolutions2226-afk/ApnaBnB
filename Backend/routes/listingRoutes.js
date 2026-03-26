const express = require('express');
const { createListing, getListings, updateListing, deleteListing, getUserListings } = require('../controllers/listingController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// Listing endpoints
router.post('/', verifyToken, createListing);
router.get('/', getListings);
router.put('/:id', verifyToken, updateListing);
router.delete('/:id', verifyToken, deleteListing);
router.get('/user/:userId', getUserListings); // Get listings for a specific user - must be after /:id routes

module.exports = router;