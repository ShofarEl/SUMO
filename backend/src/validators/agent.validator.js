import Joi from 'joi';

/**
 * Validation schema for creating an RL agent
 */
export const createAgentSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.min': 'Agent name must be at least 3 characters long',
      'string.max': 'Agent name cannot exceed 100 characters',
      'any.required': 'Agent name is required'
    }),
  algorithm: Joi.string()
    .valid('dqn', 'ppo', 'a3c')
    .required()
    .messages({
      'any.only': 'Algorithm must be one of: dqn, ppo, a3c',
      'any.required': 'Algorithm is required'
    }),
  intersectionIds: Joi.array()
    .items(Joi.string())
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one intersection ID is required',
      'any.required': 'Intersection IDs are required'
    }),
  isMultiAgent: Joi.boolean()
    .default(false),
  config: Joi.object({
    stateSpace: Joi.object().optional(),
    actionSpace: Joi.object().optional(),
    rewardFunction: Joi.string().optional(),
    networkArchitecture: Joi.object().optional(),
    hyperparameters: Joi.object({
      learningRate: Joi.number().min(0).max(1).optional(),
      gamma: Joi.number().min(0).max(1).optional(),
      epsilonStart: Joi.number().min(0).max(1).optional(),
      epsilonEnd: Joi.number().min(0).max(1).optional(),
      epsilonDecay: Joi.number().min(0).max(1).optional(),
      batchSize: Joi.number().integer().min(1).optional(),
      replayBufferSize: Joi.number().integer().min(1).optional(),
      targetUpdateFrequency: Joi.number().integer().min(1).optional(),
      hiddenSize: Joi.number().integer().min(1).optional()
    }).optional()
  }).optional().default({})
});

/**
 * Validation schema for updating an agent
 */
export const updateAgentSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Agent name must be at least 3 characters long',
      'string.max': 'Agent name cannot exceed 100 characters'
    }),
  isDeployed: Joi.boolean().optional()
}).min(1);

/**
 * Validation schema for listing agents
 */
export const listAgentsSchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10),
  algorithm: Joi.string().valid('dqn', 'ppo', 'a3c').optional(),
  trainingStatus: Joi.string()
    .valid('not_started', 'training', 'completed', 'failed')
    .optional(),
  isDeployed: Joi.boolean().optional(),
  sortBy: Joi.string()
    .valid('createdAt', 'name', 'trainingStatus', 'algorithm')
    .default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Validation schema for training an agent
 */
export const trainAgentSchema = Joi.object({
  networkFile: Joi.string()
    .required()
    .messages({
      'any.required': 'Network file path is required'
    }),
  routeFile: Joi.string()
    .required()
    .messages({
      'any.required': 'Route file path is required'
    }),
  numEpisodes: Joi.number()
    .integer()
    .min(1)
    .max(10000)
    .default(100)
    .messages({
      'number.min': 'Number of episodes must be at least 1',
      'number.max': 'Number of episodes cannot exceed 10000'
    }),
  maxStepsPerEpisode: Joi.number()
    .integer()
    .min(60)
    .max(86400)
    .default(3600)
    .messages({
      'number.min': 'Max steps per episode must be at least 60',
      'number.max': 'Max steps per episode cannot exceed 86400'
    }),
  evaluationFrequency: Joi.number()
    .integer()
    .min(1)
    .default(50)
    .messages({
      'number.min': 'Evaluation frequency must be at least 1'
    }),
  saveFrequency: Joi.number()
    .integer()
    .min(1)
    .default(10)
    .messages({
      'number.min': 'Save frequency must be at least 1'
    })
});

/**
 * Validation schema for agent performance query
 */
export const performanceQuerySchema = Joi.object({
  networkFile: Joi.string().optional(),
  routeFile: Joi.string().optional(),
  numEpisodes: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .optional()
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
