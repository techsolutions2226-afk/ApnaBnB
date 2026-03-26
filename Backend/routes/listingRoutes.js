const express = require('express');
const { createListing, getListings, updateListing, deleteListing } = require('../controllers/listingController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// Listing endpoints
router.post('/', verifyToken, createListing);
router.get('/', getListings);
router.put('/:id', verifyToken, updateListing);
router.delete('/:id', verifyToken, deleteListing);

module.exports = router;