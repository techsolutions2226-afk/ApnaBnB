const express = require('express');
const { createRequirement, getRequirements, getUserRequirements, searchRequirements, updateRequirement, deleteRequirement, getRequirementById } = require('../controllers/requirementController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// Requirement endpoints
router.post('/', verifyToken, createRequirement);
router.get('/search', searchRequirements); // Search must come before :id
router.get('/', getRequirements);
router.get('/user/:userId', getUserRequirements); // Get requirements for a specific user
router.get('/:id', getRequirementById); // Get single requirement by ID
router.put('/:id', verifyToken, updateRequirement);
router.delete('/:id', verifyToken, deleteRequirement);

module.exports = router;