const { errorResponse } = require('../utils/apiResponse');

/**
 * Higher-order middleware to validate incoming request data using Zod schema
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (error) {
      if (error.errors) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        return errorResponse(res, 'Validation failed', 400, formattedErrors);
      }
      return errorResponse(res, 'Validation failed: Invalid request payload', 400);
    }
  };
};

module.exports = validate;
