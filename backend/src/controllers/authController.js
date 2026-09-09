import {
  registerUser,
  loginUser,
  refreshTokens,
  logoutUser,
  changePassword,
  getCookieOptions,
} from '../services/authService.js';

const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000;       // 15 min
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 días

export async function register(req, res, next) {
  try {
    const { email, username, password } = req.body;
    const user = await registerUser({
      email,
      username,
      password,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      message: 'Cuenta creada exitosamente',
      user: { id: user.id, email: user.email, username: user.username, role: user.role },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const { accessToken, refreshToken, user } = await loginUser({
      email,
      password,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Enviar tokens en cookies HttpOnly (más seguro que localStorage)
    res.cookie('accessToken', accessToken, getCookieOptions(ACCESS_COOKIE_MAX_AGE));
    res.cookie('refreshToken', refreshToken, {
      ...getCookieOptions(REFRESH_COOKIE_MAX_AGE),
      path: '/api/auth/refresh', // Solo enviar en el endpoint de refresh
    });

    res.json({
      message: 'Sesión iniciada',
      user,
      accessToken, // También en body para clientes que prefieren header
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies?.refreshToken;
    await logoutUser({ refreshToken, userId: req.user.id });

    // Limpiar cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });

    res.json({ message: 'Sesión cerrada' });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token requerido', code: 'UNAUTHORIZED' });
    }

    const { accessToken, refreshToken: newRefreshToken } = await refreshTokens({
      refreshToken,
      ipAddress: req.ip,
    });

    res.cookie('accessToken', accessToken, getCookieOptions(ACCESS_COOKIE_MAX_AGE));
    res.cookie('refreshToken', newRefreshToken, {
      ...getCookieOptions(REFRESH_COOKIE_MAX_AGE),
      path: '/api/auth/refresh',
    });

    res.json({ accessToken });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res) {
  res.json({ user: req.user });
}

export async function changePasswordHandler(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    await changePassword({
      userId: req.user.id,
      currentPassword,
      newPassword,
    });
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    next(error);
  }
}

