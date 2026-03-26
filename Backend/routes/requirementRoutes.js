const express = require('express');
const { createRequirement, getRequirements, updateRequirement, deleteRequirement } = require('../controllers/requirementController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// Requirement endpoints
router.post('/', verifyToken, createRequirement);
router.get('/', getRequirements);
router.put('/:id', verifyToken, updateRequirement);
router.delete('/:id', verifyToken, deleteRequirement);

module.exports = router;