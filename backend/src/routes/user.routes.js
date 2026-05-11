import express from 'express';
import {
  getUsers,
  getUserById,
  updateUser,
  updateUserRole,
  toggleUserStatus,
  deleteUser
} from '../controllers/user.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate, updateUserSchema, updateRoleSchema } from '../validators/user.validator.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id', validate(updateUserSchema), updateUser);
router.patch('/:id/role', validate(updateRoleSchema), updateUserRole);
router.patch('/:id/status', toggleUserStatus);
router.delete('/:id', deleteUser);

export default router;
