import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { getRedis } from '../config/redis.js';
import { logger } from '../utils/logger.js';

function createLimiter({
  windowMs,
  max,
  message,
  keyPrefix = 'rl',
  skipSuccessfulRequests = false,
}) {
  const options = {
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    keyGenerator: (req) => {
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';
      return ip;
    },
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded: ${req.ip} -> ${req.path}`);
      res.status(429).json({
        error: message || 'Demasiadas solicitudes. Por favor espera antes de reintentar.',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
    skip: (req) => {
      return req.path === '/api/health';
    },
  };

  const redis = getRedis();
  if (redis) {
    options.store = new RedisStore({
      sendCommand: (...args) => redis.call(...args),
      prefix: `mjmovies:${keyPrefix}:`,
    });
  }

  return rateLimit(options);
}

export const rateLimiter = {
  auth: createLimiter({
    windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '900000'),
    max: process.env.NODE_ENV === 'production' ? parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '5') : 100,
    message: 'Demasiados intentos de autenticación. Espera 15 minutos.',
    keyPrefix: 'auth',
    skipSuccessfulRequests: true,
  }),

  api: createLimiter({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: 'Límite de solicitudes excedido.',
    keyPrefix: 'api',
  }),

  upload: createLimiter({
    windowMs: parseInt(process.env.UPLOAD_RATE_LIMIT_WINDOW_MS || '3600000'),
    max: parseInt(process.env.UPLOAD_RATE_LIMIT_MAX || '10'),
    message: 'Límite de subidas alcanzado. Máximo 10 subidas por hora.',
    keyPrefix: 'upload',
  }),

  stream: createLimiter({
    windowMs: 60000,
    max: 500,
    message: 'Límite de streaming excedido.',
    keyPrefix: 'stream',
  }),
};
