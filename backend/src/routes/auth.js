import { Router } from 'express';
import {
  register,
  login,
  logout,
  refresh,
  getMe,
  changePasswordHandler,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate, registerSchema, loginSchema } from '../utils/validators.js';

const router = Router();

// POST /api/auth/register
router.post('/register', validate(registerSchema), register);

// POST /api/auth/login
router.post('/login', validate(loginSchema), login);

// POST /api/auth/logout
router.post('/logout', authenticate, logout);

// POST /api/auth/refresh
router.post('/refresh', refresh);

// GET /api/auth/me
router.get('/me', authenticate, getMe);

// PUT /api/auth/change-password
router.put('/change-password', authenticate, changePasswordHandler);

export default router;
