import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { AuthError, ForbiddenError } from './errorHandler.js';
import { logger } from '../utils/logger.js';

export async function authenticate(req, _res, next) {
  try {
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new AuthError('Token de acceso requerido');
    }

    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new AuthError('Usuario no encontrado o desactivado');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AuthError('Token expirado. Renueva tu sesión.'));
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AuthError('Token inválido'));
    }
    next(error);
  }
}


export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AuthError('No autenticado'));
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`Acceso denegado: ${req.user.id} intentó acceder a ruta de ${roles.join(',')}`);
      return next(new ForbiddenError('No tienes permisos para esta acción'));
    }

    next();
  };
}


export async function optionalAuth(req, _res, next) {
  try {
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, username: true, role: true, isActive: true },
      });
      if (user?.isActive) {
        req.user = user;
      }
    }
  } catch {
  }
  next();
}
