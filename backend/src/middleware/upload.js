import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { AppError } from './errorHandler.js';
import { logger } from '../utils/logger.js';

// Magic bytes para validar tipos de archivo reales
// No confiamos en la extensión ni en el Content-Type del cliente
const ALLOWED_VIDEO_MAGIC = {
  // MP4 / M4V
  mp4: [
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // ftyp
    [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
    [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70],
    [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70],
    [0x00, 0x00, 0x00, 0x08, 0x66, 0x74, 0x79, 0x70],
  ],
};

const ALLOWED_IMAGE_MAGIC = {
  jpg: [[0xFF, 0xD8, 0xFF]],
  png: [[0x89, 0x50, 0x4E, 0x47]],
  webp: [[0x52, 0x49, 0x46, 0x46]],
};

function checkMagicBytes(buffer, magicArrays) {
  return magicArrays.some((magic) =>
    magic.every((byte, i) => buffer[i] === byte)
  );
}

function isValidVideoFile(buffer) {
  const allMagic = Object.values(ALLOWED_VIDEO_MAGIC).flat();
  return checkMagicBytes(buffer, allMagic);
}

function isValidImageFile(buffer) {
  const allMagic = Object.values(ALLOWED_IMAGE_MAGIC).flat();
  return checkMagicBytes(buffer, allMagic);
}

// Asegurar que directorios existen
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Storage para videos
const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = process.env.UPLOADS_DIR || './uploads';
    ensureDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Nombre aleatorio — nunca usar el nombre original del usuario (path traversal)
    const ext = '.mp4'; // Siempre .mp4 independientemente de lo que diga el cliente
    cb(null, `${uuidv4()}${ext}`);
  },
});

// Storage para posters
const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const posterDir = process.env.POSTERS_DIR || './posters';
    ensureDir(posterDir);
    cb(null, posterDir);
  },
  filename: (_req, _file, cb) => {
    cb(null, `${uuidv4()}.jpg`); // Siempre .jpg
  },
});

// Filtro de archivos de video
function videoFilter(_req, file, cb) {
  // Solo aceptar tipos MIME de video (primera línea de defensa)
  const allowedMimes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'];
  if (!allowedMimes.includes(file.mimetype)) {
    logger.warn(`Upload bloqueado: MIME inválido ${file.mimetype} desde ${_req.ip}`);
    return cb(new AppError('Solo se permiten archivos de video MP4', 415));
  }
  cb(null, true);
}

// Filtro de imágenes
function imageFilter(_req, file, cb) {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new AppError('Solo se permiten imágenes JPG, PNG o WebP', 415));
  }
  cb(null, true);
}

const MAX_VIDEO_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '5000') * 1024 * 1024;

export const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: videoFilter,
  limits: {
    fileSize: MAX_VIDEO_SIZE,
    files: 1, // Solo 1 archivo por request
    fields: 10, // Límite de campos del form
  },
});

export const uploadPoster = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo para posters
    files: 1,
  },
});

/**
 * Valida magic bytes del archivo subido
 * Se llama DESPUÉS de que multer guarda el archivo
 */
export async function validateVideoMagicBytes(req, res, next) {
  if (!req.file) return next();

  try {
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(req.file.path, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);

    if (!isValidVideoFile(buffer)) {
      // Eliminar el archivo fraudulento
      fs.unlinkSync(req.file.path);
      logger.warn(`Magic bytes inválidos en upload desde ${req.ip}`);
      return next(new AppError('El archivo no es un video MP4 válido', 415));
    }

    next();
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
}

export async function validateImageMagicBytes(req, res, next) {
  if (!req.file) return next();

  try {
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(req.file.path, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);

    if (!isValidImageFile(buffer)) {
      fs.unlinkSync(req.file.path);
      logger.warn(`Magic bytes de imagen inválidos desde ${req.ip}`);
      return next(new AppError('El archivo no es una imagen válida', 415));
    }

    next();
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
}
