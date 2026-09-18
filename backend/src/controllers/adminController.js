import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import slugify from 'slugify';
import { prisma } from '../config/database.js';
import { cache } from '../config/redis.js';
import { getTranscodeQueue } from '../jobs/transcodeQueue.js';
import { getVideoInfo, deleteMovieFiles } from '../services/ffmpegService.js';
import { NotFoundError, AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

function generateSlug(title) {
  return slugify(title, { lower: true, strict: true }) + '-' + Date.now();
}

export async function getAdminMovies(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [movies, total] = await Promise.all([
      prisma.movie.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          genres: { select: { genre: { select: { name: true } } } },
          transcodeJobs: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.movie.count(),
    ]);

    res.json({
      movies: movies.map((m) => ({
        ...m,
        genres: m.genres.map((g) => g.genre),
        latestJob: m.transcodeJobs[0] || null,
        transcodeJobs: undefined,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
}

export async function uploadMovie(req, res, next) {
  try {
    if (!req.file) {
      throw new AppError('No se recibió ningún archivo de video', 400);
    }

    const { title, description, year, director, rating, language, genres, cast, featured } = req.body;

    let videoInfo = {};
    try {
      videoInfo = await getVideoInfo(req.file.path);
    } catch {
    }

    const movie = await prisma.movie.create({
      data: {
        title,
        slug: generateSlug(title),
        description,
        year: year ? parseInt(year) : null,
        director,
        rating: rating ? parseFloat(rating) : null,
        language: language || 'es',
        cast: cast ? (Array.isArray(cast) ? cast : [cast]) : [],
        featured: featured === 'true' || featured === true,
        originalFile: req.file.path,
        fileSize: BigInt(req.file.size),
        status: 'PENDING',
      },
    });

    if (genres && genres.length > 0) {
      const genreIds = Array.isArray(genres) ? genres : [genres];
      await prisma.movieGenre.createMany({
        data: genreIds.map((genreId) => ({ movieId: movie.id, genreId })),
        skipDuplicates: true,
      });
    }

    const transcodeJob = await prisma.transcodeJob.create({
      data: { movieId: movie.id, status: 'QUEUED' },
    });

    const queue = getTranscodeQueue();
    await queue.add(
      { movieId: movie.id, inputPath: req.file.path, jobId: transcodeJob.id },
      { jobId: transcodeJob.id }
    );

    await cache.delPattern('movies:list:*');

    logger.info(`Película creada y encolada: ${movie.id} - "${title}"`);

    res.status(201).json({
      message: 'Película subida y en proceso de transcodificación',
      movie: { id: movie.id, title: movie.title, status: movie.status },
      job: { id: transcodeJob.id, status: 'QUEUED' },
    });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
}

export async function updateMovie(req, res, next) {
  try {
    const { id } = req.params;
    const { title, description, year, director, rating, language, genres, cast, featured } = req.body;

    const movie = await prisma.movie.findUnique({ where: { id } });
    if (!movie) throw new NotFoundError('Película');

    const updateData = {
      ...(title && { title, slug: generateSlug(title) }),
      ...(description !== undefined && { description }),
      ...(year !== undefined && { year: year ? parseInt(year) : null }),
      ...(director !== undefined && { director }),
      ...(rating !== undefined && { rating: rating ? parseFloat(rating) : null }),
      ...(language && { language }),
      ...(cast && { cast }),
      ...(featured !== undefined && { featured }),
    };

    await prisma.movie.update({ where: { id }, data: updateData });

    if (genres !== undefined) {
      await prisma.movieGenre.deleteMany({ where: { movieId: id } });
      if (genres.length > 0) {
        await prisma.movieGenre.createMany({
          data: genres.map((genreId) => ({ movieId: id, genreId })),
          skipDuplicates: true,
        });
      }
    }

    await cache.del(`movie:${id}`);
    await cache.delPattern('movies:list:*');

    res.json({ message: 'Película actualizada', movieId: id });
  } catch (error) {
    next(error);
  }
}

export async function uploadPosterHandler(req, res, next) {
  try {
    const { id } = req.params;
    if (!req.file) throw new AppError('No se recibió imagen', 400);

    const movie = await prisma.movie.findUnique({ where: { id } });
    if (!movie) {
      fs.unlinkSync(req.file.path);
      throw new NotFoundError('Película');
    }

    if (movie.posterUrl) {
      const oldPath = path.join(process.env.POSTERS_DIR || './posters', path.basename(movie.posterUrl));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const posterUrl = `/posters/${path.basename(req.file.path)}`;
    await prisma.movie.update({ where: { id }, data: { posterUrl } });
    await cache.del(`movie:${id}`);

    res.json({ message: 'Poster actualizado', posterUrl });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(error);
  }
}

export async function deleteMovie(req, res, next) {
  try {
    const { id } = req.params;
    const movie = await prisma.movie.findUnique({ where: { id } });
    if (!movie) throw new NotFoundError('Película');

    await prisma.movie.delete({ where: { id } });

    deleteMovieFiles(id, movie.originalFile);

    await cache.del(`movie:${id}`);
    await cache.delPattern('movies:list:*');

    res.json({ message: 'Película eliminada' });
  } catch (error) {
    next(error);
  }
}

export async function getUsers(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
        },
      }),
      prisma.user.count(),
    ]);

    res.json({ users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
}

export async function updateUserRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['USER', 'ADMIN'].includes(role)) {
      throw new AppError('Rol inválido', 400);
    }

    if (id === req.user.id && role !== 'ADMIN') {
      throw new AppError('No puedes cambiar tu propio rol', 403);
    }

    await prisma.user.update({ where: { id }, data: { role } });
    res.json({ message: `Rol actualizado a ${role}` });
  } catch (error) {
    next(error);
  }
}

export async function toggleUserStatus(req, res, next) {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      throw new AppError('No puedes desactivar tu propia cuenta', 403);
    }

    const user = await prisma.user.findUnique({ where: { id }, select: { isActive: true } });
    if (!user) throw new NotFoundError('Usuario');

    await prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
    res.json({ message: `Usuario ${user.isActive ? 'desactivado' : 'activado'}` });
  } catch (error) {
    next(error);
  }
}


