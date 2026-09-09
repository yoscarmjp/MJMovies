import crypto from 'crypto';
import os from 'os';
import QRCode from 'qrcode';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(interfaces)) {
    const lowerName = name.toLowerCase();
    const isVirtual =
      lowerName.includes('virtual') ||
      lowerName.includes('wsl') ||
      lowerName.includes('vethernet') ||
      lowerName.includes('vmware') ||
      lowerName.includes('box') ||
      lowerName.includes('docker') ||
      lowerName.includes('loopback');

    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254.')) {
        candidates.push({
          name,
          address: iface.address,
          isVirtual,
          isPreferredPrefix: iface.address.startsWith('192.168.') || iface.address.startsWith('10.'),
        });
      }
    }
  }

  // 1. Preferir interfaces físicas en 192.168.* o 10.* (Wi-Fi o Ethernet)
  const best = candidates.find((c) => !c.isVirtual && c.isPreferredPrefix);
  if (best) return best.address;

  // 2. Cualquier interfaz física válida
  const anyReal = candidates.find((c) => !c.isVirtual);
  if (anyReal) return anyReal.address;

  // 3. Fallback
  if (candidates.length > 0) return candidates[0].address;

  return '127.0.0.1';
}

function generatePairingCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createPairingCode(req, res, next) {
  try {
    const userId = req.user.id;
    const tvSessionId = crypto.randomBytes(16).toString('hex');
    const pairingCode = generatePairingCode();

    // Expirar en 24 horas para mantener la vinculación activa
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Eliminar sesiones anteriores del mismo usuario
    await prisma.remoteSession.deleteMany({ where: { userId } });

    const session = await prisma.remoteSession.create({
      data: { userId, tvSessionId, pairingCode, expiresAt },
    });

    const lanIp = getLocalIpAddress();
    const backendPort = parseInt(process.env.PORT || '5000', 10);
    const serverUrl = `http://${lanIp}:${backendPort}`;
    const frontendUrl = `http://${lanIp}:3000`;

    // Construir payload estructurado para escaneo con cámara (con IP real de red)
    const qrData = JSON.stringify({
      code: pairingCode,
      tvSessionId,
      serverUrl,
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
      serverUrl,
      lanIp,
      backendPort,
      frontendUrl,
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

    if (global.io) {
      global.io.to(`tv:${session.tvSessionId}`).emit('remote:connected', {});
      global.io.to(`remote:${session.tvSessionId}`).emit('tv:status', {
        online: true,
        tvSessionId: session.tvSessionId,
      });
    }

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

export async function getCurrentSession(req, res, next) {
  try {
    const userId = req.user.id;
    const session = await prisma.remoteSession.findFirst({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    const lanIp = getLocalIpAddress();
    const backendPort = parseInt(process.env.PORT || '5000', 10);
    const serverUrl = `http://${lanIp}:${backendPort}`;
    const frontendUrl = `http://${lanIp}:3000`;

    if (!session) {
      return res.json({
        session: null,
        serverUrl,
        lanIp,
        backendPort,
        frontendUrl,
      });
    }

    let qrCode = null;
    try {
      const qrData = JSON.stringify({
        code: session.pairingCode,
        tvSessionId: session.tvSessionId,
        serverUrl,
      });
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
      logger.warn(`No se pudo generar QR code en getCurrentSession: ${qrErr.message}`);
    }

    res.json({
      session: {
        tvSessionId: session.tvSessionId,
        pairingCode: session.pairingCode,
        isConnected: session.isConnected,
        expiresAt: session.expiresAt,
        qrCode,
        serverUrl,
        lanIp,
        backendPort,
        frontendUrl,
      },
      serverUrl,
      lanIp,
      backendPort,
      frontendUrl,
    });
  } catch (error) {
    next(error);
  }
}

export async function disconnectRemote(req, res, next) {
  try {
    const userId = req.user.id;
    await prisma.remoteSession.updateMany({
      where: { userId, isConnected: true },
      data: { isConnected: false },
    });

    res.json({ success: true, message: 'Dispositivo remoto desconectado' });
  } catch (error) {
    next(error);
  }
}

