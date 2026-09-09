import { Router } from 'express';
import {
  getMovies,
  getMovie,
  searchMovies,
  getGenres,
  updateWatchProgress,
  getWatchHistory,
} from '../controllers/moviesController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validate, paginationSchema, uuidParamSchema } from '../utils/validators.js';
import { z } from 'zod';

const router = Router();

// GET /api/movies — catálogo paginado
router.get('/', validate(paginationSchema), optionalAuth, getMovies);

// GET /api/movies/search
router.get('/search', optionalAuth, searchMovies);

// GET /api/movies/genres
router.get('/genres', getGenres);

// GET /api/movies/:id
router.get('/:id', validate(uuidParamSchema), optionalAuth, getMovie);

// POST /api/movies/:id/progress — guardar progreso de reproducción
router.post(
  '/:id/progress',
  authenticate,
  validate(z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({ position: z.number().int().min(0) }),
  })),
  updateWatchProgress
);

// GET /api/movies/history — historial del usuario
router.get('/user/history', authenticate, getWatchHistory);

export default router;
