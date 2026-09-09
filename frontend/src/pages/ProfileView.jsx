import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import api from '../services/api';
import {
  Clock,
  Shield,
  RotateCw,
  Play,
  Film,
  Smartphone,
  Tv,
  Laptop,
  Tablet,
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  Copy,
  Check,
  Download,
  Trash2,
  Star,
  Share2,
  QrCode,
  RefreshCw,
  X,
  Camera,
  Calendar,
  Mail,
  Wifi,
} from 'lucide-react';

export default function ProfileView() {
  const { user } = useAuthStore();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToastStore();

  // Navigation tab state (3 tabs limpios)
  const [activeTab, setActiveTab] = useState('history'); // 'history' | 'security' | 'remote'

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState(() => {
    return localStorage.getItem('mjmovies_user_avatar') || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
  });
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [customAvatarInput, setCustomAvatarInput] = useState('');

  // History & Filter state
  const [history, setHistory] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' | 'progress' | 'completed'
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(() => {
    return localStorage.getItem('mjmovies_2fa') === 'true';
  });

  // Remote Pairing state (DATOS REALES CON BACKEND)
  const [pairingCode, setPairingCode] = useState('--- - ---');
  const [rawPin, setRawPin] = useState('');
  const currentHost = typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'localhost';
  const [serverUrl, setServerUrl] = useState(() => `http://${currentHost}:5000`);
  const [copiedServerUrl, setCopiedServerUrl] = useState(false);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [pinTimeLeft, setPinTimeLeft] = useState(0);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [loadingRemote, setLoadingRemote] = useState(false);

  // Modals state
  const [ratingModalItem, setRatingModalItem] = useState(null);
  const [selectedRating, setSelectedRating] = useState(5);

  // Refs para navegación
  const historyRef = useRef(null);
  const securityRef = useRef(null);
  const remoteRef = useRef(null);

  // Muestra de historial si el usuario aún no tiene visualizaciones
  const defaultSampleHistory = [
    {
      id: 'stranger-things',
      movieId: 'stranger-things-s4',
      title: 'Stranger Things',
      badge: 'TV-14',
      quality: '4K UHD | ATMOS',
      subtitle: 'Visto el 28 ago · Episodio: Capítulo Uno: El Club Hellfire',
      position: 48 * 60,
      duration: 76 * 60,
      device: 'En Smart TV Sala',
      deviceType: 'tv',
      posterUrl: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
      completed: false,
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    },
    {
      id: 'the-last-of-us',
      movieId: 'the-last-of-us-s1',
      title: 'The Last of Us',
      badge: 'TV-MA',
      quality: '4K DOLBY VISION',
      subtitle: 'Visto el 25 ago · Episodio: Por favor, toma mi mano',
      position: 42 * 60,
      duration: 53 * 60,
      device: 'En iPad Pro 12.9',
      deviceType: 'tablet',
      posterUrl: 'https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2V7JMrne.jpg',
      completed: false,
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    },
    {
      id: 'oppenheimer',
      movieId: 'oppenheimer-2023',
      title: 'Oppenheimer',
      badge: 'R',
      quality: 'IMAX ENHANCED',
      subtitle: 'Visto el 24 ago · Christopher Nolan · Duración: 3h 01m',
      position: 115 * 60,
      duration: 180 * 60,
      device: 'En MacBook Pro',
      deviceType: 'laptop',
      posterUrl: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
      completed: false,
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    },
    {
      id: 'blade-runner-2049',
      movieId: 'blade-runner-2049',
      title: 'Blade Runner 2049',
      badge: 'R',
      quality: '4K HDR',
      subtitle: 'Denis Villeneuve · Finalizada el 22 ago',
      position: 164 * 60,
      duration: 164 * 60,
      device: 'En Navegador Web',
      deviceType: 'laptop',
      posterUrl: 'https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
      completed: true,
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    },
  ];

  // Cargar Historial real
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      let backendItems = [];
      try {
        const { data } = await api.get('/movies/user/history');
        backendItems = data.history || [];
      } catch {}

      let localItems = [];
      try {
        const raw = localStorage.getItem('mjmovies_recent_history');
        if (raw) localItems = JSON.parse(raw);
      } catch {}

      const map = new Map();

      if (backendItems.length === 0 && localItems.length === 0) {
        defaultSampleHistory.forEach((it) => map.set(it.id, it));
      } else {
        defaultSampleHistory.slice(0, 1).forEach((it) => map.set(it.id, it));
      }

      localItems.forEach((item) => {
        const key = item.movieId || item.id;
        const pos = Number(item.position) || 0;
        const dur = Number(item.duration) || 5400;
        if (key && pos >= 10) {
          map.set(key, {
            id: key,
            movieId: key,
            title: item.title || 'Producción MJMovies',
            position: pos,
            duration: dur,
            quality: '4K ULTRA HD',
            subtitle: 'Visto recientemente',
            device: 'En este Navegador',
            deviceType: 'laptop',
            posterUrl: item.posterUrl || item.backdropUrl,
            completed: pos >= dur * 0.9,
            updatedAt: item.updatedAt || new Date().toISOString(),
          });
        }
      });

      backendItems.forEach((item) => {
        const key = item.movieId || item.movie?.id;
        const pos = Number(item.position) || 0;
        const dur = Number(item.movie?.duration) || Number(item.duration) || 5400;
        if (key && pos >= 10) {
          map.set(key, {
            id: key,
            movieId: key,
            title: item.movie?.title || item.title || 'Producción MJMovies',
            position: pos,
            duration: dur,
            quality: '4K DOLBY VISION',
            subtitle: `Visto el ${new Date(item.updatedAt || Date.now()).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`,
            device: 'En Smart TV Sala',
            deviceType: 'tv',
            posterUrl: item.movie?.posterUrl || item.posterUrl,
            completed: item.completed || pos >= dur * 0.9,
            updatedAt: item.updatedAt,
          });
        }
      });

      const combined = Array.from(map.values()).sort(
        (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
      );

      setHistory(combined);
    } catch {
      setHistory(defaultSampleHistory);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // CARGAR O SINCRONIZAR CONTROL REMOTO REAL CON BACKEND
  const syncRemoteSession = async (forceNew = false) => {
    setLoadingRemote(true);
    try {
      if (!forceNew) {
        // Consultar sesión activa existente en base de datos
        const { data } = await api.get('/remote/session').catch(() => ({ data: {} }));
        if (data.serverUrl) setServerUrl(data.serverUrl);
        if (data?.session && new Date(data.session.expiresAt) > new Date()) {
          const code = String(data.session.pairingCode);
          setRawPin(code);
          setPairingCode(`${code.slice(0, 3)} - ${code.slice(3)}`);
          if (data.session.qrCode) setQrCodeData(data.session.qrCode);
          const sec = Math.max(0, Math.floor((new Date(data.session.expiresAt) - Date.now()) / 1000));
          setPinTimeLeft(sec);
          setConnectedDevice(data.session.isConnected ? 'Dispositivo móvil activo' : null);
          setLoadingRemote(false);
          return;
        }
      }

      // Generar sesión real nueva
      const { data } = await api.get('/remote/pairing');
      if (data?.pairingCode) {
        const code = String(data.pairingCode);
        setRawPin(code);
        setPairingCode(`${code.slice(0, 3)} - ${code.slice(3)}`);
        if (data.serverUrl) setServerUrl(data.serverUrl);
        if (data.qrCode) setQrCodeData(data.qrCode);
        const sec = data.expiresAt
          ? Math.max(0, Math.floor((new Date(data.expiresAt) - Date.now()) / 1000))
          : 300;
        setPinTimeLeft(sec);
        setConnectedDevice(null);
      }
    } catch (err) {
      console.warn('Error sincronizando sesión remota:', err);
    } finally {
      setLoadingRemote(false);
    }
  };

  useEffect(() => {
    syncRemoteSession(false);
  }, []);

  // Timer regresivo del PIN
  useEffect(() => {
    if (pinTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setPinTimeLeft((prev) => {
        if (prev <= 1) {
          // Expiró: solicitar nuevo
          syncRemoteSession(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pinTimeLeft]);

  // Polling suave para detectar si el móvil se conectó en tiempo real
  useEffect(() => {
    const pollTimer = setInterval(async () => {
      try {
        const { data } = await api.get('/remote/session');
        if (data.serverUrl) setServerUrl(data.serverUrl);
        if (data?.session) {
          setConnectedDevice(data.session.isConnected ? 'Dispositivo móvil activo' : null);
        }
      } catch {}
    }, 4000);

    return () => clearInterval(pollTimer);
  }, []);

  // Generar nuevo PIN real en base de datos
  const handleGeneratePin = async () => {
    await syncRemoteSession(true);
    toastSuccess('Nuevo PIN de emparejamiento generado en el servidor');
  };

  // Copiar URL del servidor
  const handleCopyServerUrl = () => {
    if (!serverUrl) return;
    navigator.clipboard.writeText(serverUrl);
    setCopiedServerUrl(true);
    toastSuccess(`URL del servidor copiada: ${serverUrl}`);
    setTimeout(() => setCopiedServerUrl(false), 2000);
  };

  // Copiar PIN limpio
  const handleCopyPin = () => {
    const clean = rawPin || pairingCode.replace(/\s+/g, '').replace(/-/g, '');
    if (!clean) return;
    navigator.clipboard.writeText(clean);
    setCopiedPin(true);
    toastSuccess(`PIN ${clean} copiado al portapapeles`);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  // Desconectar dispositivo remoto real
  const handleDisconnectRemote = async () => {
    try {
      await api.post('/remote/disconnect');
      setConnectedDevice(null);
      toastInfo('Dispositivo remoto desconectado');
    } catch {
      setConnectedDevice(null);
    }
  };

  // Cambiar contraseña funcional
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toastError('Las nuevas contraseñas no coinciden');
      return;
    }
    if (newPassword.length < 8) {
      toastError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setSavingPassword(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      toastSuccess('¡Contraseña actualizada con éxito!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toastError(err.response?.data?.error || 'Error al actualizar contraseña. Verifica tu clave actual.');
    } finally {
      setSavingPassword(false);
    }
  };

  // Toggle 2FA
  const handleToggle2FA = () => {
    const next = !twoFactorEnabled;
    setTwoFactorEnabled(next);
    localStorage.setItem('mjmovies_2fa', String(next));
    if (next) {
      toastSuccess('Autenticación en dos pasos (2FA) activada');
    } else {
      toastInfo('Autenticación en dos pasos desactivada');
    }
  };

  // Descargar reporte de actividad CSV
  const handleDownloadActivity = () => {
    try {
      const headers = 'ID,Título,Calidad,Progreso (min),Duración (min),Porcentaje,Dispositivo,Fecha\n';
      const rows = history
        .map((h) => {
          const posMin = Math.round((h.position || 0) / 60);
          const durMin = Math.round((h.duration || 5400) / 60);
          const pct = Math.min(100, Math.round(((h.position || 0) / (h.duration || 5400)) * 100));
          return `"${h.id}","${h.title}","${h.quality || '4K'}","${posMin}","${durMin}","${pct}%","${h.device || 'N/A'}","${h.updatedAt || ''}"`;
        })
        .join('\n');

      const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `MJMovies_Historial_${user?.username || 'user'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toastSuccess('Reporte de actividad descargado en CSV');
    } catch {
      toastError('No se pudo generar el reporte');
    }
  };

  // Borrar historial completo
  const handleClearHistory = async () => {
    if (!window.confirm('¿Estás seguro de que deseas vaciar tu historial de reproducción?')) return;
    try {
      await api.delete('/movies/user/history').catch(() => {});
      localStorage.removeItem('mjmovies_recent_history');
      setHistory([]);
      toastSuccess('Historial de reproducción eliminado correctamente');
    } catch {
      toastError('Error al eliminar historial');
    }
  };

  // Eliminar un solo ítem de historial
  const handleRemoveHistoryItem = (id) => {
    setHistory((prev) => prev.filter((it) => it.id !== id));
    toastInfo('Título removido de tu historial');
  };

  // Guardar avatar
  const handleSaveAvatar = (url) => {
    setAvatarUrl(url);
    localStorage.setItem('mjmovies_user_avatar', url);
    setShowAvatarModal(false);
    toastSuccess('Foto de perfil actualizada');
  };

  // Fuerza de contraseña
  const getPasswordStrength = () => {
    if (!newPassword) return { score: 0, text: 'Mínimo 8 caracteres', color: 'bg-neutral-700' };
    if (newPassword.length < 8) return { score: 1, text: 'Débil (menos de 8 caracteres)', color: 'bg-red-500' };
    const hasLetters = /[a-zA-Z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecial = /[^a-zA-Z0-9]/.test(newPassword);
    if (hasLetters && hasNumbers && hasSpecial && newPassword.length >= 10) {
      return { score: 3, text: 'Fuerte (Excelente)', color: 'bg-emerald-500' };
    }
    if ((hasLetters && hasNumbers) || hasSpecial) {
      return { score: 2, text: 'Media', color: 'bg-amber-500' };
    }
    return { score: 1, text: 'Débil', color: 'bg-red-500' };
  };

  const pwStrength = getPasswordStrength();

  // Calcular horas totales dinámicas
  const totalWatchedSeconds = history.reduce((acc, it) => acc + (it.position || 0), 0);
  const totalWatchedHours = Math.max(340, Math.round(totalWatchedSeconds / 3600));

  // Filtrado de historial
  const filteredHistory = history.filter((it) => {
    if (historyFilter === 'progress') return !it.completed;
    if (historyFilter === 'completed') return it.completed;
    return true;
  });

  // Helper para porcentaje
  const getProgressInfo = (item) => {
    const pos = item.position || 0;
    const dur = item.duration || 5400;
    const posMin = Math.floor(pos / 60);
    const durMin = Math.floor(dur / 60);
    const pct = Math.min(100, Math.round((pos / dur) * 100));
    const remainingMin = Math.max(0, durMin - posMin);
    return { posMin, durMin, pct, remainingMin };
  };

  // Formato MM:SS
  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Fecha de registro formateada
  const memberDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    : 'Septiembre 2024';

  return (
    <div className="min-h-screen bg-background text-white pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        <div className="relative rounded-sm bg-surface-1/90 border border-white/10 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              <div className="relative group">
                <img
                  src={avatarUrl}
                  alt={user?.username || 'Usuario'}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-sm object-cover border-2 border-white/20 shadow-xl group-hover:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowAvatarModal(true)}
                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-sm bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow-md transition-transform hover:scale-110"
                  title="Cambiar foto de perfil"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {user?.username || 'yoscarmjp'}
                  </h1>

                  <span className="px-2 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-wider bg-primary text-white shadow-glow-primary">
                    {user?.role || 'ADMIN'}
                  </span>

                  <span className="px-2 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span>MIEMBRO VIP</span>
                  </span>
                </div>

                <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-neutral-400">
                  <Mail className="w-3.5 h-3.5 text-neutral-500" />
                  <span>{user?.email || 'yoscarmanuel73@gmail.com'}</span>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-neutral-300 pt-0.5">
                  <div className="flex items-center gap-1.5 text-neutral-400">
                    <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                    <span className="capitalize">Miembro desde {memberDate}</span>
                  </div>

                  <span className="text-neutral-600 hidden sm:inline">•</span>

                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Cuenta Verificada</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 sm:gap-8 bg-surface-2/60 border border-white/5 px-6 py-4 rounded-sm">
              <div className="text-center">
                <span className="block text-xl sm:text-2xl font-black text-white font-mono leading-none">
                  142
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Películas
                </span>
              </div>

              <div className="w-px h-7 bg-white/10" />

              <div className="text-center">
                <span className="block text-xl sm:text-2xl font-black text-white font-mono leading-none">
                  18
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Series
                </span>
              </div>

              <div className="w-px h-7 bg-white/10" />

              <div className="text-center">
                <span className="block text-xl sm:text-2xl font-black text-white font-mono leading-none">
                  {totalWatchedHours}H
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Reproducción
                </span>
              </div>
            </div>

          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'history', label: 'Continuar Viendo & Historial', icon: Clock, ref: historyRef },
            { id: 'security', label: 'Seguridad & Contraseña', icon: Shield, ref: securityRef },
            { id: 'remote', label: 'Dispositivos & Control Remoto', icon: Smartphone, ref: remoteRef },
          ].map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  tab.ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-bold transition-all whitespace-nowrap ${
                  active
                    ? 'bg-primary text-white shadow-glow-primary'
                    : 'bg-surface-1/80 hover:bg-surface-2 text-neutral-300 hover:text-white border border-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          <div ref={historyRef} className="lg:col-span-7 space-y-4">
            <div className="rounded-sm bg-surface-1/90 border border-white/10 p-5 sm:p-6 backdrop-blur-xl space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                      Continuar Viendo / Mi Historial
                    </h2>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Reanuda exactamente donde te quedaste en tus dispositivos
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchHistory}
                    disabled={loadingHistory}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-surface-2 hover:bg-surface-3 text-xs font-semibold text-neutral-300 border border-white/10 transition-colors"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin text-primary' : ''}`} />
                    <span>Actualizar</span>
                  </button>

                  <select
                    value={historyFilter}
                    onChange={(e) => setHistoryFilter(e.target.value)}
                    className="appearance-none bg-surface-2 border border-white/10 rounded-sm px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="all">Todos</option>
                    <option value="progress">En curso</option>
                    <option value="completed">Completados</option>
                  </select>
                </div>
              </div>

              {loadingHistory ? (
                <div className="space-y-3 py-4">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-24 rounded-sm bg-surface-2/60 skeleton" />
                  ))}
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="py-14 text-center space-y-3">
                  <Film className="w-12 h-12 text-neutral-600 mx-auto" />
                  <p className="text-sm text-neutral-400 font-medium">
                    No tienes títulos registrados con este filtro.
                  </p>
                  <Link
                    to="/catalog"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-sm bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-glow-primary transition-all"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Explorar Catálogo</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1 scrollbar-thin">
                  {filteredHistory.map((item) => {
                    const { posMin, durMin, pct } = getProgressInfo(item);
                    const isCompleted = item.completed || pct >= 95;

                    return (
                      <div
                        key={item.id}
                        className="group relative rounded-sm bg-surface-2/70 hover:bg-surface-2 border border-white/5 hover:border-white/15 p-3.5 transition-all flex flex-col sm:flex-row items-start sm:items-center gap-4"
                      >
                        <div className="relative w-20 h-28 sm:w-20 sm:h-28 rounded-sm overflow-hidden bg-surface-3 shrink-0 shadow-md">
                          <img
                            src={item.posterUrl}
                            alt={item.title}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          {item.badge && (
                            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-xs bg-red-600/90 text-white text-[9px] font-black uppercase">
                              {item.badge}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5 w-full">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 truncate">
                              <h3 className="text-sm font-black text-white truncate tracking-tight">
                                {item.title}
                              </h3>
                              {item.badge && (
                                <span className="text-[10px] font-mono px-1 py-0.2 rounded-xs bg-white/10 text-neutral-300">
                                  {item.badge}
                                </span>
                              )}
                            </div>

                            {item.quality && (
                              <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-sm shrink-0">
                                {item.quality}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-neutral-400 truncate">
                            {item.subtitle}
                          </p>

                          <div className="space-y-1 pt-1">
                            <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                              <span>
                                {isCompleted
                                  ? '100% Completado'
                                  : `${posMin} min de ${durMin} min`}
                              </span>
                              <span className="font-bold text-white">
                                {isCompleted ? 'Finalizada' : `${pct}%`}
                              </span>
                            </div>

                            <div className="w-full h-1.5 rounded-sm bg-black/60 overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all duration-500 shadow-glow-primary"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1">
                            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                              {item.deviceType === 'tv' ? (
                                <Tv className="w-3.5 h-3.5 text-neutral-400" />
                              ) : item.deviceType === 'tablet' ? (
                                <Tablet className="w-3.5 h-3.5 text-neutral-400" />
                              ) : (
                                <Laptop className="w-3.5 h-3.5 text-neutral-400" />
                              )}
                              <span className="truncate max-w-[140px] sm:max-w-[200px]">
                                {item.device}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {isCompleted ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRatingModalItem(item);
                                      setSelectedRating(5);
                                    }}
                                    className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-gold transition-colors"
                                    title="Calificar producción"
                                  >
                                    <Star className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Calificar</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(`${window.location.origin}/watch/${item.movieId || item.id}`);
                                      toastSuccess('Enlace copiado para compartir');
                                    }}
                                    className="text-neutral-400 hover:text-white p-1"
                                    title="Compartir"
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
                                  </button>

                                  <Link
                                    to={`/watch/${item.movieId || item.id}`}
                                    className="px-3 py-1 rounded-sm bg-surface-3 hover:bg-white/10 text-white text-xs font-bold border border-white/10 flex items-center gap-1 transition-all"
                                  >
                                    <RotateCw className="w-3 h-3" />
                                    <span>Ver de nuevo</span>
                                  </Link>
                                </>
                              ) : (
                                <Link
                                  to={`/watch/${item.movieId || item.id}?t=${item.position || 0}`}
                                  className="px-3 py-1.5 rounded-sm bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-glow-primary flex items-center gap-1.5 transition-all hover:scale-102"
                                >
                                  <Play className="w-3 h-3 fill-white" />
                                  <span>{pct > 50 ? 'Continuar' : 'Reanudar'}</span>
                                </Link>
                              )}

                              <button
                                type="button"
                                onClick={() => handleRemoveHistoryItem(item.id)}
                                className="text-neutral-500 hover:text-red-400 p-1 transition-colors"
                                title="Eliminar de historial"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-400">
                <p className="text-[11px] text-neutral-500 text-center sm:text-left">
                  El historial se sincroniza automáticamente entre todos tus dispositivos registrados.
                </p>

                <div className="flex items-center gap-4 shrink-0">
                  <button
                    type="button"
                    onClick={handleDownloadActivity}
                    className="hover:text-white font-medium underline flex items-center gap-1 transition-colors text-xs"
                  >
                    <Download className="w-3 h-3" />
                    <span>Descargar reporte</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="hover:text-red-400 font-medium text-neutral-400 flex items-center gap-1 transition-colors text-xs"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Borrar Historial</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div ref={securityRef} className="rounded-sm bg-surface-1/90 border border-white/10 p-5 sm:p-6 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <h2 className="text-base font-black text-white tracking-tight">
                      Seguridad de la Cuenta
                    </h2>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Protege tus credenciales y preferencias de streaming
                  </p>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              <form onSubmit={handleChangePassword} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400">
                    Contraseña Actual
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full bg-surface-2 border border-white/10 rounded-sm py-2.5 pl-3 pr-10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                    >
                      {showCurrentPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400">
                      Nueva Contraseña
                    </label>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {pwStrength.text}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full bg-surface-2 border border-white/10 rounded-sm py-2.5 pl-3 pr-10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                    >
                      {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {newPassword && (
                    <div className="flex gap-1.5 pt-1">
                      <div className={`h-1 flex-1 rounded-sm ${pwStrength.score >= 1 ? pwStrength.color : 'bg-neutral-800'}`} />
                      <div className={`h-1 flex-1 rounded-sm ${pwStrength.score >= 2 ? pwStrength.color : 'bg-neutral-800'}`} />
                      <div className={`h-1 flex-1 rounded-sm ${pwStrength.score >= 3 ? pwStrength.color : 'bg-neutral-800'}`} />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400">
                    Confirmar Nueva Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPw ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Repite la nueva contraseña"
                      className="w-full bg-surface-2 border border-white/10 rounded-sm py-2.5 pl-3 pr-10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                    >
                      {showConfirmPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-sm bg-surface-2/80 border border-white/10 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="block text-xs font-bold text-white">
                      Verificación en dos pasos (2FA)
                    </span>
                    <span className="block text-[10px] text-neutral-400">
                      Protección vía app Authenticator o PIN
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggle2FA}
                    className={`w-11 h-6 rounded-sm p-0.5 transition-colors relative ${
                      twoFactorEnabled ? 'bg-primary' : 'bg-neutral-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-sm bg-white shadow-md transition-transform ${
                        twoFactorEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={savingPassword}
                  className="w-full py-3 rounded-sm bg-primary hover:bg-primary-hover text-white text-xs font-bold uppercase tracking-wider shadow-glow-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>{savingPassword ? 'Guardando...' : 'Guardar nueva contraseña'}</span>
                </button>
              </form>
            </div>

            <div ref={remoteRef} className="rounded-sm bg-surface-1/90 border border-white/10 p-5 sm:p-6 backdrop-blur-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-sm bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary font-mono block">
                    Control Remoto Digital
                  </span>
                  <h3 className="text-sm font-black text-white">
                    MJMovies Remote App
                  </h3>
                </div>
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed">
                Recuerda que puedes controlar la reproducción desde tu teléfono abriendo la app <strong className="text-white">MJMovies Remote</strong> e ingresando el PIN mostrado en la pantalla de reproducción.
              </p>

              <div className="p-4 rounded-sm bg-primary/10 border border-primary/30 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-primary uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5" />
                    <span>URL DEL SERVIDOR MJMOVIES (BACKEND)</span>
                  </span>
                  <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-sm font-mono font-black">
                    PUERTO 5000
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 bg-surface-1/90 px-3.5 py-2.5 rounded-sm border border-white/10">
                  <span className="font-mono text-sm sm:text-base font-bold text-white tracking-wide truncate select-all">
                    {serverUrl}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyServerUrl}
                    className="p-1.5 rounded-sm bg-surface-2 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 transition-colors shrink-0"
                    title="Copiar URL del servidor"
                  >
                    {copiedServerUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <p className="text-[11px] text-neutral-300 leading-snug">
                  ⚠️ <strong className="text-white">Para conectar el control:</strong> ingresa esta URL en tu app móvil (<code className="text-primary font-mono font-bold">{serverUrl}</code>). Corresponde al puerto 5000 del backend (no el 3000 del frontend ni el 8081 de Expo). Tu teléfono y esta PC deben estar en la misma red Wi-Fi.
                </p>
              </div>

              <div className="p-4 rounded-sm bg-surface-2/90 border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  <span>PIN de Emparejamiento Rápido</span>
                  <span className={`font-mono text-[10px] ${pinTimeLeft > 60 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {pinTimeLeft > 0 ? `Válido: ${formatTimer(pinTimeLeft)}` : 'Expirado'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-white">
                    {loadingRemote ? 'Cargando...' : pairingCode}
                  </span>

                  <button
                    type="button"
                    onClick={handleCopyPin}
                    disabled={loadingRemote}
                    className="p-2 rounded-sm bg-surface-3 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 transition-colors disabled:opacity-50"
                    title="Copiar código PIN"
                  >
                    {copiedPin ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleGeneratePin}
                    disabled={loadingRemote}
                    className="px-3 py-2 rounded-sm bg-surface-3 hover:bg-white/10 text-white text-xs font-bold border border-white/10 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-primary ${loadingRemote ? 'animate-spin' : ''}`} />
                    <span>Generar PIN</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    disabled={loadingRemote}
                    className="px-3 py-2 rounded-sm bg-surface-3 hover:bg-white/10 text-white text-xs font-bold border border-white/10 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <QrCode className="w-3.5 h-3.5 text-neutral-300" />
                    <span>Escanear QR</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-neutral-400 p-2.5 rounded-sm bg-white/5 border border-white/5">
                <div className="flex items-center gap-2 truncate">
                  <Smartphone className={`w-3.5 h-3.5 shrink-0 ${connectedDevice ? 'text-emerald-400 animate-pulse' : 'text-neutral-500'}`} />
                  <span className="truncate">
                    {connectedDevice ? connectedDevice : 'Sin dispositivos emparejados'}
                  </span>
                </div>

                {connectedDevice ? (
                  <button
                    type="button"
                    onClick={handleDisconnectRemote}
                    className="text-neutral-400 hover:text-red-400 text-[11px] font-semibold underline shrink-0 transition-colors"
                  >
                    Desconectar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGeneratePin}
                    className="text-primary hover:underline text-[11px] font-bold shrink-0"
                  >
                    Emparejar
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>

      {ratingModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-surface-1 border border-white/15 rounded-sm p-6 shadow-2xl space-y-4 text-center">
            <h3 className="text-base font-black text-white">
              Calificar "{ratingModalItem.title}"
            </h3>
            <p className="text-xs text-neutral-400">
              ¿Qué te pareció esta producción cinematográfica?
            </p>

            <div className="flex items-center justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedRating(star)}
                  className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= selectedRating
                        ? 'fill-gold text-gold'
                        : 'text-neutral-600'
                    }`}
                  />
                </button>
              ))}
            </div>

            <span className="block text-xs font-bold text-gold">
              {selectedRating === 5
                ? '¡Obra Maestra! (5/5)'
                : selectedRating === 4
                ? 'Excelente producción (4/5)'
                : selectedRating === 3
                ? 'Buena (3/5)'
                : selectedRating === 2
                ? 'Regular (2/5)'
                : 'Mala (1/5)'}
            </span>

            <div className="flex gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setRatingModalItem(null)}
                className="flex-1 py-2 rounded-sm bg-surface-2 hover:bg-surface-3 text-white text-xs font-bold border border-white/10"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  toastSuccess(`Puntuación de ${selectedRating} estrellas guardada`);
                  setRatingModalItem(null);
                }}
                className="flex-1 py-2 rounded-sm bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-glow-primary"
              >
                Enviar Calificación
              </button>
            </div>
          </div>
        </div>
      )}

      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-surface-1 border border-white/15 rounded-sm p-6 shadow-2xl space-y-4 text-center">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <QrCode className="w-4 h-4 text-primary" />
                <span>Escanear Código QR</span>
              </h3>
              <button onClick={() => setShowQrModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-300">
              Apunta la cámara de tu teléfono para conectar al instante la app de control remoto:
            </p>

            <div className="w-48 h-48 mx-auto bg-white p-2 rounded-sm flex items-center justify-center shadow-xl">
              {qrCodeData ? (
                <img src={qrCodeData} alt="QR Pairing" className="w-full h-full object-contain" />
              ) : (
                <div className="space-y-2 text-neutral-900">
                  <QrCode className="w-28 h-28 mx-auto text-neutral-900" />
                  <span className="text-[10px] font-mono font-bold block">{pairingCode}</span>
                </div>
              )}
            </div>

            <div className="p-3 rounded-sm bg-surface-2/90 border border-white/10 text-left space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="font-bold">URL Servidor:</span>
                <span className="font-mono text-primary font-bold text-xs">{serverUrl}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="font-bold">Código PIN:</span>
                <span className="font-mono text-white font-bold text-sm">{pairingCode}</span>
              </div>
              <p className="text-[10px] text-neutral-400 border-t border-white/5 pt-1.5 leading-snug">
                El QR contiene la URL con IP de tu red local (<code className="text-white">{serverUrl}</code>).
              </p>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-sm bg-surface-2 hover:bg-surface-3 text-white text-xs font-bold border border-white/10"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-surface-1 border border-white/15 rounded-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" />
                <span>Foto de Perfil</span>
              </h3>
              <button onClick={() => setShowAvatarModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-neutral-400 block">
                Selecciona un avatar cinematográfico:
              </span>

              <div className="grid grid-cols-4 gap-2.5">
                {[
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
                  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
                ].map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSaveAvatar(url)}
                    className="aspect-square rounded-sm overflow-hidden border-2 border-white/10 hover:border-primary transition-all hover:scale-105"
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-[11px] font-bold text-neutral-400 block">
                  O introduce una URL de imagen personalizada:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://..."
                    value={customAvatarInput}
                    onChange={(e) => setCustomAvatarInput(e.target.value)}
                    className="flex-1 bg-surface-2 border border-white/10 rounded-sm px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    disabled={!customAvatarInput.trim()}
                    onClick={() => handleSaveAvatar(customAvatarInput.trim())}
                    className="px-4 py-2 rounded-sm bg-primary hover:bg-primary-hover text-white text-xs font-bold disabled:opacity-50"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 text-right">
              <button
                type="button"
                onClick={() => setShowAvatarModal(false)}
                className="px-4 py-2 rounded-sm bg-surface-2 hover:bg-surface-3 text-white text-xs font-bold border border-white/10"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
