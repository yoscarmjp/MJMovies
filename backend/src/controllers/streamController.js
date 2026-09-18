import { prisma } from '../config/database.js';
import * as movieApi from '../services/movieApiService.js';

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
    const requestedType = req.query.type;

    let title = 'Película';
    let tmdbId = null;
    let isTv = requestedType === 'tv';
    let localStreamPath = null;
    let numberOfSeasons = 1;

    const localMovie = await prisma.movie.findUnique({
      where: { id: movieId },
      include: {
        genres: { include: { genre: true } },
      },
    }).catch(() => null);

    if (localMovie) {
      title = localMovie.title;
      localStreamPath = localMovie.streamPath;

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

    const effectiveTmdbId = tmdbId || 27205;

    const requestedLang = (req.query.lang || 'es').toLowerCase();
    const isEn = requestedLang.startsWith('en');
    const langCode = isEn ? 'en' : 'es';

    let servers = [];
    if (isTv) {
      if (langCode === 'es') {
        servers = [
          {
            id: 'server-unlimplay',
            name: 'Servidor 1 (Audio Latino / Español - Recomendado)',
            type: 'embed',
            url: `https://unlimplay.com/f/embed/tv/${effectiveTmdbId}/${season}/${episode}`,
            quality: '1080p',
            isRecommended: true,
          },
          {
            id: 'server-latino',
            name: 'Servidor 2 (Latino VIP - Audio Español)',
            type: 'embed',
            url: `https://embed69.org/tv/${effectiveTmdbId}/${season}/${episode}`,
            quality: '1080p',
          },
          {
            id: 'server-vix',
            name: 'Servidor 3 (VixSrc - Multi-Audio / Sub)',
            type: 'embed',
            url: `https://vixsrc.to/tv/${effectiveTmdbId}/${season}/${episode}?lang=es`,
            quality: '1080p',
          },
          {
            id: 'server-multiembed',
            name: 'Servidor 4 (MultiEmbed - Alterno)',
            type: 'embed',
            url: `https://multiembed.mov/?video_id=${effectiveTmdbId}&tmdb=1&s=${season}&e=${episode}`,
            quality: '1080p',
          },
          {
            id: 'server-vidlink',
            name: 'Servidor 5 (VidLink - Sub/Español)',
            type: 'embed',
            url: `https://vidlink.pro/tv/${effectiveTmdbId}/${season}/${episode}?sub=es&lang=es&primaryColor=e50914`,
            quality: '1080p',
          },
          {
            id: 'server-hls',
            name: 'Servidor 6 (Demo HLS Local)',
            type: 'hls',
            url: localStreamPath || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            quality: 'Demo',
          },
        ];
      } else {
        servers = [
          {
            id: 'server-vix',
            name: 'Servidor 1 (VixSrc - English 1080p)',
            type: 'embed',
            url: `https://vixsrc.to/tv/${effectiveTmdbId}/${season}/${episode}?lang=en`,
            quality: '1080p',
            isRecommended: true,
          },
          {
            id: 'server-multiembed',
            name: 'Servidor 2 (MultiEmbed - English Original)',
            type: 'embed',
            url: `https://multiembed.mov/?video_id=${effectiveTmdbId}&tmdb=1&s=${season}&e=${episode}`,
            quality: '1080p',
          },
          {
            id: 'server-vidlink',
            name: 'Servidor 3 (VidLink - English HD)',
            type: 'embed',
            url: `https://vidlink.pro/tv/${effectiveTmdbId}/${season}/${episode}?primaryColor=e50914`,
            quality: '1080p',
          },
          {
            id: 'server-unlimplay',
            name: 'Servidor 4 (UnLimPlay - Multi)',
            type: 'embed',
            url: `https://unlimplay.com/f/embed/tv/${effectiveTmdbId}/${season}/${episode}`,
            quality: '1080p',
          },
          {
            id: 'server-latino',
            name: 'Servidor 5 (Latino VIP)',
            type: 'embed',
            url: `https://embed69.org/tv/${effectiveTmdbId}/${season}/${episode}`,
            quality: '1080p',
          },
          {
            id: 'server-hls',
            name: 'Servidor 6 (Demo HLS Local)',
            type: 'hls',
            url: localStreamPath || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            quality: 'Demo',
          },
        ];
      }
    } else {
      if (langCode === 'es') {
        servers = [
          {
            id: 'server-unlimplay',
            name: 'Servidor 1 (Audio Latino / Español - Recomendado)',
            type: 'embed',
            url: `https://unlimplay.com/f/embed/movie/${effectiveTmdbId}`,
            quality: '1080p',
            isRecommended: true,
          },
          {
            id: 'server-latino',
            name: 'Servidor 2 (Latino VIP - Audio Español)',
            type: 'embed',
            url: `https://embed69.org/movie/${effectiveTmdbId}`,
            quality: '1080p',
          },
          {
            id: 'server-vix',
            name: 'Servidor 3 (VixSrc - Multi-Audio / Sub)',
            type: 'embed',
            url: `https://vixsrc.to/movie/${effectiveTmdbId}?lang=es`,
            quality: '1080p',
          },
          {
            id: 'server-multiembed',
            name: 'Servidor 4 (MultiEmbed - Alterno)',
            type: 'embed',
            url: `https://multiembed.mov/?video_id=${effectiveTmdbId}&tmdb=1`,
            quality: '1080p',
          },
          {
            id: 'server-vidlink',
            name: 'Servidor 5 (VidLink - Sub/Español)',
            type: 'embed',
            url: `https://vidlink.pro/movie/${effectiveTmdbId}?sub=es&lang=es&primaryColor=e50914`,
            quality: '1080p',
          },
          {
            id: 'server-hls',
            name: 'Servidor 6 (Demo HLS Local)',
            type: 'hls',
            url: localStreamPath || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            quality: 'Demo',
          },
        ];
      } else {
        servers = [
          {
            id: 'server-vix',
            name: 'Servidor 1 (VixSrc - English 1080p)',
            type: 'embed',
            url: `https://vixsrc.to/movie/${effectiveTmdbId}?lang=en`,
            quality: '1080p',
            isRecommended: true,
          },
          {
            id: 'server-multiembed',
            name: 'Servidor 2 (MultiEmbed - English Original)',
            type: 'embed',
            url: `https://multiembed.mov/?video_id=${effectiveTmdbId}&tmdb=1`,
            quality: '1080p',
          },
          {
            id: 'server-vidlink',
            name: 'Servidor 3 (VidLink - English HD)',
            type: 'embed',
            url: `https://vidlink.pro/movie/${effectiveTmdbId}?primaryColor=e50914`,
            quality: '1080p',
          },
          {
            id: 'server-unlimplay',
            name: 'Servidor 4 (UnLimPlay - Multi)',
            type: 'embed',
            url: `https://unlimplay.com/f/embed/movie/${effectiveTmdbId}`,
            quality: '1080p',
          },
          {
            id: 'server-latino',
            name: 'Servidor 5 (Latino VIP)',
            type: 'embed',
            url: `https://embed69.org/movie/${effectiveTmdbId}`,
            quality: '1080p',
          },
          {
            id: 'server-hls',
            name: 'Servidor 6 (Demo HLS Local)',
            type: 'hls',
            url: localStreamPath || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            quality: 'Demo',
          },
        ];
      }
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
