import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Formato de log — nunca incluir passwords, tokens o datos sensibles
const sanitizeData = winston.format((info) => {
  // Remover campos sensibles si accidentalmente llegaron
  const sensitive = ['password', 'passwordHash', 'token', 'refreshToken', 'secret'];
  if (info.data && typeof info.data === 'object') {
    sensitive.forEach((field) => {
      if (info.data[field]) info.data[field] = '[REDACTED]';
    });
  }
  return info;
});

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    sanitizeData(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'mjmovies-api' },
  transports: [
    // Consola en desarrollo
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
      silent: process.env.NODE_ENV === 'test',
    }),

    // Archivo de errores
    new winston.transports.File({
      filename: path.join(__dirname, '..', '..', 'logs', 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),

    // Archivo de todos los logs
    new winston.transports.File({
      filename: path.join(__dirname, '..', '..', 'logs', 'combined.log'),
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 5,
    }),
  ],
});
