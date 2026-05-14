const express = require('express');
const {
  createTrip,
  getMyTrips,
  getTripById,
  cancelTrip,
} = require('../controllers/tripController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', verifyToken, createTrip);
router.get('/', verifyToken, getMyTrips);
router.get('/:id', verifyToken, getTripById);
router.put('/:id/cancel', verifyToken, cancelTrip);

module.exports = router;
