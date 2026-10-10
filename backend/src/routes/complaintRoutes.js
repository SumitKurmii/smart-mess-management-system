const express = require('express');
const {
  submitComplaint,
  getMyComplaints,
  getAdminComplaints,
  updateComplaintStatus
} = require('../controllers/complaintController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authenticate);

// Student endpoints (strict isolation)
router.post('/', submitComplaint);
router.get('/my', getMyComplaints);

// Administrator endpoints
router.get('/admin', authorize(['admin']), getAdminComplaints);
router.put('/admin/:id', authorize(['admin']), updateComplaintStatus);

module.exports = router;
