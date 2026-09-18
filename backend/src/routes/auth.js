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

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/logout', authenticate, logout);
router.post('/refresh', refresh);
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, changePasswordHandler);

export default router;
