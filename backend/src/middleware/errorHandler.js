import { logger } from '../utils/logger.js';

/**
 * Clases de error personalizadas para manejo consistente
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // Error esperado, no un bug
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(errors) {
    super('Error de validación', 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

export class AuthError extends AppError {
  constructor(message = 'No autorizado') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super(`${resource} no encontrado`, 404, 'NOT_FOUND');
  }
}

/**
 * Handler 404 — ruta no encontrada
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Ruta no encontrada',
    code: 'NOT_FOUND',
    path: req.path,
  });
}

/**
 * Error handler global
 * NUNCA expone stack traces ni detalles internos al cliente
 */
export function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Error interno del servidor';

  // Log completo internamente
  if (statusCode >= 500) {
    logger.error({
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id,
    });

    // En producción, nunca mostrar detalles de errores 500
    if (process.env.NODE_ENV === 'production') {
      message = 'Error interno del servidor';
      code = 'INTERNAL_ERROR';
    }
  } else {
    logger.warn({
      message: err.message,
      code,
      path: req.path,
      ip: req.ip,
    });
  }

  // Manejar errores específicos de Prisma
  if (err.code?.startsWith('P')) {
    if (err.code === 'P2002') {
      statusCode = 409;
      code = 'DUPLICATE_ENTRY';
      message = 'Ya existe un registro con estos datos';
    } else if (err.code === 'P2025') {
      statusCode = 404;
      code = 'NOT_FOUND';
      message = 'Registro no encontrado';
    } else {
      statusCode = 500;
      code = 'DATABASE_ERROR';
      message = process.env.NODE_ENV === 'production'
        ? 'Error en la base de datos'
        : err.message;
    }
  }

  // Error de CORS
  if (err.message === 'Not allowed by CORS') {
    statusCode = 403;
    code = 'CORS_ERROR';
    message = 'Origen no permitido';
  }

  // Error de multer (upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    code = 'FILE_TOO_LARGE';
    message = `El archivo excede el tamaño máximo permitido`;
  }

  const response = {
    error: message,
    code,
  };

  // Incluir errores de validación
  if (err instanceof ValidationError && err.errors) {
    response.errors = err.errors;
  }

  // Stack trace solo en desarrollo
  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}
