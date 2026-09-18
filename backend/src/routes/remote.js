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

router.get('/session', authenticate, getCurrentSession);
router.post('/disconnect', authenticate, disconnectRemote);
router.get('/pairing', authenticate, createPairingCode);
router.post('/pair', validate(z.object({ body: z.object({ pairingCode: z.string().length(6) }) })), pairRemote);
router.post('/command', validate(remoteCommandSchema), sendCommand);
router.get('/status/:sessionId', authenticate, getRemoteStatus);
router.get('/state/:sessionId', getPlayerState);

export default router;
