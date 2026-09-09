import Bull from 'bull';
import { prisma } from '../config/database.js';
import { transcodeToHLS } from '../services/ffmpegService.js';
import { logger } from '../utils/logger.js';
import { getRedis } from '../config/redis.js';

let transcodeQueue = null;

export function initTranscodeQueue() {
  if (!getRedis()) {
    logger.warn('⚠️ Redis no disponible: Cola de transcodificación funcionando en modo local');
    return null;
  }

  transcodeQueue = new Bull('transcode', {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
    },
    defaultJobOptions: {
      attempts: 2,              // Reintentar máximo 2 veces
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 50,     // Mantener últimos 50 jobs completados
      removeOnFail: 100,
    },
  });

  // Procesar trabajos — 1 a la vez (FFmpeg es intensivo en CPU)
  transcodeQueue.process(1, async (job) => {
    const { movieId, inputPath, jobId } = job.data;

    logger.info(`🎬 Iniciando transcode job ${jobId} para movie ${movieId}`);

    try {
      // Marcar como PROCESSING
      await prisma.transcodeJob.update({
        where: { id: jobId },
        data: { status: 'PROCESSING', startedAt: new Date() },
      });

      await prisma.movie.update({
        where: { id: movieId },
        data: { status: 'PROCESSING' },
      });

      // Transcodificar con callback de progreso
      const result = await transcodeToHLS(inputPath, movieId, async (progress) => {
        await job.progress(progress);

        // Actualizar progreso en DB
        await prisma.transcodeJob.update({
          where: { id: jobId },
          data: { progress },
        }).catch(() => {}); // No fallar por un update de progreso

        // Emitir a clientes vía WebSocket (si io está disponible)
        if (global.io) {
          global.io.to(`admin`).emit('transcode:progress', { movieId, jobId, progress });
        }
      });

      // Actualizar DB con resultado
      await prisma.transcodeJob.update({
        where: { id: jobId },
        data: {
          status: 'DONE',
          progress: 100,
          quality: result.qualities.join(','),
          completedAt: new Date(),
        },
      });

      await prisma.movie.update({
        where: { id: movieId },
        data: {
          status: 'READY',
          streamPath: result.streamPath,
          duration: result.duration,
        },
      });

      if (global.io) {
        global.io.to('admin').emit('transcode:done', { movieId, jobId });
      }

      logger.info(`✅ Transcode completado: ${movieId}`);
      return result;

    } catch (error) {
      logger.error(`❌ Transcode fallido: ${movieId}`, error.message);

      await prisma.transcodeJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorMsg: error.message?.substring(0, 1000),
          completedAt: new Date(),
        },
      }).catch(() => {});

      await prisma.movie.update({
        where: { id: movieId },
        data: { status: 'ERROR' },
      }).catch(() => {});

      if (global.io) {
        global.io.to('admin').emit('transcode:error', { movieId, jobId, error: error.message });
      }

      throw error;
    }
  });

  transcodeQueue.on('error', (error) => {
    logger.error('Bull queue error:', error.message);
  });

  transcodeQueue.on('failed', (job, error) => {
    logger.error(`Job ${job.id} falló después de ${job.attemptsMade} intentos:`, error.message);
  });

  logger.info('✅ Transcode queue inicializada');
  return transcodeQueue;
}

export function getTranscodeQueue() {
  if (!transcodeQueue) {
    return {
      add: async (data) => {
        logger.info(`🎬 Transcodificando en segundo plano (modo local sin Redis): ${data.movieId}`);
        (async () => {
          try {
            await prisma.transcodeJob.update({
              where: { id: data.jobId },
              data: { status: 'PROCESSING', startedAt: new Date() },
            });
            await prisma.movie.update({
              where: { id: data.movieId },
              data: { status: 'PROCESSING' },
            });
            const result = await transcodeToHLS(data.inputPath, data.movieId, async (progress) => {
              await prisma.transcodeJob.update({
                where: { id: data.jobId },
                data: { progress },
              }).catch(() => {});
              if (global.io) {
                global.io.to('admin').emit('transcode:progress', { movieId: data.movieId, jobId: data.jobId, progress });
              }
            });
            await prisma.transcodeJob.update({
              where: { id: data.jobId },
              data: {
                status: 'DONE',
                progress: 100,
                quality: result.qualities.join(','),
                completedAt: new Date(),
              },
            });
            await prisma.movie.update({
              where: { id: data.movieId },
              data: {
                status: 'READY',
                streamPath: result.streamPath,
                duration: result.duration,
              },
            });
            if (global.io) {
              global.io.to('admin').emit('transcode:done', { movieId: data.movieId, jobId: data.jobId });
            }
          } catch (err) {
            logger.error(`❌ Transcode error: ${data.movieId}`, err.message);
            await prisma.transcodeJob.update({
              where: { id: data.jobId },
              data: { status: 'FAILED', errorMsg: err.message?.substring(0, 1000), completedAt: new Date() },
            }).catch(() => {});
            await prisma.movie.update({
              where: { id: data.movieId },
              data: { status: 'ERROR' },
            }).catch(() => {});
          }
        })();
        return { id: data.jobId };
      },
    };
  }
  return transcodeQueue;
}

export { transcodeQueue };
