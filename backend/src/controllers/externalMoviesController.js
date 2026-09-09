import * as movieApi from '../services/movieApiService.js';
import { logger } from '../utils/logger.js';

// PELÍCULAS

export async function getTrending(req, res, next) {
  try {
    const { timeWindow = 'week', genre, year, rating, sort } = req.query;
    const data = await movieApi.getTrendingMovies(timeWindow, { genre, year, rating, sort });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getPopular(req, res, next) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const { genre, year, rating, sort } = req.query;
    const data = await movieApi.getPopularMovies(page, { genre, year, rating, sort });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getTopRated(req, res, next) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const { genre, year, rating, sort } = req.query;
    const data = await movieApi.getTopRatedMovies(page, { genre, year, rating, sort });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function searchMovies(req, res, next) {
  try {
    const { query, page = 1 } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Parámetro query es requerido' });
    }
    const data = await movieApi.searchExternalMovies(query, parseInt(page, 10));
    res.json(data);
  } catch (error) {
    next(error);
  }
}

// SERIES

export async function getPopularSeries(req, res, next) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const { genre, year, rating, sort } = req.query;
    const data = await movieApi.getPopularSeries(page, { genre, year, rating, sort });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getTrendingSeries(req, res, next) {
  try {
    const { timeWindow = 'week', genre, year, rating, sort } = req.query;
    const data = await movieApi.getTrendingSeries(timeWindow, { genre, year, rating, sort });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getTopRatedSeries(req, res, next) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const { genre, year, rating, sort } = req.query;
    const data = await movieApi.getTopRatedSeries(page, { genre, year, rating, sort });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function searchSeries(req, res, next) {
  try {
    const { query, page = 1 } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Parámetro query es requerido' });
    }
    const data = await movieApi.searchExternalSeries(query, parseInt(page, 10));
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getSeasonEpisodes(req, res, next) {
  try {
    const { id, seasonNumber } = req.params;
    const data = await movieApi.getSeriesSeasonEpisodes(id, parseInt(seasonNumber || '1', 10));
    res.json(data);
  } catch (error) {
    next(error);
  }
}

// COMBINADOS (PELÍCULAS Y SERIES)

export async function getTrendingAll(req, res, next) {
  try {
    const { timeWindow = 'week' } = req.query;
    const data = await movieApi.getTrendingAll(timeWindow);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function searchAll(req, res, next) {
  try {
    const { query, page = 1 } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Parámetro query es requerido' });
    }
    const data = await movieApi.searchAll(query, parseInt(page, 10));
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getDetails(req, res, next) {
  try {
    const { id } = req.params;
    const { type = 'movie' } = req.query;
    const item = await movieApi.getExternalDetails(id, type);
    if (!item) {
      return res.status(404).json({ error: 'Contenido no encontrado' });
    }
    res.json(item);
  } catch (error) {
    next(error);
  }
}

// IMPORTACIÓN A MYSQL

export async function importContent(req, res, next) {
  try {
    const { id } = req.params;
    const { type = 'movie' } = req.body;
    const item = await movieApi.importToDatabase(id, type);
    res.status(201).json({
      message: `${type === 'tv' ? 'Serie' : 'Película'} importada exitosamente`,
      item,
    });
  } catch (error) {
    logger.error('Error al importar:', error.message);
    res.status(500).json({ error: error.message || 'Error al importar contenido' });
  }
}

export async function seedCatalog(req, res, next) {
  try {
    const limit = parseInt(req.query.limit || '10', 10);
    const imported = await movieApi.seedPopularCatalog(limit);
    res.json({
      message: `Se importaron ${imported.length} películas a MySQL`,
      count: imported.length,
      items: imported,
    });
  } catch (error) {
    next(error);
  }
}

export async function seedSeries(req, res, next) {
  try {
    const limit = parseInt(req.query.limit || '8', 10);
    const imported = await movieApi.seedPopularSeries(limit);
    res.json({
      message: `Se importaron ${imported.length} series a MySQL`,
      count: imported.length,
      items: imported,
    });
  } catch (error) {
    next(error);
  }
}

export async function proxyImage(req, res) {
  try {
    const { url } = req.query;
    if (!url || !url.startsWith('http')) {
      return res.status(404).send('Image URL required');
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    if (!response.ok) {
      return res.status(404).send('Image not found on remote server');
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=604800');

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    res.status(404).send('Failed to fetch image');
  }
}
