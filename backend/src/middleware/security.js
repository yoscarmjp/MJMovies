import helmet from 'helmet';

export const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://image.tmdb.org', 'https://*.tmdb.org'],
      mediaSrc: ["'self'", 'blob:', 'https:', 'http:'],
      connectSrc: [
        "'self'",
        'ws:',
        'wss:',
        'https://api.themoviedb.org',
        ...(process.env.ALLOWED_ORIGINS?.split(',') || []),
      ],
      frameSrc: [
        "'self'",
        'https://multiembed.mov',
        'https://*.multiembed.mov',
        'https://vidlink.pro',
        'https://*.vidlink.pro',
        'https://vidsrc.cc',
        'https://*.vidsrc.cc',
        'https://vidsrc.to',
        'https://*.vidsrc.to',
        'https://vidsrc.me',
        'https://*.vidsrc.me',
        'https://player.autoembed.cc',
        'https://*.autoembed.cc',
        'https://www.youtube.com',
        'https://*.youtube.com',
      ],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },

  frameguard: { action: 'sameorigin' },
  noSniff: true,
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,

  hidePoweredBy: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: false,
});
