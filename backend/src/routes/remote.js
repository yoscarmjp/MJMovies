import { Router } from 'express';
import {
  createPairingCode,
  pairRemote,
  sendCommand,
  getRemoteStatus,
  getPlayerState,
  getCurrentSession,
  disconnectRemote,
} from '../controllers/remoteController.js';
import { authenticate } from '../middleware/auth.js';
import { validate, remoteCommandSchema } from '../utils/validators.js';
import { z } from 'zod';

const router = Router();

// GET /api/remote/session — obtener sesión activa del usuario
router.get('/session', authenticate, getCurrentSession);

// POST /api/remote/disconnect — desconectar dispositivos remotos
router.post('/disconnect', authenticate, disconnectRemote);

// GET /api/remote/pairing — generar código de emparejamiento (TV pide esto)
router.get('/pairing', authenticate, createPairingCode);

// POST /api/remote/pair — APK envía código para conectarse
router.post('/pair', validate(z.object({ body: z.object({ pairingCode: z.string().length(6) }) })), pairRemote);

// POST /api/remote/command — APK envía comando
router.post('/command', validate(remoteCommandSchema), sendCommand);

// GET /api/remote/status/:sessionId — estado de la sesión de emparejamiento
router.get('/status/:sessionId', authenticate, getRemoteStatus);

// GET /api/remote/state/:sessionId — estado de reproducción en vivo
router.get('/state/:sessionId', getPlayerState);

export default router;
