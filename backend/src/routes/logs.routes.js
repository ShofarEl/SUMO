import express from 'express';
import {
  getLogs,
  getLogStats,
  clearLogs,
  downloadLogs
} from '../controllers/logs.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

router.get('/', getLogs);
router.get('/stats', getLogStats);
router.get('/download', downloadLogs);
router.delete('/', clearLogs);

export default router;
