import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  createSimulation,
  getSimulations,
  getSimulationById,
  updateSimulation,
  deleteSimulation,
  runSimulation,
  getSimulationStatus,
  getSimulationResults
} from '../controllers/simulation.controller.js';
import {
  validate,
  validateQuery,
  createSimulationSchema,
  updateSimulationSchema,
  listSimulationsSchema
} from '../validators/simulation.validator.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Create simulation - researchers and admins only
router.post(
  '/',
  authorize('researcher', 'admin'),
  validate(createSimulationSchema),
  createSimulation
);

// Get all simulations with pagination
router.get(
  '/',
  validateQuery(listSimulationsSchema),
  getSimulations
);

// Get simulation by ID
router.get('/:id', getSimulationById);

// Run simulation - owner or admin only
router.post('/:id/run', authorize('researcher', 'admin'), runSimulation);

// Get simulation status
router.get('/:id/status', getSimulationStatus);

// Get simulation results
router.get('/:id/results', getSimulationResults);

// Update simulation - owner or admin only
router.put(
  '/:id',
  validate(updateSimulationSchema),
  updateSimulation
);

// Delete simulation - owner or admin only
router.delete('/:id', deleteSimulation);

export default router;
