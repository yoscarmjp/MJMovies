import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import { securityMiddleware } from './middleware/security.js';
import { corsMiddleware } from './middleware/cors.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { initializeSocket } from './socket/socketHandler.js';
import { initTranscodeQueue } from './jobs/transcodeQueue.js';

import authRouter from './routes/auth.js';
import moviesRouter from './routes/movies.js';
import adminRouter from './routes/admin.js';
import remoteRouter from './routes/remote.js';
import streamRouter from './routes/stream.js';
import externalMoviesRouter from './routes/externalMovies.js';

import { logger } from './utils/logger.js';
import { connectRedis } from './config/redis.js';
import { connectDB } from './config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);

// ====================================
// SOCKET.IO — Control Remoto
// ====================================
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ====================================
// MIDDLEWARE GLOBAL
// ====================================
app.set('trust proxy', 1); // Necesario detrás de Nginx
app.use(corsMiddleware);
app.use(securityMiddleware);
app.use(compression());
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (solo en desarrollo mostramos todos los detalles)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use(requestLogger);

// ====================================
// ARCHIVOS ESTÁTICOS — HLS Streams
// ====================================
app.use('/streams', rateLimiter.stream, express.static(
  process.env.STREAMS_DIR || path.join(__dirname, '..', 'streams'),
  {
    maxAge: '1h',
    etag: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.m3u8')) {
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'no-cache'); // m3u8 siempre fresco
      }
      if (filePath.endsWith('.ts')) {
        res.setHeader('Content-Type', 'video/MP2T');
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
    },
  }
));

// Posters / imágenes
app.use('/posters', express.static(
  process.env.POSTERS_DIR || path.join(__dirname, '..', 'posters'),
  { maxAge: '7d' }
));

// ====================================
// RUTAS API
// ====================================
app.use('/api/auth', rateLimiter.auth, authRouter);
app.use('/api/movies', rateLimiter.api, moviesRouter);
app.use('/api/admin', rateLimiter.api, adminRouter);
app.use('/api/remote', rateLimiter.api, remoteRouter);
app.use('/api/stream', rateLimiter.api, streamRouter);
app.use('/api/external-movies', rateLimiter.api, externalMoviesRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'MJMovies API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ====================================
// SOCKET.IO HANDLERS
// ====================================
initializeSocket(io);

// ====================================
// ERROR HANDLERS (siempre al final)
// ====================================
app.use(notFoundHandler);
app.use(errorHandler);

// ====================================
// INICIO DEL SERVIDOR
// ====================================
const PORT = parseInt(process.env.PORT || '5000', 10);

async function startServer() {
  try {
    await connectDB();
    await connectRedis();

    // Inicializar cola de transcodificación DESPUÉS de que Redis esté listo
    initTranscodeQueue();
    logger.info('✅ Transcode queue inicializada');

    httpServer.listen(PORT, '0.0.0.0', () => {
      logger.info(`🎬 MJMovies API running on port ${PORT} [${process.env.NODE_ENV}]`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  httpServer.close(() => {
    process.exit(0);
  });
});

// Capturar errores no manejados - nunca exponer al cliente
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();

export { io };

