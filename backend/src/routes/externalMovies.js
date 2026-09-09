import { Router } from 'express';
import {
  getTrending,
  getPopular,
  getTopRated,
  searchMovies,
  getPopularSeries,
  getTrendingSeries,
  getTopRatedSeries,
  searchSeries,
  getSeasonEpisodes,
  getTrendingAll,
  searchAll,
  getDetails,
  importContent,
  seedCatalog,
  seedSeries,
  proxyImage,
} from '../controllers/externalMoviesController.js';

const router = Router();

// Proxy de imágenes para evitar bloqueos de CORS
router.get('/image-proxy', proxyImage);

// PELÍCULAS
router.get('/movies/trending', getTrending);
router.get('/movies/popular', getPopular);
router.get('/movies/top-rated', getTopRated);
router.get('/movies/search', searchMovies);

// Rutas compatibles existentes
router.get('/trending', getTrending);
router.get('/popular', getPopular);
router.get('/top-rated', getTopRated);
router.get('/search', searchMovies);

// SERIES (TV SHOWS)
router.get('/series/popular', getPopularSeries);
router.get('/series/trending', getTrendingSeries);
router.get('/series/top-rated', getTopRatedSeries);
router.get('/series/search', searchSeries);
router.get('/series/:id/season/:seasonNumber', getSeasonEpisodes);

// COMBINADOS (TODO EL CATÁLOGO)
router.get('/all/trending', getTrendingAll);
router.get('/all/search', searchAll);
router.get('/:id', getDetails);

// IMPORTACIONES A MYSQL LOCAL
router.post('/import/:id', importContent);
router.post('/seed-popular', seedCatalog);
router.post('/seed-series', seedSeries);

export default router;
