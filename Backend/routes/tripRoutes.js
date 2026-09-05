const express = require('express');
const {
  createTrip,
  getMyTrips,
  getTripById,
  proposeSchedule,
  confirmVisit,
  getTripContact,
  generateCheckInCode,
  getCheckInCode,
  checkInToVisit,
  completeVisit,
  cancelTrip,
} = require('../controllers/tripController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', verifyToken, createTrip);
router.get('/', verifyToken, getMyTrips);
router.get('/:id', verifyToken, getTripById);
router.get('/:id/contact', verifyToken, getTripContact);

// On-site check-in flow
router.post('/:id/checkin-code', verifyToken, generateCheckInCode);
router.get('/:id/checkin-code', verifyToken, getCheckInCode);
router.post('/:id/checkin', verifyToken, checkInToVisit);
router.post('/:id/complete', verifyToken, completeVisit);

router.put('/:id/propose-schedule', verifyToken, proposeSchedule);
router.put('/:id/confirm', verifyToken, confirmVisit);
router.put('/:id/cancel', verifyToken, cancelTrip);

module.exports = router;