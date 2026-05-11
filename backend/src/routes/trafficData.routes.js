import express from 'express';
import multer from 'multer';
import path from 'path';
import { protect, authorize } from '../middleware/auth.js';
import {
  uploadTrafficData,
  getTrafficData,
  getTrafficDataById,
  updateTrafficData,
  deleteTrafficData,
  validateTrafficData
} from '../controllers/trafficData.controller.js';
import {
  validate,
  validateQuery,
  createTrafficDataSchema,
  updateTrafficDataSchema,
  listTrafficDataSchema
} from '../validators/trafficData.validator.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store files in uploads/traffic-data directory
    cb(null, 'uploads/traffic-data');
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `traffic-data-${uniqueSuffix}${ext}`);
  }
});

// File filter to accept only CSV, JSON, and XML files
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'text/csv',
    'application/json',
    'application/xml',
    'text/xml'
  ];
  
  const allowedExtensions = ['.csv', '.json', '.xml'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only CSV, JSON, and XML files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// All routes require authentication
router.use(protect);

// Upload traffic data - admin only
router.post(
  '/',
  authorize('admin'),
  upload.single('file'),
  validate(createTrafficDataSchema),
  uploadTrafficData
);

// Get all traffic data with pagination
router.get(
  '/',
  validateQuery(listTrafficDataSchema),
  getTrafficData
);

// Get traffic data by ID
router.get('/:id', getTrafficDataById);

// Validate traffic data
router.get('/:id/validate', validateTrafficData);

// Update traffic data - admin only
router.put(
  '/:id',
  authorize('admin'),
  validate(updateTrafficDataSchema),
  updateTrafficData
);

// Delete traffic data - admin only
router.delete('/:id', authorize('admin'), deleteTrafficData);

export default router;
