import { validationResult } from 'express-validator';
import logger from '../utils/logger.js';

/**
 * Middleware to validate request using express-validator
 * Should be used after validation chains
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));

    logger.warn(`Validation failed for ${req.method} ${req.path}`, { errors: extractedErrors });

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: extractedErrors,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  next();
};

/**
 * Sanitize string to prevent XSS attacks
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  return str
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=/gi, '')
    // Remove iframe tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remove object/embed tags
    .replace(/<(object|embed|applet)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '')
    // Remove data: protocol (except for images in specific contexts)
    .replace(/data:(?!image\/)/gi, '')
    // Remove vbscript: protocol
    .replace(/vbscript:/gi, '')
    // Trim whitespace
    .trim();
};

/**
 * Sanitize object recursively
 * @param {any} obj - Object to sanitize
 * @returns {any} Sanitized object
 */
const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Sanitize both key and value
        const sanitizedKey = sanitizeString(key);
        sanitized[sanitizedKey] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
};

/**
 * Sanitize request body, query, and params to prevent XSS attacks
 */
export const sanitizeInput = (req, res, next) => {
  try {
    if (req.body && Object.keys(req.body).length > 0) {
      req.body = sanitizeObject(req.body);
    }
    
    if (req.query && Object.keys(req.query).length > 0) {
      req.query = sanitizeObject(req.query);
    }
    
    if (req.params && Object.keys(req.params).length > 0) {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    logger.error(`Error sanitizing input: ${error.message}`);
    next(error);
  }
};

/**
 * Prevent NoSQL injection by checking for MongoDB operators
 */
export const preventNoSQLInjection = (req, res, next) => {
  const checkForOperators = (obj) => {
    if (obj === null || obj === undefined) return false;
    
    if (typeof obj === 'string') {
      // Check for MongoDB operators in strings
      return /^\$/.test(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.some(item => checkForOperators(item));
    }
    
    if (typeof obj === 'object') {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          // Check if key starts with $ (MongoDB operator)
          if (key.startsWith('$')) {
            return true;
          }
          // Recursively check nested objects
          if (checkForOperators(obj[key])) {
            return true;
          }
        }
      }
    }
    
    return false;
  };

  try {
    // Check body, query, and params for MongoDB operators
    if (checkForOperators(req.body) || checkForOperators(req.query) || checkForOperators(req.params)) {
      logger.warn(`Potential NoSQL injection attempt detected from IP: ${req.ip}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid input detected',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    next();
  } catch (error) {
    logger.error(`Error checking for NoSQL injection: ${error.message}`);
    next(error);
  }
};

/**
 * Validate content type for POST/PUT/PATCH requests
 */
export const validateContentType = (req, res, next) => {
  const methods = ['POST', 'PUT', 'PATCH'];
  
  if (methods.includes(req.method)) {
    const contentType = req.get('Content-Type');
    
    // Allow multipart/form-data for file uploads
    if (contentType && contentType.includes('multipart/form-data')) {
      return next();
    }
    
    // Require application/json for other requests
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(415).json({
        success: false,
        error: {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'Content-Type must be application/json',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
  
  next();
};
