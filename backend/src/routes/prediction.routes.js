import express from 'express';
import * as predictionController from '../controllers/prediction.controller.js';
import { protect } from '../middleware/auth.js';
import { validateRequest } from '../utils/validation.js';
import {
  lstmTrainSchema,
  rfTrainSchema,
  predictionSchema,
  compareModelsSchema
} from '../validators/prediction.validator.js';

const router = express.Router();

/**
 * All prediction routes require authentication
 */
router.use(protect);

/**
 * @route   POST /api/predictions/lstm/train
 * @desc    Train LSTM prediction model
 * @access  Private (Researcher, Admin)
 */
router.post(
  '/lstm/train',
  validateRequest(lstmTrainSchema),
  predictionController.trainLSTM
);

/**
 * @route   POST /api/predictions/lstm
 * @desc    Get LSTM prediction
 * @access  Private
 */
router.post(
  '/lstm',
  validateRequest(predictionSchema),
  predictionController.predictLSTM
);

/**
 * @route   POST /api/predictions/rf/train
 * @desc    Train Random Forest prediction model
 * @access  Private (Researcher, Admin)
 */
router.post(
  '/rf/train',
  validateRequest(rfTrainSchema),
  predictionController.trainRandomForest
);

/**
 * @route   POST /api/predictions/rf
 * @desc    Get Random Forest prediction
 * @access  Private
 */
router.post(
  '/rf',
  validateRequest(predictionSchema),
  predictionController.predictRandomForest
);

/**
 * @route   POST /api/predictions/compare
 * @desc    Compare multiple prediction models
 * @access  Private
 */
router.post(
  '/compare',
  validateRequest(compareModelsSchema),
  predictionController.compareModels
);

/**
 * @route   GET /api/predictions/history
 * @desc    Get prediction model history
 * @access  Private
 */
router.get(
  '/history',
  predictionController.getPredictionHistory
);

/**
 * @route   GET /api/predictions/models/:id
 * @desc    Get model details
 * @access  Private
 */
router.get(
  '/models/:id',
  predictionController.getModelDetails
);

/**
 * @route   DELETE /api/predictions/models/:id
 * @desc    Delete model
 * @access  Private (Owner or Admin)
 */
router.delete(
  '/models/:id',
  predictionController.deleteModel
);

export default router;
