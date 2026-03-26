const express = require('express');
const { createRequirement, getRequirements, updateRequirement, deleteRequirement, getUserRequirements } = require('../controllers/requirementController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// Requirement endpoints
router.post('/', verifyToken, createRequirement);
router.get('/', getRequirements);
router.get('/user/:userId', getUserRequirements); // Get requirements for a specific user
router.put('/:id', verifyToken, updateRequirement);
router.delete('/:id', verifyToken, deleteRequirement);

module.exports = router;