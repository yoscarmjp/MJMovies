import { Router } from 'express';
import { getStreamUrl } from '../controllers/streamController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();
router.get('/:movieId', optionalAuth, getStreamUrl);

export default router;
