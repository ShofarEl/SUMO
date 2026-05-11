import crypto from 'crypto';
import { AppError } from './errorHandler.js';
import logger from '../utils/logger.js';

/**
 * Middleware to verify API key for inter-service communication
 * Used to authenticate requests from Python AI service
 */
export const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const expectedApiKey = process.env.PYTHON_AI_API_KEY;

  if (!expectedApiKey) {
    logger.error('PYTHON_AI_API_KEY not configured in environment');
    return next(new AppError('API key authentication not configured', 500, 'CONFIG_ERROR'));
  }

  if (!apiKey) {
    logger.warn(`Missing API key from IP: ${req.ip}`);
    return next(new AppError('API key required', 401, 'API_KEY_REQUIRED'));
  }

  // Use constant-time comparison to prevent timing attacks
  const apiKeyBuffer = Buffer.from(apiKey);
  const expectedBuffer = Buffer.from(expectedApiKey);

  if (apiKeyBuffer.length !== expectedBuffer.length) {
    logger.warn(`Invalid API key length from IP: ${req.ip}`);
    return next(new AppError('Invalid API key', 401, 'API_KEY_INVALID'));
  }

  if (!crypto.timingSafeEqual(apiKeyBuffer, expectedBuffer)) {
    logger.warn(`Invalid API key from IP: ${req.ip}`);
    return next(new AppError('Invalid API key', 401, 'API_KEY_INVALID'));
  }

  next();
};

/**
 * Generate a secure API key
 * @returns {string} Generated API key
 */
export const generateApiKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Middleware to verify request signature for inter-service communication
 * Provides additional security layer beyond API key
 */
export const verifyRequestSignature = (req, res, next) => {
  const signature = req.headers['x-signature'];
  const timestamp = req.headers['x-timestamp'];
  const secret = process.env.INTER_SERVICE_SECRET;

  if (!secret) {
    logger.error('INTER_SERVICE_SECRET not configured in environment');
    return next(new AppError('Request signing not configured', 500, 'CONFIG_ERROR'));
  }

  if (!signature || !timestamp) {
    logger.warn(`Missing signature or timestamp from IP: ${req.ip}`);
    return next(new AppError('Request signature required', 401, 'SIGNATURE_REQUIRED'));
  }

  // Check timestamp to prevent replay attacks (5 minute window)
  const now = Date.now();
  const requestTime = parseInt(timestamp, 10);
  const timeDiff = Math.abs(now - requestTime);
  const maxTimeDiff = 5 * 60 * 1000; // 5 minutes

  if (timeDiff > maxTimeDiff) {
    logger.warn(`Request timestamp too old from IP: ${req.ip}`);
    return next(new AppError('Request timestamp expired', 401, 'SIGNATURE_EXPIRED'));
  }

  // Compute expected signature
  const payload = `${timestamp}.${req.method}.${req.path}.${req.rawBody || ''}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Use constant-time comparison
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    logger.warn(`Invalid signature length from IP: ${req.ip}`);
    return next(new AppError('Invalid request signature', 401, 'SIGNATURE_INVALID'));
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    logger.warn(`Invalid signature from IP: ${req.ip}`);
    return next(new AppError('Invalid request signature', 401, 'SIGNATURE_INVALID'));
  }

  next();
};

/**
 * Create request signature for outgoing requests to Python service
 * @param {string} method - HTTP method
 * @param {string} path - Request path
 * @param {string} body - Request body (stringified)
 * @returns {Object} Headers with signature and timestamp
 */
export const createRequestSignature = (method, path, body = '') => {
  const secret = process.env.INTER_SERVICE_SECRET;
  
  if (!secret) {
    throw new Error('INTER_SERVICE_SECRET not configured');
  }

  const timestamp = Date.now().toString();
  const payload = `${timestamp}.${method}.${path}.${body}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return {
    'x-signature': signature,
    'x-timestamp': timestamp
  };
};

export default {
  verifyApiKey,
  generateApiKey,
  verifyRequestSignature,
  createRequestSignature
};
