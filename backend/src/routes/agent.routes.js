import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  createAgent,
  getAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
  trainAgent,
  getTrainingStatus,
  deployAgent,
  getAgentPerformance
} from '../controllers/agent.controller.js';
import {
  validate,
  validateQuery,
  createAgentSchema,
  updateAgentSchema,
  listAgentsSchema,
  trainAgentSchema,
  performanceQuerySchema
} from '../validators/agent.validator.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Create agent - researchers and admins only
router.post(
  '/',
  authorize('researcher', 'admin'),
  validate(createAgentSchema),
  createAgent
);

// Get all agents with pagination
router.get(
  '/',
  validateQuery(listAgentsSchema),
  getAgents
);

// Get agent by ID
router.get('/:id', getAgentById);

// Train agent - owner or admin only
router.post(
  '/:id/train',
  authorize('researcher', 'admin'),
  validate(trainAgentSchema),
  trainAgent
);

// Get training status
router.get('/:id/training-status', getTrainingStatus);

// Deploy agent - owner or admin only
router.post(
  '/:id/deploy',
  authorize('researcher', 'admin'),
  deployAgent
);

// Get agent performance
router.get(
  '/:id/performance',
  validateQuery(performanceQuerySchema),
  getAgentPerformance
);

// Update agent - owner or admin only
router.put(
  '/:id',
  validate(updateAgentSchema),
  updateAgent
);

// Delete agent - owner or admin only
router.delete('/:id', deleteAgent);

export default router;
