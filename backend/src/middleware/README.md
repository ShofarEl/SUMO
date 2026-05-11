# Middleware Documentation

This directory contains all middleware used in the Georgetown Traffic AI Backend.

## Available Middleware

### 1. Error Handler (`errorHandler.js`)
Centralized error handling middleware that catches and formats all errors.

**Features:**
- Handles Mongoose errors (CastError, ValidationError, Duplicate keys)
- Handles JWT errors (Invalid token, Expired token)
- Logs all errors with Winston
- Returns consistent error response format
- Includes stack trace in development mode

**Usage:**
```javascript
import { errorHandler, AppError } from './middleware/errorHandler.js';

// Throw custom errors
throw new AppError('Resource not found', 404, 'NOT_FOUND');

// Applied at the end of middleware chain in server.js
app.use(errorHandler);
```

### 2. Rate Limiter (`rateLimiter.js`)
Protects API endpoints from abuse using rate limiting.

**Available Limiters:**
- `apiLimiter`: General API rate limiter (100 requests per 15 minutes)
- `authLimiter`: Stricter limiter for auth endpoints (5 requests per 15 minutes)
- `uploadLimiter`: Limiter for file uploads (10 uploads per hour)

**Usage:**
```javascript
import { apiLimiter, authLimiter, uploadLimiter } from './middleware/rateLimiter.js';

// Apply to all API routes
app.use('/api', apiLimiter);

// Apply to specific routes
app.post('/api/auth/login', authLimiter, loginController);
app.post('/api/traffic-data', uploadLimiter, uploadController);
```

### 3. Request Validator (`requestValidator.js`)
Validates and sanitizes incoming requests.

**Available Functions:**
- `validate`: Validates request using express-validator chains
- `sanitizeInput`: Sanitizes input to prevent XSS attacks

**Usage:**
```javascript
import { body } from 'express-validator';
import { validate, sanitizeInput } from './middleware/requestValidator.js';

// Apply globally for XSS protection
app.use(sanitizeInput);

// Use with validation chains
app.post('/api/users',
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  validate,
  createUserController
);
```

### 4. Authentication (`auth.js`)
Protects routes and verifies JWT tokens.

**Usage:**
```javascript
import { protect, authorize } from './middleware/auth.js';

// Protect route (requires authentication)
app.get('/api/simulations', protect, getSimulations);

// Protect and authorize (requires specific role)
app.delete('/api/users/:id', protect, authorize('admin'), deleteUser);
```

## Security Features

### Helmet.js
Configured with Content Security Policy to set secure HTTP headers.

### CORS
Configured to:
- Accept multiple origins from environment variable
- Support credentials
- Cache preflight requests
- Expose specific headers

### Request Size Limits
- JSON payload limit: 10MB
- URL-encoded payload limit: 10MB

### Input Sanitization
- Removes `<script>` tags
- Removes `javascript:` protocol
- Removes inline event handlers (`onclick`, etc.)

## Logging

All middleware uses Winston logger for consistent logging:
- Error logs: `logs/error.log`
- Combined logs: `logs/combined.log`
- Console output in development mode

## Environment Variables

Required environment variables:
- `NODE_ENV`: Environment mode (development/production)
- `CORS_ORIGIN`: Comma-separated list of allowed origins
- `LOG_LEVEL`: Logging level (info/debug/error)
- `PORT`: Server port (default: 5000)

## Error Response Format

All errors follow this consistent format:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {},
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Common Error Codes

- `AUTH_REQUIRED`: No authentication token provided
- `AUTH_INVALID`: Invalid or expired token
- `AUTH_INSUFFICIENT`: Insufficient permissions
- `VALIDATION_ERROR`: Request validation failed
- `NOT_FOUND`: Resource not found
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error
