import Joi from 'joi';

/**
 * Validation schema for updating user
 */
export const updateUserSchema = Joi.object({
  email: Joi.string()
    .email()
    .optional()
    .messages({
      'string.email': 'Please provide a valid email address'
    }),
  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 50 characters'
    }),
  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 50 characters'
    }),
  organization: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Organization name cannot exceed 100 characters'
    })
});

/**
 * Validation schema for updating user role
 */
export const updateRoleSchema = Joi.object({
  role: Joi.string()
    .valid('admin', 'researcher', 'viewer')
    .required()
    .messages({
      'any.only': 'Role must be one of: admin, researcher, viewer',
      'any.required': 'Role is required'
    })
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
