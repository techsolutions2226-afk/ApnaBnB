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
  getMatchContact,
  deleteMatch,
} = require('../controllers/matchController');
const { generateMatchesForProperty } = require('../controllers/propertyController');
const { generateMatchesForRequirement } = require('../controllers/requirementController');
const prisma = require('../db/prisma');
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
router.post('/generate/property/:propertyId', verifyToken, async (req, res, next) => {
  try {
    const property = await prisma.property.findUnique({ where: { id: req.params.propertyId } });
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    const matches = await generateMatchesForProperty(property, req.user.id, { notify: true });
    res.status(200).json({ 
      message: `Generated ${matches.length} matches`,
      matches 
    });
  } catch (error) {
    next(error);
  }
});

router.post('/generate/requirement/:requirementId', verifyToken, async (req, res, next) => {
  try {
    const requirement = await prisma.requirement.findUnique({ where: { id: req.params.requirementId } });
    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found' });
    }
    
    const matches = await generateMatchesForRequirement(requirement, req.user.id, { notify: true });
    res.status(200).json({ 
      message: `Generated ${matches.length} matches`,
      matches 
    });
  } catch (error) {
    next(error);
  }
});

// Match CRUD routes - these come after
router.post('/', verifyToken, createMatch);
router.get('/', verifyToken, getMatches);
router.get('/:id/contact', verifyToken, getMatchContact); // before /:id
router.get('/:id', verifyToken, getMatchById);
router.put('/:id/status', verifyToken, updateMatchStatus);
router.delete('/:id', verifyToken, deleteMatch);

module.exports = router;