const { errorResponse } = require('../utils/apiResponse');

/**
 * Centralized Express Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[Unhandled Error] ${err.name}: ${err.message}`);
  if (process.env.NODE_ENV !== 'test' && err.stack) {
    console.error(err.stack);
  }

  // Handle Mongoose duplicate key errors (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return errorResponse(res, `A record with this ${field} already exists.`, 409);
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const formattedErrors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    return errorResponse(res, 'Validation Error', 400, formattedErrors);
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    const formattedErrors = (err.errors || []).map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
    return errorResponse(res, 'Validation Error', 400, formattedErrors);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 'Invalid token.', 401);
  }

  // Handle CORS origin rejection errors
  if (err.message && err.message.includes('CORS error')) {
    return errorResponse(res, err.message, 403);
  }

  // Fallback internal server error
  const message = err.message || 'An unexpected internal server error occurred.';
  return errorResponse(res, message, err.statusCode || 500);
};

module.exports = errorHandler;
