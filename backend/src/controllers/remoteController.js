import crypto from 'crypto';
import QRCode from 'qrcode';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

function generatePairingCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createPairingCode(req, res, next) {
  try {
    const userId = req.user.id;
    const tvSessionId = crypto.randomBytes(16).toString('hex');
    const pairingCode = generatePairingCode();

    // Expirar en 5 minutos
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Eliminar sesiones anteriores del mismo usuario
    await prisma.remoteSession.deleteMany({ where: { userId } });

    const session = await prisma.remoteSession.create({
      data: { userId, tvSessionId, pairingCode, expiresAt },
    });

    // Construir payload estructurado para escaneo con cámara
    const serverOrigin = `${req.protocol}://${req.get('host')}`;
    const qrData = JSON.stringify({
      code: pairingCode,
      tvSessionId,
      serverUrl: serverOrigin,
    });

    let qrCode = null;
    try {
      qrCode = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 280,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
    } catch (qrErr) {
      logger.warn(`No se pudo generar QR code: ${qrErr.message}`);
    }

    res.json({
      pairingCode,
      tvSessionId,
      expiresAt,
      qrCode,
      message: 'Ingresa este código o escanea el QR en tu app de control remoto',
    });
  } catch (error) {
    next(error);
  }
}

export async function pairRemote(req, res, next) {
  try {
    const { pairingCode } = req.body;

    const session = await prisma.remoteSession.findFirst({
      where: {
        pairingCode,
        isConnected: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      throw new AppError('Código de emparejamiento inválido o expirado', 400);
    }

    await prisma.remoteSession.update({
      where: { id: session.id },
      data: { isConnected: true },
    });

    logger.info(`Control remoto emparejado para sesión ${session.tvSessionId}`);

    res.json({
      success: true,
      tvSessionId: session.tvSessionId,
      message: '¡Control remoto conectado!',
    });
  } catch (error) {
    next(error);
  }
}

export async function sendCommand(req, res, next) {
  try {
    const { pairingCode, command, payload } = req.body;

    const session = await prisma.remoteSession.findFirst({
      where: { pairingCode, isConnected: true, expiresAt: { gt: new Date() } },
    });

    if (!session) {
      throw new AppError('Sesión de control remoto no encontrada', 404);
    }

    // Emitir comando via Socket.io a la TV
    if (global.io) {
      global.io.to(`tv:${session.tvSessionId}`).emit('remote:command', {
        command,
        payload: payload || {},
      });
    }

    res.json({ success: true, command });
  } catch (error) {
    next(error);
  }
}

export async function getRemoteStatus(req, res, next) {
  try {
    const { sessionId } = req.params;

    const session = await prisma.remoteSession.findFirst({
      where: { tvSessionId: sessionId, userId: req.user.id },
    });

    if (!session) {
      throw new AppError('Sesión no encontrada', 404);
    }

    res.json({
      tvSessionId: session.tvSessionId,
      isConnected: session.isConnected,
      pairingCode: session.pairingCode,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPlayerState(req, res, next) {
  try {
    const { sessionId } = req.params;
    const state = global.playerStates?.get(sessionId) || {
      playing: false,
      position: 0,
      duration: 0,
      volume: 1,
    };
    res.json(state);
  } catch (error) {
    next(error);
  }
}