export async function getStats(req, res, next) {
  try {
    const [totalMovies, readyMovies, processingMovies, totalUsers, totalViews] = await Promise.all([
      prisma.movie.count(),
      prisma.movie.count({ where: { status: 'READY' } }),
      prisma.movie.count({ where: { status: 'PROCESSING' } }),
      prisma.user.count(),
      prisma.movie.aggregate({ _sum: { views: true } }),
    ]);

    res.json({
      movies: { total: totalMovies, ready: readyMovies, processing: processingMovies },
      users: { total: totalUsers },
      views: { total: totalViews._sum.views || 0 },
    });
  } catch (error) {
    next(error);
  }
}

export async function getTranscodeJobs(req, res, next) {
  try {
    const jobs = await prisma.transcodeJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        movie: { select: { id: true, title: true, posterUrl: true } },
      },
    });

    res.json({ jobs });
  } catch (error) {
    next(error);
  }
}

export async function retranscodeMovie(req, res, next) {
  try {
    const { id } = req.params;
    const movie = await prisma.movie.findUnique({ where: { id } });
    if (!movie) throw new NotFoundError('Película');

    if (!movie.originalFile || !fs.existsSync(movie.originalFile)) {
      throw new AppError('El archivo de video original no está disponible en el servidor para retranscodificar', 400);
    }

    await prisma.movie.update({
      where: { id },
      data: { status: 'PENDING' },
    });

    const transcodeJob = await prisma.transcodeJob.create({
      data: { movieId: movie.id, status: 'QUEUED' },
    });

    const queue = getTranscodeQueue();
    await queue.add(
      { movieId: movie.id, inputPath: movie.originalFile, jobId: transcodeJob.id },
      { jobId: transcodeJob.id }
    );

    await cache.delPattern('movies:list:*');
    logger.info(`Película reencolada para transcodificación: ${movie.id} - "${movie.title}"`);

    res.json({
      message: 'Transcodificación reencolada exitosamente',
      job: { id: transcodeJob.id, status: 'QUEUED' },
    });
  } catch (error) {
    next(error);
  }
}

