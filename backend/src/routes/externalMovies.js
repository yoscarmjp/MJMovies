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

router.get('/image-proxy', proxyImage);
router.get('/movies/trending', getTrending);
router.get('/movies/popular', getPopular);
router.get('/movies/top-rated', getTopRated);
router.get('/movies/search', searchMovies);
router.get('/trending', getTrending);
router.get('/popular', getPopular);
router.get('/top-rated', getTopRated);
router.get('/search', searchMovies);
router.get('/series/popular', getPopularSeries);
router.get('/series/trending', getTrendingSeries);
router.get('/series/top-rated', getTopRatedSeries);
router.get('/series/search', searchSeries);
router.get('/series/:id/season/:seasonNumber', getSeasonEpisodes);

router.get('/all/trending', getTrendingAll);
router.get('/all/search', searchAll);
router.get('/:id', getDetails);
router.post('/import/:id', importContent);
router.post('/seed-popular', seedCatalog);
router.post('/seed-series', seedSeries);

export default router;
