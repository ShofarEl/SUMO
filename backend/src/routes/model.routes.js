import express from 'express';
import {
  listModels,
  getModelById,
  getModelVersions,
  deployModel,
  undeployModel,
  deleteModel,
  compareModelVersions,
  getStorageStats
} from '../controllers/model.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/ml/models
 * @desc    List all ML models with optional filtering
 * @access  Private (Researcher, Admin)
 */
router.get(
  '/',
  protect,
  authorize('researcher', 'admin'),
  listModels
);

/**
 * @route   GET /api/ml/models/:id
 * @desc    Get model details by ID
 * @access  Private (Researcher, Admin)
 */
router.get(
  '/:id',
  protect,
  authorize('researcher', 'admin'),
  getModelById
);

/**
 * @route   GET /api/ml/models/versions/:name/:type
 * @desc    Get all versions of a specific model
 * @access  Private (Researcher, Admin)
 */
router.get(
  '/versions/:name/:type',
  protect,
  authorize('researcher', 'admin'),
  getModelVersions
);

/**
 * @route   POST /api/ml/models/:id/deploy
 * @desc    Deploy a model
 * @access  Private (Researcher, Admin)
 */
router.post(
  '/:id/deploy',
  protect,
  authorize('researcher', 'admin'),
  deployModel
);

/**
 * @route   POST /api/ml/models/:id/undeploy
 * @desc    Undeploy a model
 * @access  Private (Researcher, Admin)
 */
router.post(
  '/:id/undeploy',
  protect,
  authorize('researcher', 'admin'),
  undeployModel
);

/**
 * @route   DELETE /api/ml/models/:id
 * @desc    Delete a model
 * @access  Private (Admin, Model Owner)
 */
router.delete(
  '/:id',
  protect,
  authorize('researcher', 'admin'),
  deleteModel
);

/**
 * @route   GET /api/ml/models/compare/:name/:type
 * @desc    Compare model versions
 * @access  Private (Researcher, Admin)
 */
router.get(
  '/compare/:name/:type',
  protect,
  authorize('researcher', 'admin'),
  compareModelVersions
);

/**
 * @route   GET /api/ml/models/storage/stats
 * @desc    Get model storage statistics
 * @access  Private (Admin)
 */
router.get(
  '/storage/stats',
  protect,
  authorize('admin'),
  getStorageStats
);

export default router;
