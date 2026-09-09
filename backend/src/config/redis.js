import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

let redisClient = null;
const memoryCache = new Map();

export async function connectRedis() {
  if (process.env.REDIS_ENABLED === 'false') {
    logger.info('ℹ️ Redis deshabilitado por configuración. Usando caché en memoria.');
    return null;
  }

  try {
    const client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => {
        if (times > 2) return null; // Detener reintentos si no hay servidor Redis
        return Math.min(times * 100, 1000);
      },
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    client.on('error', (err) => {
      // Registrar como advertencia sin crashear el proceso
      logger.warn(`Redis notice: ${err.message}`);
    });

    await client.connect();
    await client.ping();
    redisClient = client;
    logger.info('Redis conectado');
    return redisClient;
  } catch (error) {
    logger.warn(`⚠️ Redis no disponible (${error.message}). Continuando con modo en memoria.`);
    redisClient = null;
    return null;
  }
}

export function getRedis() {
  return redisClient;
}

// Cache helpers con fallback en memoria
export const cache = {
  async get(key) {
    try {
      if (redisClient) {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
      }
      const item = memoryCache.get(key);
      if (!item) return null;
      if (Date.now() > item.expiresAt) {
        memoryCache.delete(key);
        return null;
      }
      return item.value;
    } catch {
      return null;
    }
  },

  async set(key, value, ttlSeconds = 300) {
    try {
      if (redisClient) {
        await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
        return;
      }
      memoryCache.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
    } catch {
      // Fail silently
    }
  },

  async del(key) {
    try {
      if (redisClient) {
        await redisClient.del(key);
        return;
      }
      memoryCache.delete(key);
    } catch {
      // Fail silently
    }
  },

  async delPattern(pattern) {
    try {
      if (redisClient) {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
        return;
      }
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      for (const key of memoryCache.keys()) {
        if (regex.test(key)) {
          memoryCache.delete(key);
        }
      }
    } catch {
      // Fail silently
    }
  },
};
