import express from 'express';
import {
  evaluateModel,
  evaluateAgainstSimulation,
  compareModels,
  getModelEvaluations,
  getEvaluationById,
  getAllEvaluations,
  generateAccuracyReport
} from '../controllers/evaluation.controller.js';
import { protect } from '../middleware/auth.js';
import { validate as validateRequest } from '../middleware/requestValidator.js';
import { body, param, query } from 'express-validator';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * @route   POST /api/evaluations/:modelName
 * @desc    Evaluate a prediction model against test data
 * @access  Private (Researcher, Admin)
 */
router.post(
  '/:modelName',
  [
    param('modelName').notEmpty().withMessage('Model name is required'),
    body('testData').isArray().withMessage('Test data must be an array'),
    body('actualValues').isArray().withMessage('Actual values must be an array'),
    body('simulationId').optional().isMongoId().withMessage('Invalid simulation ID')
  ],
  validateRequest,
  evaluateModel
);

/**
 * @route   POST /api/evaluations/:modelName/simulation/:simulationId
 * @desc    Evaluate model against simulation results
 * @access  Private (Researcher, Admin)
 */
router.post(
  '/:modelName/simulation/:simulationId',
  [
    param('modelName').notEmpty().withMessage('Model name is required'),
    param('simulationId').isMongoId().withMessage('Invalid simulation ID')
  ],
  validateRequest,
  evaluateAgainstSimulation
);

/**
 * @route   POST /api/evaluations/compare
 * @desc    Compare multiple models on the same test data
 * @access  Private (Researcher, Admin)
 */
router.post(
  '/compare',
  [
    body('modelNames').isArray().withMessage('Model names must be an array'),
    body('testData').isArray().withMessage('Test data must be an array'),
    body('actualValues').isArray().withMessage('Actual values must be an array')
  ],
  validateRequest,
  compareModels
);

/**
 * @route   GET /api/evaluations
 * @desc    Get all evaluations with filtering
 * @access  Private
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('modelType').optional().isIn(['lstm', 'random_forest', 'dqn', 'ppo', 'marl']).withMessage('Invalid model type'),
    query('meetsTargets').optional().isBoolean().withMessage('meetsTargets must be boolean'),
    query('sortBy').optional().isString().withMessage('sortBy must be a string'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('sortOrder must be asc or desc')
  ],
  validateRequest,
  getAllEvaluations
);

/**
 * @route   GET /api/evaluations/model/:modelName
 * @desc    Get evaluation history for a specific model
 * @access  Private
 */
router.get(
  '/model/:modelName',
  [
    param('modelName').notEmpty().withMessage('Model name is required'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  validateRequest,
  getModelEvaluations
);

/**
 * @route   GET /api/evaluations/:evaluationId
 * @desc    Get evaluation by ID
 * @access  Private
 */
router.get(
  '/:evaluationId',
  [
    param('evaluationId').isMongoId().withMessage('Invalid evaluation ID')
  ],
  validateRequest,
  getEvaluationById
);

/**
 * @route   GET /api/evaluations/:evaluationId/report
 * @desc    Generate accuracy report for an evaluation
 * @access  Private
 */
router.get(
  '/:evaluationId/report',
  [
    param('evaluationId').isMongoId().withMessage('Invalid evaluation ID')
  ],
  validateRequest,
  generateAccuracyReport
);

export default router;
