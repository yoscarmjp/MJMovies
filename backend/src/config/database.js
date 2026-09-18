import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

if (!BigInt.prototype.toJSON) {
  BigInt.prototype.toJSON = function () {
    return Number(this);
  };
}

const isSQLite =
  (process.env.DB_PROVIDER || '').toLowerCase() === 'sqlite' ||
  (process.env.DATABASE_URL || '').startsWith('file:');

const rawPrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? [{ emit: 'event', level: 'query' }, 'error', 'warn']
    : ['error'],
});

const prisma = rawPrisma.$extends({
  query: {
    movie: {
      async create({ args, query }) {
        if (isSQLite && args.data?.cast && typeof args.data.cast !== 'string') {
          args.data.cast = JSON.stringify(args.data.cast);
        }
        return query(args);
      },
      async update({ args, query }) {
        if (isSQLite && args.data?.cast && typeof args.data.cast !== 'string') {
          args.data.cast = JSON.stringify(args.data.cast);
        }
        return query(args);
      },
      async upsert({ args, query }) {
        if (isSQLite) {
          if (args.create?.cast && typeof args.create.cast !== 'string') {
            args.create.cast = JSON.stringify(args.create.cast);
          }
          if (args.update?.cast && typeof args.update.cast !== 'string') {
            args.update.cast = JSON.stringify(args.update.cast);
          }
        }
        return query(args);
      },
      async findMany({ args, query }) {
        const results = await query(args);
        if (isSQLite && Array.isArray(results)) {
          results.forEach((m) => {
            if (m && typeof m.cast === 'string') {
              try { m.cast = JSON.parse(m.cast); } catch { m.cast = []; }
            }
          });
        }
        return results;
      },
      async findUnique({ args, query }) {
        const result = await query(args);
        if (isSQLite && result && typeof result.cast === 'string') {
          try { result.cast = JSON.parse(result.cast); } catch { result.cast = []; }
        }
        return result;
      },
      async findFirst({ args, query }) {
        const result = await query(args);
        if (isSQLite && result && typeof result.cast === 'string') {
          try { result.cast = JSON.parse(result.cast); } catch { result.cast = []; }
        }
        return result;
      },
    },
  },
});

if (process.env.NODE_ENV === 'development') {
  rawPrisma.$on('query', (e) => {
    logger.debug(`DB Query: ${e.query.substring(0, 100)}... (${e.duration}ms)`);
  });
}

export async function connectDB() {
  const providerLabel = isSQLite ? 'SQLite' : 'MySQL';
  try {
    await prisma.$connect();
    if (isSQLite) {
      logger.info(`Base de datos SQLite conectada vía Prisma (${process.env.DATABASE_URL || 'archivo .db'})`);
    } else {
      logger.info('Base de datos MySQL conectada vía Prisma');
    }
  } catch (error) {
    logger.error(`Fallo en conexión a ${providerLabel}:`, error.message);
    throw error;
  }
}

export { prisma };

