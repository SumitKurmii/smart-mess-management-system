const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

// Student bookings
router.get('/my', authenticate, bookingController.getMyBookings);
router.post('/', authenticate, bookingController.saveBooking);
router.post('/bulk', authenticate, bookingController.saveBulkBookings);

// Admin-only expected diner headcount
router.get('/headcount', authenticate, authorize(['admin']), bookingController.getHeadcount);

module.exports = router;
