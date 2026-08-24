const express = require('express');
const { createProperty, getProperties, getPropertyById, searchProperties, updateProperty, deleteProperty, getPropertyContact } = require('../controllers/propertyController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// Property endpoints
router.post('/', verifyToken, createProperty);
router.get('/search', searchProperties);
// Declared before '/:id' for clarity; the two-segment path can't collide with it.
// Auth required — the handler decides owner-vs-paid-vs-locked.
router.get('/:id/contact', verifyToken, getPropertyContact);
router.get('/:id', getPropertyById);
router.get('/', getProperties);
router.put('/:id', verifyToken, updateProperty);
router.delete('/:id', verifyToken, deleteProperty);

module.exports = router;