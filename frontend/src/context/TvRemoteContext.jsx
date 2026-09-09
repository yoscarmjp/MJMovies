import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';

const TvRemoteContext = createContext(null);

export function TvRemoteProvider({ children }) {
  const { isLoggedIn, user } = useAuthStore();
  const { info: toastInfo, success: toastSuccess } = useToastStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Estado de la sesión TV y emparejamiento
  const [tvSessionId, setTvSessionId] = useState(() => localStorage.getItem('mjmovies_tv_session_id') || null);
  const [pairingCode, setPairingCode] = useState(null);
  const currentHost = typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'localhost';
  const [serverUrl, setServerUrl] = useState(() => `http://${currentHost}:5000`);
  const [lanIp, setLanIp] = useState(currentHost);
  const [backendPort, setBackendPort] = useState(5000);
  const [frontendUrl, setFrontendUrl] = useState(() => `http://${currentHost}:3000`);
  const [qrCode, setQrCode] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [remoteConnected, setRemoteConnected] = useState(false);

  // HUD visual feedback al recibir comandos del control
  const [hudMessage, setHudMessage] = useState(null);
  const hudTimeoutRef = useRef(null);

  // Referencias de navegación espacial
  const socketRef = useRef(null);
  const focusedElementRef = useRef(null);
  const isNavigatingRef = useRef(false);

  const showHud = (msg) => {
    setHudMessage(msg);
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => {
      setHudMessage(null);
    }, 2000);
  };

  // Helper para resaltar visualmente el elemento enfocado (Estilo Netflix)
  const applyFocusStyle = useCallback((el) => {
    if (!el) return;
    // Remover estilo del anterior
    if (focusedElementRef.current && focusedElementRef.current !== el) {
      focusedElementRef.current.classList.remove(
        'ring-4',
        'ring-primary',
        'shadow-glow-primary',
        'scale-105',
        'z-30',
        'relative',
        'tv-focused'
      );
    }

    focusedElementRef.current = el;
    el.classList.add(
      'ring-4',
      'ring-primary',
      'shadow-glow-primary',
      'scale-105',
      'z-30',
      'relative',
      'tv-focused'
    );

    // Scroll suave para mantener a la vista en la pantalla
    try {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
    } catch {
      el.scrollIntoView();
    }
  }, []);

  const clearFocusStyle = useCallback(() => {
    if (focusedElementRef.current) {
      focusedElementRef.current.classList.remove(
        'ring-4',
        'ring-primary',
        'shadow-glow-primary',
        'scale-105',
        'z-30',
        'relative',
        'tv-focused'
      );
      focusedElementRef.current = null;
    }
  }, []);

  // Obtener elementos navegables en la pantalla actual
  const getNavigableElements = useCallback(() => {
    // Si hay un modal abierto (como Temporadas y Episodios o QR), navegar SOLO dentro del modal
    const activeModal = document.querySelector('[data-modal-container], [role="dialog"], .z-\\[100\\]');
    const container = activeModal || document;

    const selector = [
      '[data-nav-item]',
      '.movie-card',
      'button:not([disabled])',
      'a[href]:not([disabled])',
      'input:not([disabled])',
      '[role="button"]:not([disabled])',
    ].join(', ');

    const all = Array.from(container.querySelectorAll(selector));

    return all.filter((el) => {
      // Excluir elementos invisibles u ocultos
      if (!el.offsetParent && el.offsetWidth === 0 && el.offsetHeight === 0) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      return true;
    });
  }, []);

  // Navegación espacial D-Pad (▲, ▼, ◀, ▶) estilo Netflix
  const handleDirectionalNav = useCallback((direction) => {
    isNavigatingRef.current = true;
    const elements = getNavigableElements();
    if (elements.length === 0) return;

    const current = focusedElementRef.current;

    // Si el elemento previamente enfocado ya no existe o está fuera del modal activo
    const activeModal = document.querySelector('[data-modal-container], [role="dialog"], .z-\\[100\\]');
    const isCurrentInActiveModal = !activeModal || (current && activeModal.contains(current));

    if (!current || !document.body.contains(current) || !isCurrentInActiveModal) {
      // Enfocar primer ítem del modal o primera película/botón visible
      const firstTarget = elements[0];
      applyFocusStyle(firstTarget);
      showHud('🎮 Navegación Remota');
      return;
    }

    const currentRect = current.getBoundingClientRect();
    const currentCenter = {
      x: currentRect.left + currentRect.width / 2,
      y: currentRect.top + currentRect.height / 2,
    };

    let bestCandidate = null;
    let minScore = Infinity;

    for (const candidate of elements) {
      if (candidate === current) continue;

      const cRect = candidate.getBoundingClientRect();
      const cCenter = {
        x: cRect.left + cRect.width / 2,
        y: cRect.top + cRect.height / 2,
      };

      const dx = cCenter.x - currentCenter.x;
      const dy = cCenter.y - currentCenter.y;

      let isValidDirection = false;
      let primaryDist = 0;
      let secondaryDist = 0;

      switch (direction) {
        case 'right':
          isValidDirection = dx > 15;
          primaryDist = dx;
          secondaryDist = Math.abs(dy);
          break;
        case 'left':
          isValidDirection = dx < -15;
          primaryDist = Math.abs(dx);
          secondaryDist = Math.abs(dy);
          break;
        case 'down':
          isValidDirection = dy > 15;
          primaryDist = dy;
          secondaryDist = Math.abs(dx);
          break;
        case 'up':
          isValidDirection = dy < -15;
          primaryDist = Math.abs(dy);
          secondaryDist = Math.abs(dx);
          break;
        default:
          break;
      }

      if (isValidDirection) {
        // Ponderar distancia primaria vs secundaria para favorecer alineación
        const score = primaryDist + secondaryDist * 2.5;
        if (score < minScore) {
          minScore = score;
          bestCandidate = candidate;
        }
      }
    }

    if (bestCandidate) {
      applyFocusStyle(bestCandidate);
    }
  }, [getNavigableElements, applyFocusStyle]);

  // Selección (Botón OK)
  const handleSelect = useCallback(() => {
    const current = focusedElementRef.current;
    const playBtn = document.querySelector('[data-nav-item="player-play"]');
    const video = document.querySelector('video');

    if (current && document.body.contains(current)) {
      showHud('✓ Seleccionado');
      current.click();
      if (current.tagName === 'INPUT') {
        current.focus();
      }
    } else if (playBtn) {
      showHud('▶ Iniciar');
      playBtn.click();
    } else if (video) {
      // En reproductor si no hay botón enfocado, alternar play/pause
      if (video.paused) {
        video.play().catch(() => {});
        showHud('▶ Reanudar');
      } else {
        video.pause();
        showHud('⏸ Pausar');
      }
    } else {
      window.dispatchEvent(
        new CustomEvent('mjmovies:remote_command', {
          detail: { command: 'play', payload: {} },
        })
      );
      showHud('▶ Reproducir');
    }
  }, []);

  // Volver (Botón Volver)
  const handleBack = useCallback(() => {
    // Si hay un modal visible con botón de cerrar, cerrarlo primero
    const modalCloseBtn = document.querySelector('[data-modal-close], .modal-close-btn');
    if (modalCloseBtn) {
      showHud('Cerrar Ventana');
      clearFocusStyle();
      modalCloseBtn.click();
      return;
    }

    showHud('↩ Volver');
    clearFocusStyle();
    window.history.back();
  }, [clearFocusStyle]);

  // Inicio (Botón Home)
  const handleHome = useCallback(() => {
    showHud('🏠 Inicio');
    clearFocusStyle();
    navigate('/');
  }, [clearFocusStyle, navigate]);

  // Búsqueda remota estilo Netflix
  const handleSearch = useCallback((query) => {
    showHud(`🔍 Buscando: "${query || ''}"`);
    clearFocusStyle();
    if (query && query.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(query.trim())}`);
    } else {
      navigate('/catalog');
      setTimeout(() => {
        const searchInput = document.querySelector('input[type="text"], input[type="search"]');
        if (searchInput) {
          searchInput.focus();
          applyFocusStyle(searchInput);
        }
      }, 300);
    }
  }, [clearFocusStyle, navigate, applyFocusStyle]);

  // Limpiar foco al cambiar de ruta
  useEffect(() => {
    clearFocusStyle();
  }, [location.pathname, clearFocusStyle]);

  // Inicializar o refrescar sesión de emparejamiento con el backend
  const refreshPairing = useCallback(async () => {
    if (!isLoggedIn) return;

    try {
      const res = await api.get('/remote/pairing');
      const data = res.data;

      setPairingCode(data.pairingCode);
      setTvSessionId(data.tvSessionId);
      setServerUrl(data.serverUrl || 'http://192.168.1.7:5000');
      setLanIp(data.lanIp || '192.168.1.7');
      setBackendPort(data.backendPort || 5000);
      setFrontendUrl(data.frontendUrl || 'http://192.168.1.7:3000');
      setQrCode(data.qrCode);
      setExpiresAt(data.expiresAt);

      localStorage.setItem('mjmovies_tv_session_id', data.tvSessionId);
      return data;
    } catch (err) {
      console.warn('Error inicializando emparejamiento TV:', err);
      return null;
    }
  }, [isLoggedIn]);

  // Consultar sesión activa al montar
  useEffect(() => {
    if (!isLoggedIn) return;

    let isMounted = true;

    api.get('/remote/session')
      .then(({ data }) => {
        if (!isMounted) return;

        if (data.serverUrl) setServerUrl(data.serverUrl);
        if (data.lanIp) setLanIp(data.lanIp);
        if (data.backendPort) setBackendPort(data.backendPort);
        if (data.frontendUrl) setFrontendUrl(data.frontendUrl);

        if (data.session) {
          setTvSessionId(data.session.tvSessionId);
          setPairingCode(data.session.pairingCode);
          setRemoteConnected(!!data.session.isConnected);
          setExpiresAt(data.session.expiresAt);
          if (data.session.qrCode) setQrCode(data.session.qrCode);
          localStorage.setItem('mjmovies_tv_session_id', data.session.tvSessionId);
        } else {
          // Generar nueva sesión limpia
          refreshPairing();
        }
      })
      .catch(() => {
        refreshPairing();
      });

    return () => {
      isMounted = false;
    };
  }, [isLoggedIn, refreshPairing]);

  // Conexión permanente de Socket.io del TV
  useEffect(() => {
    // Conectar directamente al backend (puerto 5000) en el mismo host del navegador
    const currentHost = (typeof window !== 'undefined' && window.location.hostname) ? window.location.hostname : 'localhost';
    const targetSocketUrl = `http://${currentHost}:5000`;

    const socket = io(targetSocketUrl, {
      query: { sessionId: tvSessionId, role: 'tv' },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // Registrar TV explícitamente en la sala
      socket.emit('tv:join', { sessionId: tvSessionId });
    });

    socket.on('remote:connected', () => {
      setRemoteConnected(true);
      showHud('📱 Control Remoto Conectado');
      toastSuccess('¡Control remoto móvil emparejado!');
    });

    socket.on('remote:disconnected', () => {
      setRemoteConnected(false);
      showHud('📱 Control Remoto Desconectado');
    });

    // Despacho de comandos desde el control móvil
    socket.on('remote:command', ({ command, payload }) => {
      const p = payload || {};
      const video = document.querySelector('video');

      // Notificar a listeners locales (como PlayerView)
      window.dispatchEvent(
        new CustomEvent('mjmovies:remote_command', {
          detail: { command, payload: p },
        })
      );

      switch (command) {
        case 'navigate':
          handleDirectionalNav(p.direction);
          break;

        case 'select':
          handleSelect();
          break;

        case 'back':
          handleBack();
          break;

        case 'home':
          handleHome();
          break;

        case 'search':
          handleSearch(p.query);
          break;

        case 'play':
          if (video) {
            video.play().catch(() => {});
            showHud('▶ Reproducir');
          }
          break;

        case 'pause':
          if (video) {
            video.pause();
            showHud('⏸ Pausa');
          }
          break;

        case 'seek':
          if (video) {
            const delta = p.value || 10;
            video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + delta));
            showHud(`${delta > 0 ? '⏩ +' : '⏪ '}${delta}s`);
          }
          break;

        case 'seekTo':
          if (video && typeof p.position === 'number') {
            video.currentTime = p.position;
          }
          break;

        case 'volume':
          if (video) {
            const delta = p.value || 0.1;
            video.volume = Math.max(0, Math.min(1, video.volume + delta));
            showHud(`🔊 Volumen: ${Math.round(video.volume * 100)}%`);
          }
          break;

        case 'fullscreen':
          if (video) {
            if (!document.fullscreenElement) {
              const container = video.parentElement || video;
              container.requestFullscreen?.().catch(() => {});
            } else {
              document.exitFullscreen?.().catch(() => {});
            }
          }
          break;

        default:
          break;
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [tvSessionId, handleDirectionalNav, handleSelect, handleBack, handleHome, handleSearch, toastSuccess]);

  // Enviar estado de reproducción hacia el control remoto
  const sendPlayerState = useCallback((state) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('player:state', state);
    }
  }, []);

  const value = {
    tvSessionId,
    pairingCode,
    serverUrl,
    lanIp,
    backendPort,
    frontendUrl,
    qrCode,
    expiresAt,
    remoteConnected,
    refreshPairing,
    sendPlayerState,
    handleDirectionalNav,
    handleSelect,
    handleBack,
    handleHome,
    handleSearch,
  };

  return (
    <TvRemoteContext.Provider value={value}>
      {children}

      {hudMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-fade-in">
          <div className="px-5 py-2.5 rounded-sm bg-surface-1/95 border border-primary/40 shadow-glow-primary backdrop-blur-xl flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-black tracking-wide text-white drop-shadow">
              {hudMessage}
            </span>
          </div>
        </div>
      )}
    </TvRemoteContext.Provider>
  );
}

export function useTvRemote() {
  const context = useContext(TvRemoteContext);
  if (!context) {
    throw new Error('useTvRemote debe usarse dentro de un TvRemoteProvider');
  }
  return context;
}
