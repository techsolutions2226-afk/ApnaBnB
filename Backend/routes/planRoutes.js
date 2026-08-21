const express = require('express');
const {
  getPublicPlans,
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan,
} = require('../controllers/planController');
const verifyToken = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/adminMiddleware');

const router = express.Router();

// Public catalog — the Plans page reads this (active plans, ?role= filter).
router.get('/', getPublicPlans);

// Admin — full CRUD including inactive plans.
router.get('/all', verifyToken, adminOnly, getAllPlans);
router.post('/', verifyToken, adminOnly, createPlan);
router.put('/:id', verifyToken, adminOnly, updatePlan);
router.delete('/:id', verifyToken, adminOnly, deletePlan);

module.exports = router;
