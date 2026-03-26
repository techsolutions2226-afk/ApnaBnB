const express = require('express');
const { matchPropertyToRequirements, matchRequirementsToProperties, getSellerBuyerMatches, getDealerBuyerMatches, getDealerDealerMatches } = require('../controllers/matchController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// Matchmaking routes
router.post('/properties', verifyToken, matchPropertyToRequirements);
router.post('/requirements', verifyToken, matchRequirementsToProperties);

// Get matches for users
router.get('/seller-buyer', getSellerBuyerMatches);
router.get('/dealer-buyer', getDealerBuyerMatches);
router.get('/dealer-dealer', getDealerDealerMatches);

module.exports = router;