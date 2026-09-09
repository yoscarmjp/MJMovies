import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { getRedis } from '../config/redis.js';
import { logger } from '../utils/logger.js';

const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';
const REFRESH_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;


function generateTokens(userId, role) {
  const accessToken = jwt.sign(
    { userId, role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES, issuer: 'mjmovies', audience: 'mjmovies-client' }
  );

  const refreshToken = crypto.randomBytes(64).toString('hex');
  return { accessToken, refreshToken };
}


function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}


function getCookieOptions(maxAge) {
  return {
    httpOnly: true,         // JS no puede acceder → protege contra XSS
    secure: process.env.NODE_ENV === 'production', // HTTPS en producción
    sameSite: 'strict',     // Protege contra CSRF
    maxAge,
    path: '/',
  };
}

// SERVICE FUNCTIONS

export async function registerUser({ email, username, password, ipAddress, userAgent }) {
  // Verificar duplicados con mensaje genérico (anti-enumeración)
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { id: true },
  });

  if (existing) {
    // Mensaje genérico para no revelar si existe el email o username
    throw Object.assign(new Error('No se pudo crear la cuenta'), { statusCode: 409, code: 'DUPLICATE_ENTRY' });
  }

  // Hash con bcrypt — factor 12 (buen balance seguridad/velocidad)
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email, username, passwordHash, role: 'USER' },
    select: { id: true, email: true, username: true, role: true },
  });

  logger.info(`Nuevo usuario registrado: ${user.id} desde ${ipAddress}`);
  return user;
}

export async function loginUser({ email, password, ipAddress, userAgent }) {
  // Buscar usuario — respuesta IGUAL si no existe (anti-timing attack)
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, username: true, role: true, passwordHash: true, isActive: true },
  });

  // Siempre comparar password aunque el usuario no exista (timing attack prevention)
  const dummyHash = '$2b$12$dummy.hash.to.prevent.timing.attack.AAAAAAAAAAAAAAAA';
  const isValid = await bcrypt.compare(password, user?.passwordHash || dummyHash);

  if (!user || !isValid || !user.isActive) {
    logger.warn(`Login fallido para email: [REDACTED] desde ${ipAddress}`);
    throw Object.assign(new Error('Credenciales incorrectas'), { statusCode: 401, code: 'INVALID_CREDENTIALS' });
  }

  const { accessToken, refreshToken } = generateTokens(user.id, user.role);

  // Guardar refresh token hasheado en DB
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_EXPIRES_MS),
      ipAddress,
      userAgent: userAgent?.substring(0, 500),
    },
  });

  // Actualizar last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  logger.info(`Login exitoso: ${user.id} desde ${ipAddress}`);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, username: user.username, role: user.role },
  };
}

export async function refreshTokens({ refreshToken, ipAddress }) {
  const tokenHash = hashToken(refreshToken);

  const stored = await prisma.refreshToken.findFirst({
    where: {
      tokenHash,
      revoked: false,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: { select: { id: true, role: true, isActive: true } },
    },
  });

  if (!stored || !stored.user.isActive) {
    throw Object.assign(new Error('Token inválido o expirado'), { statusCode: 401, code: 'INVALID_TOKEN' });
  }

  // Revocar token anterior (rotation)
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revoked: true },
  });

  // Generar nuevo par
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(stored.userId, stored.user.role);

  await prisma.refreshToken.create({
    data: {
      userId: stored.userId,
      tokenHash: hashToken(newRefreshToken),
      expiresAt: new Date(Date.now() + REFRESH_EXPIRES_MS),
      ipAddress,
    },
  });

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logoutUser({ refreshToken, userId }) {
  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, userId },
      data: { revoked: true },
    });
  }

  // También revocar en Redis (blacklist del access token si es necesario)
  // Por el TTL corto de 15min del access token, no es crítico

  logger.info(`Logout: ${userId}`);
}

export async function changePassword({ userId, currentPassword, newPassword }) {
  if (!currentPassword || !newPassword) {
    throw Object.assign(new Error('Debes ingresar la contraseña actual y la nueva'), { statusCode: 400 });
  }

  if (newPassword.length < 8) {
    throw Object.assign(new Error('La nueva contraseña debe tener al menos 8 caracteres'), { statusCode: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 });
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw Object.assign(new Error('La contraseña actual es incorrecta'), { statusCode: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  logger.info(`Password changed for user: ${userId}`);
  return { success: true };
}

export { getCookieOptions };
