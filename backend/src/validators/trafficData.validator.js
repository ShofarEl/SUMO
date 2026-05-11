import Joi from 'joi';

/**
 * Validation schema for creating traffic data
 */
export const createTrafficDataSchema = Joi.object({
  name: Joi.string().trim().min(3).max(100).required()
    .messages({
      'string.empty': 'Dataset name is required',
      'string.min': 'Dataset name must be at least 3 characters',
      'string.max': 'Dataset name must not exceed 100 characters'
    }),
  
  description: Joi.string().trim().max(500).allow('').optional()
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    }),
  
  source: Joi.string().valid('osm', 'google_maps', 'sris', 'gps', 'resolv', 'manual').required()
    .messages({
      'any.only': 'Source must be one of: osm, google_maps, sris, gps, resolv, manual',
      'any.required': 'Source is required'
    }),
  
  dataType: Joi.string().valid('network', 'demand', 'sensor', 'validation').required()
    .messages({
      'any.only': 'Data type must be one of: network, demand, sensor, validation',
      'any.required': 'Data type is required'
    }),
  
  metadata: Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    coverage: Joi.string().max(200).optional(),
    quality: Joi.number().min(0).max(100).optional()
  }).optional()
});

/**
 * Validation schema for listing traffic data
 */
export const listTrafficDataSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  source: Joi.string().valid('osm', 'google_maps', 'sris', 'gps', 'resolv', 'manual').optional(),
  dataType: Joi.string().valid('network', 'demand', 'sensor', 'validation').optional(),
  sortBy: Joi.string().valid('createdAt', 'name', 'source', 'dataType').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Validation schema for updating traffic data
 */
export const updateTrafficDataSchema = Joi.object({
  name: Joi.string().trim().min(3).max(100).optional(),
  description: Joi.string().trim().max(500).allow('').optional(),
  metadata: Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    coverage: Joi.string().max(200).optional(),
    quality: Joi.number().min(0).max(100).optional()
  }).optional()
}).min(1);

/**
 * Middleware to validate request body
 */
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: errors,
          timestamp: new Date().toISOString()
        }
      });
    }

    req.body = value;
    next();
  };
};

/**
 * Middleware to validate query parameters
 */
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Query validation failed',
          details: errors,
          timestamp: new Date().toISOString()
        }
      });
    }

    req.query = value;
    next();
  };
};
