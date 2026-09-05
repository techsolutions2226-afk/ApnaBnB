const express = require('express');
const {
  createTrip,
  getMyTrips,
  getTripById,
  proposeSchedule,
  confirmVisit,
  getTripContact,
  cancelTrip,
} = require('../controllers/tripController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', verifyToken, createTrip);
router.get('/', verifyToken, getMyTrips);
router.get('/:id', verifyToken, getTripById);
router.get('/:id/contact', verifyToken, getTripContact);
router.put('/:id/propose-schedule', verifyToken, proposeSchedule);
router.put('/:id/confirm', verifyToken, confirmVisit);
router.put('/:id/cancel', verifyToken, cancelTrip);

module.exports = router;