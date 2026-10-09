const { errorResponse } = require('../utils/apiResponse');

/**
 * Server-side Role-Based Authorization Middleware
 * Enforces role permissions strictly at the backend route level.
 */
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Authentication required prior to authorization check.', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(
        res,
        `Access forbidden: Operation requires one of the following roles: [${allowedRoles.join(', ')}]. Your current role is '${req.user.role}'.`,
        403
      );
    }

    next();
  };
};

module.exports = authorize;
