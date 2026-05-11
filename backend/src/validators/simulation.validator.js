import Joi from 'joi';

/**
 * Validation schema for creating a simulation
 */
export const createSimulationSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.min': 'Simulation name must be at least 3 characters long',
      'string.max': 'Simulation name cannot exceed 100 characters',
      'any.required': 'Simulation name is required'
    }),
  description: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
  config: Joi.object({
    trafficDemand: Joi.string()
      .valid('low', 'medium', 'high', 'peak')
      .required()
      .messages({
        'any.only': 'Traffic demand must be one of: low, medium, high, peak',
        'any.required': 'Traffic demand is required'
      }),
    vehicleMix: Joi.object({
      cars: Joi.number().min(0).max(100).default(55),
      motorcycles: Joi.number().min(0).max(100).default(25),
      minibuses: Joi.number().min(0).max(100).default(15),
      trucks: Joi.number().min(0).max(100).default(5)
    })
      .optional()
      .custom((value, helpers) => {
        const total = (value.cars || 0) + (value.motorcycles || 0) + 
                     (value.minibuses || 0) + (value.trucks || 0);
        if (Math.abs(total - 100) > 0.01) {
          return helpers.error('any.invalid', { 
            message: 'Vehicle mix percentages must sum to 100' 
          });
        }
        return value;
      }),
    duration: Joi.number()
      .min(60)
      .max(86400)
      .required()
      .messages({
        'number.min': 'Duration must be at least 60 seconds',
        'number.max': 'Duration cannot exceed 86400 seconds (24 hours)',
        'any.required': 'Duration is required'
      }),
    timeOfDay: Joi.string()
      .valid('morning_peak', 'off_peak', 'evening_peak')
      .required()
      .messages({
        'any.only': 'Time of day must be one of: morning_peak, off_peak, evening_peak',
        'any.required': 'Time of day is required'
      }),
    weather: Joi.string()
      .valid('clear', 'rain', 'flood')
      .default('clear')
      .messages({
        'any.only': 'Weather must be one of: clear, rain, flood'
      }),
    incidents: Joi.array()
      .items(
        Joi.object({
          type: Joi.string().required(),
          location: Joi.string().required(),
          startTime: Joi.number().min(0).required(),
          duration: Joi.number().min(0).required()
        })
      )
      .optional()
      .default([]),
    controlStrategy: Joi.string()
      .valid('fixed', 'lstm', 'rf', 'dqn', 'ppo', 'marl')
      .required()
      .messages({
        'any.only': 'Control strategy must be one of: fixed, lstm, rf, dqn, ppo, marl',
        'any.required': 'Control strategy is required'
      })
  }).required()
});

/**
 * Validation schema for updating a simulation
 */
export const updateSimulationSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Simulation name must be at least 3 characters long',
      'string.max': 'Simulation name cannot exceed 100 characters'
    }),
  description: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    })
}).min(1);

/**
 * Validation schema for query parameters
 */
export const listSimulationsSchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10),
  status: Joi.string().valid('pending', 'running', 'completed', 'failed').optional(),
  controlStrategy: Joi.string().valid('fixed', 'lstm', 'rf', 'dqn', 'ppo', 'marl').optional(),
  sortBy: Joi.string().valid('createdAt', 'name', 'status').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Middleware to validate request body against a schema
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
          message: 'Validation failed',
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
