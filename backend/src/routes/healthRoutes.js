const express = require('express');
const router = express.Router();
const config = require('../config/env');
const { getDBStatus } = require('../config/db');
const { getCurrentOperationalDate } = require('../utils/dateUtils');
const { successResponse } = require('../utils/apiResponse');

/**
 * GET /api/health
 * System health, database state, operational timezone, and server uptime
 */
router.get('/', (req, res) => {
  const dbStatus = getDBStatus();
  const isDbHealthy = dbStatus === 'connected';

  const healthData = {
    status: isDbHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    operationalDate: getCurrentOperationalDate(),
    timezone: config.messTimezone,
    database: dbStatus,
    uptimeSeconds: Math.floor(process.uptime()),
    environment: config.nodeEnv
  };

  return successResponse(res, healthData, 'System health check completed');
});

module.exports = router;
