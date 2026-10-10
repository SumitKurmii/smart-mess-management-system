const express = require('express');
const {
  submitRating,
  getMyRatings,
  getEligibleMealsToRate,
  getAdminRatings
} = require('../controllers/ratingController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authenticate);

// Student endpoints
router.post('/', submitRating);
router.get('/my', getMyRatings);
router.get('/eligible', getEligibleMealsToRate);

// Administrator endpoints
router.get('/admin', authorize(['admin']), getAdminRatings);

module.exports = router;
