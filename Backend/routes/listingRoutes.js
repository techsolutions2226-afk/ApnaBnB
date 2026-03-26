const express = require('express');
const { createListing, getListings, updateListing, deleteListing, getUserListings } = require('../controllers/listingController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// Listing endpoints
router.post('/', verifyToken, createListing);
router.get('/', getListings);
router.get('/user/:userId', getUserListings); // Get listings for a specific user
router.put('/:id', verifyToken, updateListing);
router.delete('/:id', verifyToken, deleteListing);

module.exports = router;