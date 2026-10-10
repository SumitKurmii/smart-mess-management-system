const express = require('express');
const {
  submitRequest,
  getMyRequests,
  getAdminRequests,
  updateRequestStatus
} = require('../controllers/requestController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authenticate);

// Student endpoints
router.post('/', submitRequest);
router.get('/my', getMyRequests);

// Administrator endpoints
router.get('/admin', authorize(['admin']), getAdminRequests);
router.put('/admin/:id', authorize(['admin']), updateRequestStatus);

module.exports = router;
