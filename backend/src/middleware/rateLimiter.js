import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';

// Helper to generate IPv6-safe keys
const generateKey = (req) => {
  if (req.user) {
    return `user:${req.user._id.toString()}`;
  }
  // Use the built-in IP handling which is IPv6-safe
  return `ip:${req.ip}`;
};

// General API rate limiter - DISABLED IN DEVELOPMENT
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 999999, // Essentially unlimited in dev
  skip: () => process.env.NODE_ENV !== 'production', // Skip entirely in development
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please wait a few minutes before trying again.',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please wait a few minutes before trying again.',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Stricter rate limiter for authentication endpoints - DISABLED IN DEVELOPMENT
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 999999, // Essentially unlimited in dev
  skip: () => process.env.NODE_ENV !== 'production', // Skip entirely in development
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many failed login attempts. Please wait 15 minutes before trying again.',
      timestamp: new Date().toISOString()
    }
  },
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many failed login attempts. Please wait 15 minutes before trying again.',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Rate limiter for file uploads
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 uploads per hour
  message: {
    success: false,
    error: {
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      message: 'Too many file uploads, please try again later',
      timestamp: new Date().toISOString()
    }
  }
});

// Per-user rate limiter (requires authentication)
export const createUserRateLimiter = (windowMs = 15 * 60 * 1000, max = 200) => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: generateKey,
    message: {
      success: false,
      error: {
        code: 'USER_RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        timestamp: new Date().toISOString()
      }
    },
    handler: (req, res) => {
      const identifier = req.user ? `User ${req.user._id}` : `IP ${req.ip}`;
      logger.warn(`User rate limit exceeded for ${identifier}`);
      res.status(429).json({
        success: false,
        error: {
          code: 'USER_RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          timestamp: new Date().toISOString()
        }
      });
    }
  });
};

// Simulation execution rate limiter (expensive operations)
export const simulationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit to 20 simulations per hour per user
  keyGenerator: generateKey,
  message: {
    success: false,
    error: {
      code: 'SIMULATION_RATE_LIMIT_EXCEEDED',
      message: 'Too many simulation requests, please try again later',
      timestamp: new Date().toISOString()
    }
  }
});

// Training rate limiter (very expensive operations)
export const trainingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit to 5 training jobs per hour per user
  keyGenerator: generateKey,
  message: {
    success: false,
    error: {
      code: 'TRAINING_RATE_LIMIT_EXCEEDED',
      message: 'Too many training requests, please try again later',
      timestamp: new Date().toISOString()
    }
  }
});
