import cors from 'cors';

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

/**
 * CORS configurado con whitelist estricta
 * Solo permite orígenes configurados explícitamente
 */
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (apps móviles nativas como React Native, herramientas de prueba)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // No revelar los orígenes permitidos en el error
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Necesario para cookies HttpOnly
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-CSRF-Token',
    'X-Requested-With',
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Limit'],
  maxAge: 86400, // 24h preflight cache
});
