import { create } from 'zustand';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useRemoteStore = create((set, get) => ({
  socket: null,
  tvSessionId: null,
  pairingCode: null,
  serverUrl: '',
  isConnected: false,
  tvOnline: false,
  playerState: { playing: false, position: 0, duration: 0, volume: 1, title: '' },

  setServerUrl: (url) => set({ serverUrl: url }),

  // Cargar serverUrl guardada
  loadSavedConfig: async () => {
    try {
      const savedUrl = await AsyncStorage.getItem('serverUrl');
      if (savedUrl) {
        set({ serverUrl: savedUrl });
        return savedUrl;
      }
    } catch (e) {
      console.warn('Error cargando configuración guardada:', e);
    }
    return null;
  },

  // Conectar al servidor y emparejar con la TV
  connect: async (serverUrl, pairingCode) => {
    try {
      const cleanUrl = serverUrl.trim().replace(/\/$/, '');

      // 1. Emparejamiento HTTP
      const res = await fetch(`${cleanUrl}/api/remote/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairingCode }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Código de emparejamiento inválido o expirado');
      }

      const data = await res.json();
      const { tvSessionId } = data;

      // Desconectar socket previo si existía
      const oldSocket = get().socket;
      if (oldSocket) {
        oldSocket.disconnect();
      }

      // 2. Conectar Socket.io con transporte optimizado y reconexión
      const socket = io(cleanUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
        query: { role: 'remote' },
      });

      socket.on('connect', () => {
        socket.emit('remote:join', { tvSessionId, pairingCode });
        set({ isConnected: true });
        // Solicitar estado actual inmediatamente
        socket.emit('player:getState', { tvSessionId });
      });

      socket.on('tv:status', ({ online }) => {
        set({ tvOnline: online });
      });

      socket.on('tv:online', () => set({ tvOnline: true }));
      socket.on('tv:offline', () => set({ tvOnline: false }));

      socket.on('player:state', (state) => {
        set({ playerState: state });
      });

      socket.on('disconnect', () => {
        set({ isConnected: false, tvOnline: false });
      });

      // Guardar serverUrl persistente
      await AsyncStorage.setItem('serverUrl', cleanUrl);

      set({
        socket,
        tvSessionId,
        pairingCode,
        serverUrl: cleanUrl,
        isConnected: true,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Enviar comando al reproductor (WebSocket con fallback a HTTP)
  sendCommand: async (command, payload = {}) => {
    const { socket, isConnected, tvSessionId, pairingCode, serverUrl } = get();

    // 1. Vía WebSocket directa (latencia instantánea de 1-5ms)
    if (socket && socket.connected) {
      socket.emit('remote:command', {
        tvSessionId,
        pairingCode,
        command,
        payload,
      });
      return;
    }

    // 2. Fallback HTTP si el socket estuviese temporalmente reconectando
    if (serverUrl && pairingCode) {
      try {
        await fetch(`${serverUrl}/api/remote/command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pairingCode, command, payload }),
        });
      } catch (error) {
        console.error('Command HTTP fallback error:', error);
      }
    }
  },

  // Comando especial para seek absoluto en la barra de reproducción
  seekToPosition: (seconds) => {
    const { sendCommand } = get();
    sendCommand('seekTo', { position: seconds });
  },

  disconnect: () => {
    const { socket } = get();
    socket?.disconnect();
    set({
      socket: null,
      tvSessionId: null,
      pairingCode: null,
      isConnected: false,
      tvOnline: false,
    });
  },
}));

export default useRemoteStore;
