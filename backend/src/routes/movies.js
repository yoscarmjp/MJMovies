import { Router } from 'express';
import {
  getMovies,
  getMovie,
  searchMovies,
  getGenres,
  updateWatchProgress,
  getWatchHistory,
  clearWatchHistory,
} from '../controllers/moviesController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validate, paginationSchema, uuidParamSchema } from '../utils/validators.js';
import { z } from 'zod';

const router = Router();

router.get('/', validate(paginationSchema), optionalAuth, getMovies);
router.get('/search', optionalAuth, searchMovies);
router.get('/genres', getGenres);
router.get('/:id', validate(uuidParamSchema), optionalAuth, getMovie);
router.post(
  '/:id/progress',
  authenticate,
  validate(z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({ position: z.number().int().min(0) }),
  })),
  updateWatchProgress
);

router.get('/user/history', authenticate, getWatchHistory);
router.delete('/user/history', authenticate, clearWatchHistory);

export default router;
