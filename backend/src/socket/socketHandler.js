import { logger } from '../utils/logger.js';
import { prisma } from '../config/database.js';

const playerStates = new Map();
global.playerStates = playerStates;

export function initializeSocket(io) {
  global.io = io;

  io.on('connection', (socket) => {
    const { sessionId, role } = socket.handshake.query;

    logger.info(`Socket conectado: ${socket.id} (session: ${sessionId || 'none'}, role: ${role || 'none'})`);

    if (sessionId) {
      socket.join(`tv:${sessionId}`);
      socket.sessionId = sessionId;
      logger.info(`TV unida a sala: tv:${sessionId}`);

      socket.to(`remote:${sessionId}`).emit('tv:online', { sessionId });
      socket.to(`remote:${sessionId}`).emit('tv:status', { online: true, tvSessionId: sessionId });
    }

    // Registro explícito desde el cliente TV
    socket.on('tv:join', ({ sessionId: clientSessionId }) => {
      const activeSession = clientSessionId || sessionId || socket.sessionId;
      if (activeSession) {
        socket.join(`tv:${activeSession}`);
        socket.sessionId = activeSession;
        logger.info(`TV unida explícitamente a sala: tv:${activeSession}`);
        io.to(`remote:${activeSession}`).emit('tv:online', { sessionId: activeSession });
        io.to(`remote:${activeSession}`).emit('tv:status', { online: true, tvSessionId: activeSession });
      }
    });

    if (role === 'admin') {
      socket.join('admin');
      logger.info(`Admin conectado: ${socket.id}`);
    }

    socket.on('player:state', (data) => {
      const activeSession = sessionId || socket.sessionId;
      if (activeSession && data) {
        // Guardar último estado conocido
        const enrichedState = {
          ...data,
          timestamp: Date.now(),
        };
        playerStates.set(activeSession, enrichedState);

        // Reenviar a controles remotos en la sala
        socket.to(`remote:${activeSession}`).emit('player:state', enrichedState);
      }
    });

    // REMOTE APP — unirse a sala de control
    socket.on('remote:join', async ({ tvSessionId, pairingCode }) => {
      let targetId = tvSessionId;

      // Si no proporcionó tvSessionId pero sí pairingCode, buscar la sesión
      if (!targetId && pairingCode) {
        try {
          const session = await prisma.remoteSession.findFirst({
            where: {
              pairingCode,
              expiresAt: { gt: new Date() },
            },
          });
          if (session) {
            targetId = session.tvSessionId;
            await prisma.remoteSession.update({
              where: { id: session.id },
              data: { isConnected: true },
            });
          }
        } catch (dbErr) {
          logger.error(`Error buscando sesión por pairingCode en socket: ${dbErr.message}`);
        }
      }

      if (targetId) {
        socket.join(`remote:${targetId}`);
        socket.remoteTvSessionId = targetId;

        // Verificar si la TV está online
        const tvRoom = io.sockets.adapter.rooms.get(`tv:${targetId}`);
        const isOnline = !!tvRoom && tvRoom.size > 0;

        // Enviar estado de la TV (si hay sala activa o sesión confirmada)
        socket.emit('tv:status', { online: isOnline || true, tvSessionId: targetId });

        // Enviar el último estado de reproducción conocido si existe
        const currentState = playerStates.get(targetId);
        if (currentState) {
          socket.emit('player:state', currentState);
        }

        io.to(`tv:${targetId}`).emit('remote:connected', { socketId: socket.id });
        logger.info(`Control remoto (${socket.id}) emparejado con TV en tv:${targetId}`);
      } else {
        socket.emit('remote:error', { message: 'Sesión no válida o expirada' });
      }
    });

    // COMANDOS DIRECTOS VÍA WEBSOCKET (Remote → TV)
    socket.on('remote:command', async ({ tvSessionId, pairingCode, command, payload }) => {
      let targetId = tvSessionId || socket.remoteTvSessionId;

      if (!targetId && pairingCode) {
        try {
          const session = await prisma.remoteSession.findFirst({
            where: { pairingCode, expiresAt: { gt: new Date() } },
          });
          if (session) targetId = session.tvSessionId;
        } catch (e) {
          logger.error(`Error resolviendo tvSessionId para comando: ${e.message}`);
        }
      }

      if (targetId && command) {
        io.to(`tv:${targetId}`).emit('remote:command', {
          command,
          payload: payload || {},
        });
      }
    });

    // PEDIR ESTADO ACTUAL DEL REPRODUCTOR
    socket.on('player:getState', ({ tvSessionId }) => {
      const targetId = tvSessionId || socket.remoteTvSessionId;
      if (targetId) {
        const state = playerStates.get(targetId);
        if (state) {
          socket.emit('player:state', state);
        }
      }
    });

    // DESCONEXIÓN
    socket.on('disconnect', (reason) => {
      logger.info(`Socket desconectado: ${socket.id} (${reason})`);

      const activeSession = sessionId || socket.sessionId;
      if (activeSession) {
        // Notificar que la TV se desconectó
        socket.to(`remote:${activeSession}`).emit('tv:offline', { sessionId: activeSession });
        playerStates.delete(activeSession);
      }

      if (socket.remoteTvSessionId) {
        io.to(`tv:${socket.remoteTvSessionId}`).emit('remote:disconnected', { socketId: socket.id });
      }
    });

    // HEARTBEAT — mantener conexión viva
    socket.on('ping', () => {
      socket.emit('pong', { time: Date.now() });
    });
  });

  logger.info('Socket.io inicializado');
}
