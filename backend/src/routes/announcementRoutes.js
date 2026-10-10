const express = require('express');
const {
  getPublishedAnnouncements,
  getAdminAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} = require('../controllers/announcementController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authenticate);

// Public/student endpoint (published only)
router.get('/', getPublishedAnnouncements);

// Administrator endpoints
router.get('/admin', authorize(['admin']), getAdminAnnouncements);
router.post('/admin', authorize(['admin']), createAnnouncement);
router.put('/admin/:id', authorize(['admin']), updateAnnouncement);
router.delete('/admin/:id', authorize(['admin']), deleteAnnouncement);

module.exports = router;
