import fs from 'fs';
import https from 'https';
import http from 'http';
import logger from '../utils/logger.js';

/**
 * Create HTTP or HTTPS server based on configuration
 * @param {Express} app - Express application
 * @returns {Server} HTTP or HTTPS server
 */
export const createServer = (app) => {
  const enableHttps = process.env.ENABLE_HTTPS === 'true';
  const certPath = process.env.SSL_CERT_PATH;
  const keyPath = process.env.SSL_KEY_PATH;

  if (enableHttps && certPath && keyPath) {
    try {
      const options = {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath)
      };

      logger.info('HTTPS enabled - creating secure server');
      return https.createServer(options, app);
    } catch (error) {
      logger.error(`Failed to load SSL certificates: ${error.message}`);
      logger.warn('Falling back to HTTP server');
      return http.createServer(app);
    }
  }

  if (process.env.NODE_ENV === 'production') {
    logger.warn('Running in production mode without HTTPS - this is not recommended');
  }

  // Always return an HTTP server, not the Express app
  return http.createServer(app);
};

/**
 * Middleware to redirect HTTP to HTTPS in production
 */
export const httpsRedirect = (req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.redirect(301, `https://${req.hostname}${req.url}`);
  }
  next();
};
