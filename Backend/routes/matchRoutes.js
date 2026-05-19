const express = require('express');
const {
  matchPropertyToRequirements,
  matchRequirementsToProperties,
  createMatch,
  getMatches,
  getMatchById,
  getMyMatches,
  getSellerBuyerMatches,
  getDealerBuyerMatches,
  getDealerDealerMatches,
  updateMatchStatus,
  deleteMatch,
} = require('../controllers/matchController');
const { generateMatchesForProperty } = require('../controllers/propertyController');
const { generateMatchesForRequirement } = require('../controllers/requirementController');
const Property = require('../models/Property');
const Requirement = require('../models/Requirement');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// Match calculation routes
router.post('/properties', verifyToken, matchPropertyToRequirements);
router.post('/requirements', verifyToken, matchRequirementsToProperties);

// IMPORTANT: Specific routes must come BEFORE parameterized routes
// Get matches by type - these must be first
router.get('/mine', verifyToken, getMyMatches);
router.get('/seller-buyer', verifyToken, getSellerBuyerMatches);
router.get('/dealer-buyer', verifyToken, getDealerBuyerMatches);
router.get('/dealer-dealer', verifyToken, getDealerDealerMatches);

// Manual match generation
router.post('/generate/property/:propertyId', verifyToken, async (req, res) => {
  try {
    const property = await Property.findById(req.params.propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    const matches = await generateMatchesForProperty(property, req.user.id);
    res.status(200).json({ 
      message: `Generated ${matches.length} matches`,
      matches 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/generate/requirement/:requirementId', verifyToken, async (req, res) => {
  try {
    const requirement = await Requirement.findById(req.params.requirementId);
    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found' });
    }
    
    const matches = await generateMatchesForRequirement(requirement, req.user.id);
    res.status(200).json({ 
      message: `Generated ${matches.length} matches`,
      matches 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Match CRUD routes - these come after
router.post('/', verifyToken, createMatch);
router.get('/', verifyToken, getMatches);
router.get('/:id', verifyToken, getMatchById);
router.put('/:id/status', verifyToken, updateMatchStatus);
router.delete('/:id', verifyToken, deleteMatch);

module.exports = router;