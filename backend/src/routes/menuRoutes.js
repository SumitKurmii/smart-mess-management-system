const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

// Read menus (authenticated students & admins)
router.get('/daily', authenticate, menuController.getDailyMenu);
router.get('/weekly', authenticate, menuController.getWeeklyMenu);

// Admin-only management
router.post('/', authenticate, authorize(['admin']), menuController.createOrUpdateMenu);
router.delete('/:id', authenticate, authorize(['admin']), menuController.deleteMenu);

module.exports = router;
