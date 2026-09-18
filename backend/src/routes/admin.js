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

router.use(authenticate, requireRole('ADMIN'));
router.get('/movies', getAdminMovies);
router.post(
  '/movies',
  rateLimiter.upload,
  uploadVideo.single('video'),
  validateVideoMagicBytes,
  validate(createMovieSchema),
  uploadMovie
);

router.put(
  '/movies/:id',
  validate(updateMovieSchema),
  updateMovie
);

router.post(
  '/movies/:id/poster',
  uploadPoster.single('poster'),
  validateImageMagicBytes,
  uploadPosterHandler
);

router.post('/movies/:id/retranscode', validate(uuidParamSchema), retranscodeMovie);
router.delete('/movies/:id', validate(uuidParamSchema), deleteMovie);
router.get('/users', getUsers);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/status', toggleUserStatus);
router.get('/stats', getStats);
router.get('/jobs', getTranscodeJobs);

export default router;
