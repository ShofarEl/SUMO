import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import connectDB from './config/database.js';
import { createServer, httpsRedirect } from './config/https.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { sanitizeInput, preventNoSQLInjection, validateContentType } from './middleware/requestValidator.js';
import logger from './utils/logger.js';
import { initializeWebSocket } from './services/websocket.service.js';

const app = express();

// Connect to database
connectDB();

// Trust proxy - important for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:8000'],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',') 
      : ['http://localhost:3000'];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // Cache preflight requests for 10 minutes
};

app.use(cors(corsOptions));

// HTTPS redirect in production
if (process.env.NODE_ENV === 'production') {
  app.use(httpsRedirect);
}

// Body parser with size limits
const MAX_REQUEST_SIZE = process.env.MAX_REQUEST_SIZE || '10mb';
const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE || '50mb';

app.use(express.json({ 
  limit: MAX_REQUEST_SIZE,
  verify: (req, res, buf, encoding) => {
    // Store raw body for signature verification if needed
    req.rawBody = buf.toString(encoding || 'utf8');
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: MAX_REQUEST_SIZE,
  parameterLimit: 10000 // Limit number of parameters
}));

// Request timeout middleware
app.use((req, res, next) => {
  const timeout = parseInt(process.env.REQUEST_TIMEOUT || '30000', 10);
  req.setTimeout(timeout, () => {
    logger.warn(`Request timeout for ${req.method} ${req.path}`);
    res.status(408).json({
      success: false,
      error: {
        code: 'REQUEST_TIMEOUT',
        message: 'Request timeout',
        timestamp: new Date().toISOString()
      }
    });
  });
  next();
});

// Validate content type for POST/PUT/PATCH requests
app.use(validateContentType);

// Sanitize input to prevent XSS
app.use(sanitizeInput);

// Prevent NoSQL injection
app.use(preventNoSQLInjection);

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Health check endpoint (no rate limiting)
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Import routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import mapRoutes from './routes/map.routes.js';
import simulationRoutes from './routes/simulation.routes.js';
import predictionRoutes from './routes/prediction.routes.js';
import evaluationRoutes from './routes/evaluation.routes.js';
import agentRoutes from './routes/agent.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import trafficDataRoutes from './routes/trafficData.routes.js';
import modelRoutes from './routes/model.routes.js';
import reportRoutes from './routes/report.routes.js';
import configRoutes from './routes/config.routes.js';
import logsRoutes from './routes/logs.routes.js';

// API routes
app.get('/api', (_req, res) => {
  res.json({
    success: true,
    message: 'Georgetown Traffic AI API',
    version: '1.0.0'
  });
});

// Direct GeoJSON endpoint (for testing)
app.get('/api/map/geojson', async (req, res) => {
  try {
    // Network model
    const NetworkSchema = new mongoose.Schema({
      name: String,
      location: String,
      geojson: Object,
      bbox: Object,
      createdAt: { type: Date, default: Date.now }
    });
    const Network = mongoose.models.Network || mongoose.model('Network', NetworkSchema);
    
    const network = await Network.findOne().sort({ createdAt: -1 });
    
    if (!network) {
      return res.status(404).json({
        success: false,
        message: 'Network data not found. Run: node backend/scripts/import_georgetown_data.js'
      });
    }

    res.json({
      success: true,
      data: {
        name: network.name,
        location: network.location,
        bbox: network.bbox,
        geojson: network.geojson
      }
    });
  } catch (error) {
    console.error('Error fetching GeoJSON:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching network data',
      error: error.message
    });
  }
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/simulations', simulationRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/traffic-data', trafficDataRoutes);
app.use('/api/ml/models', modelRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/config', configRoutes);
app.use('/api/logs', logsRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
      timestamp: new Date().toISOString()
    }
  });
});

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);

httpServer.listen(PORT, () => {
  const protocol = process.env.ENABLE_HTTPS === 'true' ? 'https' : 'http';
  logger.info(`Server running in ${process.env.NODE_ENV} mode on ${protocol}://localhost:${PORT}`);
});

// Initialize WebSocket server
initializeWebSocket(httpServer);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  httpServer.close(() => process.exit(1));
});

export default app;
