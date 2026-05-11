import express from 'express';
const router = express.Router();
import * as reportController from '../controllers/report.controller.js';
import { protect } from '../middleware/auth.js';

// All routes require authentication
router.use(protect);

// Report generation and management
router.post('/generate', reportController.generateReport);
router.get('/', reportController.getReports);
router.get('/:id', reportController.getReportById);
router.get('/:id/download', reportController.downloadReport);
router.delete('/:id', reportController.deleteReport);

export default router;
