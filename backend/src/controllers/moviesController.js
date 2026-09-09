import { prisma } from '../config/database.js';
import { cache } from '../config/redis.js';
import { NotFoundError } from '../middleware/errorHandler.js';

const CACHE_TTL = 300; // 5 minutos

export async function getMovies(req, res, next) {
  try {
    const { page, limit, search, genre, year, sort, order } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      status: 'READY',
      ...(search && {
        OR: [
          { title: { contains: search } },
          { description: { contains: search } },
        ],
      }),
      ...(year && { year: parseInt(year) }),
      ...(genre && { genres: { some: { genre: { slug: genre } } } }),
    };

    const cacheKey = `movies:list:${JSON.stringify({ page, limit, search, genre, year, sort, order })}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const [movies, total] = await Promise.all([
      prisma.movie.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort]: order },
        select: {
          id: true,
          title: true,
          slug: true,
          year: true,
          duration: true,
          rating: true,
          posterUrl: true,
          backdropUrl: true,
          featured: true,
          views: true,
          status: true,
          genres: { select: { genre: { select: { name: true, slug: true } } } },
        },
      }),
      prisma.movie.count({ where }),
    ]);

    const result = {
      movies: movies.map((m) => ({
        ...m,
        genres: m.genres.map((g) => g.genre),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };

    await cache.set(cacheKey, result, CACHE_TTL);
    res.set('X-Total-Count', total.toString());
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getMovie(req, res, next) {
  try {
    const { id } = req.params;

    const cacheKey = `movie:${id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const movie = await prisma.movie.findUnique({
      where: { id },
      include: {
        genres: { select: { genre: { select: { name: true, slug: true } } } },
      },
    });

    if (!movie || movie.status !== 'READY') {
      throw new NotFoundError('Película');
    }

    // Incrementar views de forma no bloqueante
    prisma.movie.update({
      where: { id },
      data: { views: { increment: 1 } },
    }).catch(() => {});

    const result = { ...movie, genres: movie.genres.map((g) => g.genre) };
    await cache.set(cacheKey, result, CACHE_TTL);

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function searchMovies(req, res, next) {
  try {
    const query = String(req.query.q || '').substring(0, 100);
    if (!query || query.length < 2) {
      return res.json({ movies: [] });
    }

    const movies = await prisma.movie.findMany({
      where: {
        status: 'READY',
        OR: [
          { title: { contains: query } },
          { director: { contains: query } },
        ],
      },
      take: 10,
      select: {
        id: true,
        title: true,
        slug: true,
        year: true,
        posterUrl: true,
        rating: true,
      },
    });

    res.json({ movies });
  } catch (error) {
    next(error);
  }
}

export async function getGenres(req, res, next) {
  try {
    const cacheKey = 'genres:all';
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const genres = await prisma.genre.findMany({
      orderBy: { name: 'asc' },
    });

    await cache.set(cacheKey, { genres }, 3600); // 1 hora
    res.json({ genres });
  } catch (error) {
    next(error);
  }
}

export async function updateWatchProgress(req, res, next) {
  try {
    const { id: movieId } = req.params;
    const { position } = req.body;
    const userId = req.user.id;

    // Verificar que la película existe
    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
      select: { id: true, duration: true },
    });

    if (!movie) throw new NotFoundError('Película');

    const completed = movie.duration ? position >= movie.duration * 0.9 : false;

    await prisma.watchHistory.upsert({
      where: { userId_movieId: { userId, movieId } },
      update: { position, completed },
      create: { userId, movieId, position, completed },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function getWatchHistory(req, res, next) {
  try {
    const userId = req.user.id;

    const history = await prisma.watchHistory.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: {
        movie: {
          select: {
            id: true,
            title: true,
            posterUrl: true,
            duration: true,
          },
        },
      },
    });

    res.json({ history });
  } catch (error) {
    next(error);
  }
}
