import Joi from 'joi';
import logger from './logger.js';

/**
 * Common validation patterns
 */
export const validationPatterns = {
  // MongoDB ObjectId pattern
  objectId: /^[0-9a-fA-F]{24}$/,
  
  // Email pattern (more strict)
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  
  // Password pattern (at least 8 chars, 1 uppercase, 1 lowercase, 1 number)
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
  
  // URL pattern
  url: /^https?:\/\/.+/,
  
  // Alphanumeric with spaces and basic punctuation
  alphanumericExtended: /^[a-zA-Z0-9\s\-_.,'()]+$/,
  
  // Numeric only
  numeric: /^\d+$/,
  
  // Decimal number
  decimal: /^\d+(\.\d+)?$/,
};

/**
 * Common Joi schemas for reuse
 */
export const commonSchemas = {
  objectId: Joi.string()
    .pattern(validationPatterns.objectId)
    .messages({
      'string.pattern.base': 'Invalid ID format'
    }),
  
  email: Joi.string()
    .email()
    .max(255)
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.max': 'Email cannot exceed 255 characters'
    }),
  
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(validationPatterns.password)
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }),
  
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .pattern(validationPatterns.alphanumericExtended)
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'string.pattern.base': 'Name contains invalid characters'
    }),
  
  description: Joi.string()
    .trim()
    .max(1000)
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 1000 characters'
    }),
  
  url: Joi.string()
    .uri()
    .max(2048)
    .messages({
      'string.uri': 'Please provide a valid URL',
      'string.max': 'URL cannot exceed 2048 characters'
    }),
  
  pagination: {
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .messages({
        'number.base': 'Page must be a number',
        'number.integer': 'Page must be an integer',
        'number.min': 'Page must be at least 1'
      }),
    
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(10)
      .messages({
        'number.base': 'Limit must be a number',
        'number.integer': 'Limit must be an integer',
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100'
      }),
    
    sort: Joi.string()
      .valid('asc', 'desc', 'ascending', 'descending', '1', '-1')
      .default('desc')
      .messages({
        'any.only': 'Sort must be one of: asc, desc, ascending, descending, 1, -1'
      })
  },
  
  date: Joi.date()
    .iso()
    .messages({
      'date.base': 'Please provide a valid date',
      'date.format': 'Date must be in ISO 8601 format'
    }),
  
  enum: (values, fieldName = 'Value') => Joi.string()
    .valid(...values)
    .messages({
      'any.only': `${fieldName} must be one of: ${values.join(', ')}`
    }),
};

/**
 * Validate request body against a Joi schema
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} source - Source of data to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware
 */
export const validateRequest = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source];
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));

      logger.warn(`Validation failed for ${req.method} ${req.path}`, { 
        source,
        errors 
      });

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Replace the source data with validated and sanitized data
    req[source] = value;
    next();
  };
};

/**
 * Validate multiple sources (body, query, params)
 * @param {Object} schemas - Object with schemas for each source
 * @returns {Function} Express middleware
 */
export const validateMultiple = (schemas) => {
  return (req, res, next) => {
    const errors = [];
    
    for (const [source, schema] of Object.entries(schemas)) {
      const { error, value } = schema.validate(req[source], {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        errors.push(...error.details.map(detail => ({
          source,
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type
        })));
      } else {
        req[source] = value;
      }
    }

    if (errors.length > 0) {
      logger.warn(`Validation failed for ${req.method} ${req.path}`, { errors });

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors,
          timestamp: new Date().toISOString()
        }
      });
    }

    next();
  };
};

/**
 * Sanitize MongoDB query to prevent injection
 * @param {Object} query - MongoDB query object
 * @returns {Object} Sanitized query
 */
export const sanitizeMongoQuery = (query) => {
  if (!query || typeof query !== 'object') {
    return query;
  }

  const sanitized = {};
  
  for (const [key, value] of Object.entries(query)) {
    // Skip keys that start with $ (MongoDB operators)
    if (key.startsWith('$')) {
      continue;
    }
    
    // Recursively sanitize nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeMongoQuery(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Create a safe regex for MongoDB queries
 * @param {string} pattern - Regex pattern
 * @param {string} options - Regex options
 * @returns {RegExp} Safe regex
 */
export const createSafeRegex = (pattern, options = 'i') => {
  // Escape special regex characters
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, options);
};

export default {
  validationPatterns,
  commonSchemas,
  validateRequest,
  validateMultiple,
  sanitizeMongoQuery,
  createSafeRegex
};
