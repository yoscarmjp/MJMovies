import api from './api.js';

export const movieService = {
  getMovies(params = {}) {
    return api.get('/movies', { params });
  },

  getMovie(id) {
    return api.get(`/movies/${id}`);
  },

  getGenres() {
    return api.get('/movies/genres');
  },

  searchLocal(query) {
    return api.get('/movies/search', { params: { q: query } });
  },

  getExternalTrending(timeWindow = 'week') {
    return api.get('/external-movies/trending', { params: { timeWindow } });
  },

  getExternalPopular(page = 1) {
    return api.get('/external-movies/popular', { params: { page } });
  },

  getExternalTopRated(page = 1) {
    return api.get('/external-movies/top-rated', { params: { page } });
  },

  searchExternal(query, page = 1) {
    return api.get('/external-movies/search', { params: { query, page } });
  },

  getExternalDetails(id) {
    return api.get(`/external-movies/${id}`);
  },

  importMovie(tmdbId) {
    return api.post(`/external-movies/import/${tmdbId}`);
  },

  seedPopularMovies(limit = 10) {
    return api.post('/external-movies/seed-popular', null, { params: { limit } });
  },
};

export default movieService;
