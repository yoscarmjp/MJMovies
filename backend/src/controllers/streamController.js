import { prisma } from '../config/database.js';
import * as movieApi from '../services/movieApiService.js';

// Mapeo de slugs locales populares a sus IDs de TMDB y tipo
const POPULAR_TMDB_MAP = {
  'the-last-of-us': { tmdbId: 100088, mediaType: 'tv', seasons: 1 },
  'stranger-things': { tmdbId: 66732, mediaType: 'tv', seasons: 4 },
  'breaking-bad': { tmdbId: 1396, mediaType: 'tv', seasons: 5 },
  'game-of-thrones': { tmdbId: 1399, mediaType: 'tv', seasons: 8 },
  'fallout': { tmdbId: 106379, mediaType: 'tv', seasons: 1 },
  'the-boys': { tmdbId: 76479, mediaType: 'tv', seasons: 4 },
  'inception': { tmdbId: 27205, mediaType: 'movie' },
  'interstellar': { tmdbId: 157336, mediaType: 'movie' },
  'the-dark-knight': { tmdbId: 155, mediaType: 'movie' },
  'avengers-infinity-war': { tmdbId: 299536, mediaType: 'movie' },
  'avatar': { tmdbId: 19995, mediaType: 'movie' },
  'the-matrix': { tmdbId: 603, mediaType: 'movie' },
  'oppenheimer': { tmdbId: 872585, mediaType: 'movie' },
  'fight-club': { tmdbId: 550, mediaType: 'movie' },
};

export async function getStreamUrl(req, res, next) {
  try {
    const { movieId } = req.params;
    const season = parseInt(req.query.season || '1', 10);
    const episode = parseInt(req.query.episode || '1', 10);
    const requestedType = req.query.type; // 'movie' | 'tv'

    let title = 'Película';
    let tmdbId = null;
    let isTv = requestedType === 'tv';
    let localStreamPath = null;
    let numberOfSeasons = 1;

    // 1. Intentar buscar en MySQL local
    const localMovie = await prisma.movie.findUnique({
      where: { id: movieId },
      include: {
        genres: { include: { genre: true } },
      },
    }).catch(() => null);

    if (localMovie) {
      title = localMovie.title;
      localStreamPath = localMovie.streamPath;

      // Detectar si es serie por género o slug
      const hasSeriesGenre = localMovie.genres?.some((g) => g.genre?.slug === 'series');
      const mapEntry = POPULAR_TMDB_MAP[localMovie.slug];

      if (mapEntry) {
        tmdbId = mapEntry.tmdbId;
        isTv = mapEntry.mediaType === 'tv';
        numberOfSeasons = mapEntry.seasons || 1;
      } else if (hasSeriesGenre) {
        isTv = true;
      }
    } else {
      // 2. Si no está en MySQL, verificar si es ID de TMDB numérico o slug
      const parsedId = parseInt(movieId, 10);
      if (!isNaN(parsedId)) {
        tmdbId = parsedId;
        const ext = await movieApi.getExternalDetails(parsedId, requestedType || 'movie').catch(() => null);
        if (ext) {
          title = ext.title;
          isTv = ext.mediaType === 'tv';
          numberOfSeasons = ext.seasons || 1;
        }
      }
    }

    // Fallback de tmdbId si aún no se tiene
    if (!tmdbId) {
      const lower = (localMovie?.title || movieId).toLowerCase();
      for (const [key, val] of Object.entries(POPULAR_TMDB_MAP)) {
        if (lower.includes(key.replace(/-/g, ' '))) {
          tmdbId = val.tmdbId;
          isTv = val.mediaType === 'tv';
          numberOfSeasons = val.seasons || 1;
          break;
        }
      }
    }

    // Si aún no tenemos tmdbId, usar un ID por defecto para que los servidores funcionen
    const effectiveTmdbId = tmdbId || 27205;

    // Construir servidores de reproducción reales
    let servers = [];
    if (isTv) {
      servers = [
        {
          id: 'server-1',
          name: 'Servidor 1 (MultiEmbed - Español/Latino)',
          type: 'embed',
          url: `https://multiembed.mov/?video_id=${effectiveTmdbId}&tmdb=1&s=${season}&e=${episode}`,
          quality: '1080p',
          isRecommended: true,
        },
        {
          id: 'server-2',
          name: 'Servidor 2 (VidLink - HD Rápido)',
          type: 'embed',
          url: `https://vidlink.pro/tv/${effectiveTmdbId}/${season}/${episode}`,
          quality: '1080p',
        },
        {
          id: 'server-3',
          name: 'Servidor 3 (VidSrc - Multi-idioma)',
          type: 'embed',
          url: `https://vidsrc.cc/v2/embed/tv/${effectiveTmdbId}/${season}/${episode}`,
          quality: 'HD',
        },
        {
          id: 'server-4',
          name: 'Servidor 4 (AutoEmbed VIP)',
          type: 'embed',
          url: `https://player.autoembed.cc/embed/tv/${effectiveTmdbId}/${season}/${episode}`,
          quality: '720p/1080p',
        },
        {
          id: 'server-hls',
          name: 'Servidor 5 (Demo HLS Local)',
          type: 'hls',
          url: localStreamPath || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
          quality: 'Demo',
        },
      ];
    } else {
      servers = [
        {
          id: 'server-1',
          name: 'Servidor 1 (MultiEmbed - Español/Latino)',
          type: 'embed',
          url: `https://multiembed.mov/?video_id=${effectiveTmdbId}&tmdb=1`,
          quality: '1080p',
          isRecommended: true,
        },
        {
          id: 'server-2',
          name: 'Servidor 2 (VidLink - HD Rápido)',
          type: 'embed',
          url: `https://vidlink.pro/movie/${effectiveTmdbId}`,
          quality: '1080p',
        },
        {
          id: 'server-3',
          name: 'Servidor 3 (VidSrc - Multi-idioma)',
          type: 'embed',
          url: `https://vidsrc.cc/v2/embed/movie/${effectiveTmdbId}`,
          quality: 'HD',
        },
        {
          id: 'server-4',
          name: 'Servidor 4 (AutoEmbed VIP)',
          type: 'embed',
          url: `https://player.autoembed.cc/embed/movie/${effectiveTmdbId}`,
          quality: '720p/1080p',
        },
        {
          id: 'server-hls',
          name: 'Servidor 5 (Demo HLS Local)',
          type: 'hls',
          url: localStreamPath || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
          quality: 'Demo',
        },
      ];
    }

    res.json({
      movieId,
      tmdbId: effectiveTmdbId,
      title,
      mediaType: isTv ? 'tv' : 'movie',
      isTv,
      season,
      episode,
      seasonsCount: numberOfSeasons,
      streamUrl: servers[0].url,
      servers,
    });
  } catch (error) {
    next(error);
  }
}
