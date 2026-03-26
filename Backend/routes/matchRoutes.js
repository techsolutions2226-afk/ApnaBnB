const express = require('express');
const { matchPropertyToRequirements, matchRequirementsToProperties } = require('../controllers/matchController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// Matchmaking routes
router.post('/properties', verifyToken, matchPropertyToRequirements);
router.post('/requirements', verifyToken, matchRequirementsToProperties);

module.exports = router;