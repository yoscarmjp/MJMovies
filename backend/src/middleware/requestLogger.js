import { logger } from '../utils/logger.js';

/**
 * Logger de requests — registra sin datos sensibles
 * Nunca loguea passwords, tokens, o datos personales
 */
export function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.id || 'anon',
    };

    if (res.statusCode >= 400) {
      logger.warn(log);
    } else {
      logger.info(log);
    }
  });

  next();
}
