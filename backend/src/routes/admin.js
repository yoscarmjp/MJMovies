import { Router } from 'express';
import {
  uploadMovie,
  updateMovie,
  deleteMovie,
  getAdminMovies,
  uploadPosterHandler,
  getUsers,
  updateUserRole,
  toggleUserStatus,
  getStats,
  getTranscodeJobs,
  retranscodeMovie,
} from '../controllers/adminController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { uploadVideo, uploadPoster, validateVideoMagicBytes, validateImageMagicBytes } from '../middleware/upload.js';
import { validate, createMovieSchema, updateMovieSchema, uuidParamSchema } from '../utils/validators.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Todas las rutas admin requieren auth + rol ADMIN
router.use(authenticate, requireRole('ADMIN'));

// PELÍCULAS

// GET /api/admin/movies
router.get('/movies', getAdminMovies);

// POST /api/admin/movies — subir nueva película
router.post(
  '/movies',
  rateLimiter.upload,
  uploadVideo.single('video'),
  validateVideoMagicBytes,
  validate(createMovieSchema),
  uploadMovie
);

// PUT /api/admin/movies/:id
router.put(
  '/movies/:id',
  validate(updateMovieSchema),
  updateMovie
);

// POST /api/admin/movies/:id/poster — subir poster
router.post(
  '/movies/:id/poster',
  uploadPoster.single('poster'),
  validateImageMagicBytes,
  uploadPosterHandler
);

// POST /api/admin/movies/:id/retranscode — reintentar transcodificación
router.post('/movies/:id/retranscode', validate(uuidParamSchema), retranscodeMovie);

// DELETE /api/admin/movies/:id
router.delete('/movies/:id', validate(uuidParamSchema), deleteMovie);

// USUARIOS

// GET /api/admin/users
router.get('/users', getUsers);

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', updateUserRole);

// PUT /api/admin/users/:id/status
router.put('/users/:id/status', toggleUserStatus);

// STATS Y JOBS

// GET /api/admin/stats
router.get('/stats', getStats);

// GET /api/admin/jobs
router.get('/jobs', getTranscodeJobs);

export default router;
