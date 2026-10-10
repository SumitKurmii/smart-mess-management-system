const express = require('express');
const {
  checkIn,
  recordAdminAttendance,
  correctAttendance,
  getMyAttendance,
  getAdminAttendance,
  getAttendanceAnalytics,
  getStudentsList
} = require('../controllers/attendanceController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

const router = express.Router();

// All attendance routes require an authenticated user
router.use(authenticate);

// Student check-in & student attendance history
router.post('/check-in', checkIn);
router.get('/my', getMyAttendance);

// Administrator-only attendance management & analytics
router.post('/admin/record', authorize(['admin']), recordAdminAttendance);
router.put('/admin/:id', authorize(['admin']), correctAttendance);
router.get('/admin/list', authorize(['admin']), getAdminAttendance);
router.get('/admin/analytics', authorize(['admin']), getAttendanceAnalytics);
router.get('/admin/students', authorize(['admin']), getStudentsList);

module.exports = router;
