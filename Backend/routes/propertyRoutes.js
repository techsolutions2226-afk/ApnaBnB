const express = require('express');
const { createProperty, getProperties, updateProperty, deleteProperty } = require('../controllers/propertyController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// Property endpoints
router.post('/', verifyToken, createProperty);
router.get('/', getProperties);
router.put('/:id', verifyToken, updateProperty);
router.delete('/:id', verifyToken, deleteProperty);

module.exports = router;