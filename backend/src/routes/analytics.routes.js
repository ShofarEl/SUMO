import express from 'express';
import { 
  getMetrics, 
  compareScenarios, 
  exportData, 
  getFeasibilityAssessment,
  getChartData,
  generateReport
} from '../controllers/analytics.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/analytics/metrics - Get system-wide metrics
router.get('/metrics', getMetrics);

// POST /api/analytics/compare - Compare scenarios
router.post('/compare', compareScenarios);

// GET /api/analytics/export - Export analytics data
router.get('/export', exportData);

// GET /api/analytics/chart-data - Get chart data for visualization
router.get('/chart-data', getChartData);

// POST /api/analytics/generate-report - Generate comprehensive report
router.post('/generate-report', generateReport);

// GET /api/analytics/feasibility - Get feasibility assessment
router.get('/feasibility', getFeasibilityAssessment);

export default router;
