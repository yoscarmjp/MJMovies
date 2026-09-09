import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? [{ emit: 'event', level: 'query' }, 'error', 'warn']
    : ['error'],
});

if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    // Log queries solo en dev, sin datos sensibles
    logger.debug(`DB Query: ${e.query.substring(0, 100)}... (${e.duration}ms)`);
  });
}

export async function connectDB() {
  try {
    await prisma.$connect();
    logger.info('MySQL connected via Prisma');
  } catch (error) {
    logger.error('MySQL connection failed:', error.message);
    throw error;
  }
}

export { prisma };
