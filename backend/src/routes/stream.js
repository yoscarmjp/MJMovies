import { Router } from 'express';
import { getStreamUrl } from '../controllers/streamController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/stream/:movieId — obtener URL de stream
router.get('/:movieId', optionalAuth, getStreamUrl);

export default router;
