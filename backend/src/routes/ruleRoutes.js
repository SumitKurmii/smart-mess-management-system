const express = require('express');
const router = express.Router();
const ruleController = require('../controllers/ruleController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

// Get active rules (authenticated)
router.get('/', authenticate, ruleController.getRules);

// Update cutoff rules (admin only)
router.put('/', authenticate, authorize(['admin']), ruleController.updateRules);

module.exports = router;
