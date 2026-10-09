const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');

// Public routes
router.post('/register', validate(authController.registerSchema), authController.register);
router.post('/login', validate(authController.loginSchema), authController.login);
router.post('/logout', authController.logout);

// Protected routes (require valid JWT session)
router.get('/me', authenticate, authController.getMe);

// Admin-only protected test route (enforces server-side RBAC)
router.get('/admin-only-test', authenticate, authorize(['admin']), authController.adminOnlyTest);

module.exports = router;
