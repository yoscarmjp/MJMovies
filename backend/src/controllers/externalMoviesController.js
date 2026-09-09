import * as movieApi from '../services/movieApiService.js';
import { logger } from '../utils/logger.js';

// PELÍCULAS

export async function getTrending(req, res, next) {
  try {
    const { timeWindow = 'week' } = req.query;
    const data = await movieApi.getTrendingMovies(timeWindow);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getPopular(req, res, next) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const data = await movieApi.getPopularMovies(page);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getTopRated(req, res, next) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const data = await movieApi.getTopRatedMovies(page);
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
    const data = await movieApi.getPopularSeries(page);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getTrendingSeries(req, res, next) {
  try {
    const { timeWindow = 'week' } = req.query;
    const data = await movieApi.getTrendingSeries(timeWindow);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getTopRatedSeries(req, res, next) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const data = await movieApi.getTopRatedSeries(page);
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
  const fallbackSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1a1a24;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0f0f14;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="500" height="750" fill="url(#grad)" />
      <circle cx="250" cy="340" r="60" fill="rgba(229,9,20,0.15)" />
      <text x="250" y="360" font-size="56" text-anchor="middle" fill="#e50914" font-family="sans-serif">🎬</text>
      <text x="250" y="440" font-size="24" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="bold">MJMovies</text>
      <text x="250" y="475" font-size="14" text-anchor="middle" fill="#888899" font-family="sans-serif">Poster no disponible</text>
    </svg>
  `.trim();

  try {
    const { url } = req.query;
    if (!url || !url.startsWith('http')) {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(fallbackSvg);
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    if (!response.ok) {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(fallbackSvg);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=604800');

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(fallbackSvg);
  }
}
