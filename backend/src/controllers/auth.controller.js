import User from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateTokens, verifyToken } from '../utils/auth.js';
import logger from '../utils/logger.js';

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, organization } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('User with this email already exists', 400, 'VALIDATION_ERROR'));
    }

    // Create user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      organization,
      role: 'viewer' // Default role
    });

    // Generate tokens
    const tokens = generateTokens(user._id);

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      success: true,
      data: {
        user: user.toPublicJSON(),
        ...tokens
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return next(new AppError('Invalid credentials', 401, 'AUTH_FAILED'));
    }

    // Check if user is active
    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated. Please contact an administrator.', 401, 'AUTH_FAILED'));
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return next(new AppError('Invalid credentials', 401, 'AUTH_FAILED'));
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const tokens = generateTokens(user._id);

    logger.info(`User logged in: ${email}`);

    res.status(200).json({
      success: true,
      data: {
        user: user.toPublicJSON(),
        ...tokens
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(new AppError('Refresh token is required', 400, 'VALIDATION_ERROR'));
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyToken(refreshToken);
    } catch (error) {
      return next(new AppError('Invalid or expired refresh token', 401, 'AUTH_INVALID'));
    }

    // Ensure it's a refresh token
    if (decoded.type !== 'refresh') {
      return next(new AppError('Invalid token type', 401, 'AUTH_INVALID'));
    }

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new AppError('User not found', 401, 'AUTH_INVALID'));
    }

    if (!user.isActive) {
      return next(new AppError('User account is inactive', 401, 'AUTH_INVALID'));
    }

    // Generate new tokens
    const tokens = generateTokens(user._id);

    res.status(200).json({
      success: true,
      data: tokens
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return next(new AppError('User not found', 404, 'NOT_FOUND'));
    }

    res.status(200).json({
      success: true,
      data: {
        user: user.toPublicJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user (client-side token removal)
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = async (req, res, next) => {
  try {
    logger.info(`User logged out: ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};
