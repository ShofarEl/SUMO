import express from 'express';
import {
  register,
  login,
  refreshToken,
  getMe,
  logout
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';
import {
  validate,
  registerSchema,
  loginSchema,
  refreshTokenSchema
} from '../validators/auth.validator.js';

const router = express.Router();

// Public routes
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh-token', validate(refreshTokenSchema), refreshToken);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

export default router;
