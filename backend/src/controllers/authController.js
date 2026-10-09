const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const config = require('../config/env');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Validation Schemas
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Valid email address is required').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  hostelRoom: z.string().max(20).optional().default(''),
  dietaryPreference: z.enum(['veg', 'non-veg', 'jain']).optional().default('veg')
  // Note: 'role' is intentionally omitted from the schema.
  // Any client-supplied role is discarded, and the server strictly assigns 'student'.
});

const loginSchema = z.object({
  email: z.string().email('Valid email address is required').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required')
});

/**
 * Signs JWT token containing user id and verified server role
 */
const signToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
};

/**
 * Sets secure httpOnly cookie on response
 */
const setAuthCookie = (res, token) => {
  const isProduction = config.nodeEnv === 'production';
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/'
  });
};

/**
 * POST /api/auth/register
 * Public registration endpoint - always creates a student account.
 */
const register = async (req, res, next) => {
  try {
    const validatedData = registerSchema.parse(req.body);

    // Check if email already registered
    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      return errorResponse(res, 'An account with this email address already exists.', 409);
    }

    // Hash password with salt rounds = 10
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(validatedData.password, salt);

    // Server-enforced role: ALWAYS 'student', strictly ignoring any client input
    const user = await User.create({
      name: validatedData.name,
      email: validatedData.email,
      passwordHash,
      role: 'student', // Non-negotiable server-side assignment
      hostelRoom: validatedData.hostelRoom,
      dietaryPreference: validatedData.dietaryPreference
    });

    const token = signToken(user);
    setAuthCookie(res, token);

    return successResponse(
      res,
      {
        user: user.toSafeObject(),
        token // Included for programmatic clients/tests
      },
      'Student account registered successfully',
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Authenticates user credentials and issues session cookie + JWT
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Fetch user including the passwordHash field
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return errorResponse(res, 'Invalid email or password.', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'This account has been deactivated.', 403);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, 'Invalid email or password.', 401);
    }

    const token = signToken(user);
    setAuthCookie(res, token);

    return successResponse(
      res,
      {
        user: user.toSafeObject(),
        token
      },
      'Login successful'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 * Clears the session cookie
 */
const logout = (req, res) => {
  const isProduction = config.nodeEnv === 'production';
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/'
  });

  return successResponse(res, null, 'Logged out successfully');
};

/**
 * GET /api/auth/me
 * Returns current authenticated user session
 */
const getMe = (req, res) => {
  return successResponse(
    res,
    {
      user: req.user.toSafeObject()
    },
    'Current user session retrieved'
  );
};

/**
 * GET /api/auth/admin-only-test
 * Verification endpoint demonstrating server-side RBAC restriction
 */
const adminOnlyTest = (req, res) => {
  return successResponse(
    res,
    {
      confirmedRole: req.user.role,
      adminId: req.user._id
    },
    'Admin privileges confirmed: Server authorization passed'
  );
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  adminOnlyTest,
  registerSchema,
  loginSchema
};
