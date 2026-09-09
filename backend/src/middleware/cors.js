import cors from 'cors';

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

export const isOriginAllowed = (origin) => {
  // Permitir requests sin origin (apps móviles nativas como React Native, herramientas de prueba)
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  // Permitir localhost en cualquier puerto
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  // Permitir IPs de red local (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  if (/^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin)) return true;
  // Permitir esquemas de Expo / móvil
  if (origin.startsWith('exp://') || origin.includes('localhost') || origin.includes('192.168.')) return true;
  return false;
};

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
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
