const config = require('../config/env');
const { errorResponse } = require('../utils/apiResponse');

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Validates trusted origins for state-changing requests.
 * Protects cookie-based sessions against Cross-Site Request Forgery (CSRF).
 */
const validateOriginAndCSRF = (req, res, next) => {
  // Safe read-only HTTP methods are exempt from CSRF checks
  if (SAFE_METHODS.includes(req.method)) {
    return next();
  }

  // If request uses Bearer token, it is a programmatic client (CLI/Test/IoT).
  // Bearer tokens are immune to browser ambient credential injection.
  const isBearerAuth = req.headers.authorization && req.headers.authorization.startsWith('Bearer ');
  const hasCookieSession = req.cookies && req.cookies.auth_token;

  // In test mode without cookies, allow supertest calls
  if (config.nodeEnv === 'test' && !hasCookieSession && !req.headers.origin) {
    return next();
  }

  // For state-changing requests, validate the Origin or Referer header
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  const configuredOrigins = config.frontendUrl
    ? config.frontendUrl.split(',').map(url => url.trim())
    : [];

  const trustedOrigins = [
    ...configuredOrigins,
    'https://smart-mess-frontend-sumitkurmii.vercel.app',
    'https://smart-mess-frontend.vercel.app',
    'https://smart-mess-frontend-ja5oal4oi-sumitkurmii.vercel.app',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5000',
    'http://127.0.0.1:5000'
  ].map(url => url.toLowerCase().replace(/\/$/, ''));

  let requestSource = null;
  if (origin) {
    requestSource = origin.toLowerCase().replace(/\/$/, '');
  } else if (referer) {
    try {
      const urlObj = new URL(referer);
      requestSource = `${urlObj.protocol}//${urlObj.host}`.toLowerCase();
    } catch {
      requestSource = null;
    }
  }

  // If a cookie session is being used or this is a browser state mutation,
  // origin validation is mandatory.
  if (hasCookieSession || origin) {
    if (!requestSource || !trustedOrigins.includes(requestSource)) {
      return errorResponse(
        res,
        `CSRF validation failed: Request origin '${requestSource || 'unknown'}' is not authorized.`,
        403
      );
    }
  }

  // Custom header / JSON content-type verification for browser state mutations
  // HTML form submissions cannot submit application/json with credentials cross-origin without CORS preflight
  const contentType = req.headers['content-type'] || '';
  const isJson = contentType.includes('application/json');
  const hasCustomHeader = req.headers['x-requested-with'] || req.headers['x-smart-mess-client'];

  if (hasCookieSession && !isBearerAuth && !isJson && !hasCustomHeader) {
    return errorResponse(
      res,
      'CSRF validation failed: Missing required application/json or custom request header.',
      403
    );
  }

  next();
};

module.exports = validateOriginAndCSRF;
