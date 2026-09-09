import { z } from 'zod';

// Helpers reutilizables
const safeString = (max = 255, min = 0, minMsg) => {
  let schema = z.string().trim();
  if (min > 0) schema = minMsg ? schema.min(min, minMsg) : schema.min(min);
  return schema.max(max).transform((s) => s.replace(/[<>]/g, ''));
};

// AUTH SCHEMAS
export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido').max(255).toLowerCase(),
    username: z
      .string()
      .min(3, 'Mínimo 3 caracteres')
      .max(30, 'Máximo 30 caracteres')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Solo letras, números, guion y guion bajo'),
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .max(128, 'Máximo 128 caracteres')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Debe incluir mayúscula, minúscula y número'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido').toLowerCase(),
    password: z.string().min(1, 'Contraseña requerida').max(128),
  }),
});

// MOVIE SCHEMAS
export const createMovieSchema = z.object({
  body: z.object({
    title: safeString(255, 1, 'Título requerido'),
    description: safeString(5000).optional(),
    year: z.coerce.number().int().min(1888).max(new Date().getFullYear() + 2).optional(),
    director: safeString(255).optional(),
    rating: z.coerce.number().min(0).max(10).optional(),
    language: z.string().max(10).default('es'),
    genres: z.array(z.string().uuid()).max(5).optional(),
    cast: z.array(safeString(100)).max(50).optional(),
    featured: z.boolean().default(false),
  }),
});

export const updateMovieSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID inválido'),
  }),
  body: z.object({
    title: safeString(255).optional(),
    description: safeString(5000).optional(),
    year: z.coerce.number().int().min(1888).max(new Date().getFullYear() + 2).optional(),
    director: safeString(255).optional(),
    rating: z.coerce.number().min(0).max(10).optional(),
    language: z.string().max(10).optional(),
    genres: z.array(z.string().uuid()).max(5).optional(),
    cast: z.array(safeString(100)).max(50).optional(),
    featured: z.boolean().optional(),
  }),
});

export const paginationSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().max(100).optional(),
    genre: z.string().max(50).optional(),
    year: z.union([z.coerce.number().int().min(1888), z.string().max(20)]).optional(),
    rating: z.coerce.number().min(0).max(10).optional(),
    sort: z.enum(['createdAt', 'title', 'year', 'views', 'rating']).default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
  }),
});

export const uuidParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID inválido'),
  }),
});

// REMOTE CONTROL SCHEMAS

export const remoteCommandSchema = z.object({
  body: z.object({
    pairingCode: z.string().length(6, 'Código de 6 dígitos'),
    command: z.enum(['play', 'pause', 'seek', 'volume', 'next', 'prev', 'fullscreen', 'navigate', 'select', 'back']),
    payload: z.object({
      value: z.number().optional(),
      direction: z.enum(['up', 'down', 'left', 'right']).optional(),
    }).optional(),
  }),
});

// VALIDATOR MIDDLEWARE FACTORY


export function validate(schema) {
  return async (req, res, next) => {
    try {
      const result = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Reemplazar con datos validados y sanitizados
      if (result.body) req.body = result.body;
      if (result.query) req.query = result.query;
      if (result.params) req.params = result.params;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.slice(1).join('.'), // Remover 'body'/'query'/'params'
          message: e.message,
        }));
        return res.status(400).json({
          error: 'Datos inválidos',
          code: 'VALIDATION_ERROR',
          errors,
        });
      }
      next(error);
    }
  };
}
