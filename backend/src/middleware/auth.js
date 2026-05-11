import { AppError } from './errorHandler.js';
import User from '../models/User.js';
import { verifyToken, extractTokenFromHeader } from '../utils/auth.js';
import { hasPermission, hasAnyPermission } from '../config/roles.js';

/**
 * Middleware to protect routes - requires valid JWT token
 */
const protect = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return next(new AppError('Not authorized to access this route', 401, 'AUTH_REQUIRED'));
    }

    try {
      const decoded = verifyToken(token);
      
      // Ensure it's not a refresh token being used for access
      if (decoded.type === 'refresh') {
        return next(new AppError('Invalid token type', 401, 'AUTH_INVALID'));
      }

      req.user = await User.findById(decoded.id);

      if (!req.user) {
        return next(new AppError('User not found', 401, 'AUTH_INVALID'));
      }

      if (!req.user.isActive) {
        return next(new AppError('User account is inactive', 401, 'AUTH_INVALID'));
      }

      next();
    } catch (err) {
      return next(new AppError(err.message || 'Not authorized to access this route', 401, 'AUTH_INVALID'));
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to authorize based on user roles
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('User not authenticated', 401, 'AUTH_REQUIRED'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `User role '${req.user.role}' is not authorized to access this route`,
          403,
          'AUTH_INSUFFICIENT'
        )
      );
    }
    next();
  };
};

/**
 * Middleware to check if user has a specific permission
 * @param {string} permission - Required permission
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('User not authenticated', 401, 'AUTH_REQUIRED'));
    }

    if (!hasPermission(req.user.role, permission)) {
      return next(
        new AppError(
          'You do not have permission to perform this action',
          403,
          'AUTH_INSUFFICIENT'
        )
      );
    }
    next();
  };
};

/**
 * Middleware to check if user has any of the specified permissions
 * @param {...string} permissions - Required permissions (user needs at least one)
 */
const requireAnyPermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('User not authenticated', 401, 'AUTH_REQUIRED'));
    }

    if (!hasAnyPermission(req.user.role, permissions)) {
      return next(
        new AppError(
          'You do not have permission to perform this action',
          403,
          'AUTH_INSUFFICIENT'
        )
      );
    }
    next();
  };
};

export { protect, authorize, requirePermission, requireAnyPermission };
