const express = require('express');
const { createProperty, getProperties, getPropertyById, searchProperties, updateProperty, deleteProperty, getPropertyContact, getRelatedProperties } = require('../controllers/propertyController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// Property endpoints
router.post('/', verifyToken, createProperty);
router.get('/search', searchProperties);
// Declared before '/:id' for clarity; the two-segment path can't collide with it.
// Public — owner contact is shown for everyone on the property detail page.
router.get('/:id/contact', getPropertyContact);
// Public: "similar properties" for the detail page. Before '/:id' so the
// bare-id route does not capture it.
router.get('/:id/related', getRelatedProperties);
router.get('/:id', getPropertyById);
router.get('/', getProperties);
router.put('/:id', verifyToken, updateProperty);
router.delete('/:id', verifyToken, deleteProperty);

module.exports = router;