const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');
const { errorResponse } = require('../utils/apiResponse');

/**
 * Authentication Middleware:
 * Primary mechanism: httpOnly cookie named 'auth_token' for browser sessions.
 * Secondary mechanism: 'Authorization: Bearer <token>' for automated tests and programmatic clients.
 */
const authenticate = async (req, res, next) => {
  let token = null;
  let authType = null;

  // 1. Check primary browser cookie
  if (req.cookies && req.cookies.auth_token) {
    token = req.cookies.auth_token;
    authType = 'cookie';
  }
  // 2. Check fallback Authorization header (for programmatic clients & test suites)
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
    authType = 'bearer';
  }

  if (!token) {
    return errorResponse(res, 'Authentication required. No token provided.', 401);
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);

    // Verify user still exists in database and is active
    const user = await User.findById(decoded.id);
    if (!user) {
      return errorResponse(res, 'User session invalid. User no longer exists.', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'Account has been deactivated.', 403);
    }

    // Attach authenticated user and session metadata
    req.user = user;
    req.authType = authType;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Session expired. Please log in again.', 401);
    }
    return errorResponse(res, 'Invalid authentication token.', 401);
  }
};

module.exports = authenticate;
