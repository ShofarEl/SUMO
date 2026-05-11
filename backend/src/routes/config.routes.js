import express from 'express';
import {
  getConfigs,
  getConfigByKey,
  upsertConfig,
  deleteConfig,
  initializeDefaults
} from '../controllers/config.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

router.get('/', getConfigs);
router.post('/initialize', initializeDefaults);
router.get('/:key', getConfigByKey);
router.put('/:key', upsertConfig);
router.delete('/:key', deleteConfig);

export default router;
