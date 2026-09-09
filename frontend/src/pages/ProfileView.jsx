import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import api from '../services/api';
import { Clock, Shield, RotateCw, Play, Film, Smartphone } from 'lucide-react';

export default function ProfileView() {
  const { user } = useAuthStore();
  const { success: toastSuccess, error: toastError } = useToastStore();

  const userInitial = user?.username?.[0]?.toUpperCase() || '?';

  // History state
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data } = await api.get('/movies/user/history');
      setHistory(data.history || []);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getProgressPercent = (item) => {
    if (!item.duration || item.duration === 0) return 0;
    return Math.min(100, Math.round((item.position / item.duration) * 100));
  };

  const formatLastWatched = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return `Visto el ${date.toLocaleDateString('es', { day: '2-digit', month: 'short' })}`;
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toastError('Las nuevas contraseñas no coinciden');
      return;
    }

    if (newPassword.length < 8) {
      toastError('La nueva contraseña debe tener al menos 8 caracteres');
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
      toastError(err.response?.data?.error || 'Error al actualizar la contraseña');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-white pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-center gap-6 p-8 rounded-2xl bg-surface-1/80 backdrop-blur-xl border border-white/10 shadow-xl mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-rose-600 flex items-center justify-center text-4xl font-black text-white shadow-xl shadow-primary/30 shrink-0">
            {userInitial}
          </div>
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-3xl font-black tracking-tight">{user?.username}</h1>
            <p className="text-gray-400 mt-0.5">{user?.email}</p>
            <div className="flex items-center justify-center sm:justify-start gap-3 mt-3">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">
                {user?.role || 'USER'}
              </span>
              <span className="text-xs text-gray-400">Miembro de MJMovies</span>
            </div>
          </div>
        </div>

        {/* Profile Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* History Section (Left 7 cols) */}
          <section className="lg:col-span-7 p-6 sm:p-8 rounded-2xl bg-surface-1/60 border border-white/10 backdrop-blur-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Clock size={20} className="text-primary" /> Continuar Viendo / Historial
              </h2>
              {history.length > 0 && (
                <button
                  onClick={fetchHistory}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <RotateCw size={14} /> Actualizar
                </button>
              )}
            </div>

            {loadingHistory ? (
              <div className="py-16 flex justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="py-16 text-center">
                <Film size={44} className="mx-auto text-gray-600 mb-3" />
                <p className="text-gray-400 font-medium">Aún no has reproducido ningún título.</p>
                <Link
                  to="/catalog"
                  className="inline-block mt-4 px-5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors"
                >
                  Explorar catálogo
                </Link>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-3 rounded-xl bg-surface-2/60 border border-white/5 hover:border-white/10 hover:bg-surface-2 transition-all"
                  >
                    <div className="relative w-16 h-22 rounded-lg overflow-hidden bg-surface-3 shrink-0 shadow-md">
                      {item.movie?.posterUrl ? (
                        <img
                          src={item.movie.posterUrl}
                          alt={item.movie.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl text-gray-600">
                          🎬
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-black/60">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${getProgressPercent(item)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold truncate text-white">{item.movie?.title}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatLastWatched(item.updatedAt || item.createdAt)}
                      </p>
                      <div className="mt-3">
                        <Link
                          to={`/watch/${item.movieId || item.movie?.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded bg-primary/20 hover:bg-primary text-primary hover:text-white text-xs font-semibold transition-colors"
                        >
                          <Play size={12} fill="currentColor" /> Continuar
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Security & Password Section (Right 5 cols) */}
          <section className="lg:col-span-5 p-6 sm:p-8 rounded-2xl bg-surface-1/60 border border-white/10 backdrop-blur-lg flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
                <Shield size={20} className="text-primary" /> Seguridad de la Cuenta
              </h2>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2" htmlFor="current-pw">
                    Contraseña actual
                  </label>
                  <input
                    id="current-pw"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-lg bg-surface-2 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2" htmlFor="new-pw">
                    Nueva contraseña
                  </label>
                  <input
                    id="new-pw"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres"
                    className="w-full px-4 py-2.5 rounded-lg bg-surface-2 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2" htmlFor="confirm-pw">
                    Confirmar nueva contraseña
                  </label>
                  <input
                    id="confirm-pw"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Repite la nueva contraseña"
                    className="w-full px-4 py-2.5 rounded-lg bg-surface-2 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingPassword}
                  className="w-full py-3 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-bold tracking-wide transition-all shadow-md shadow-primary/20 disabled:opacity-50 mt-2"
                >
                  {savingPassword ? 'Actualizando...' : 'Guardar nueva contraseña'}
                </button>
              </form>
            </div>

            {/* Remote hint */}
            <div className="mt-8 p-4 rounded-xl bg-primary/10 border border-primary/20 flex gap-3 items-start">
              <Smartphone size={20} className="text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Control Remoto Digital</h4>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                  Recuerda que puedes controlar la reproducción desde tu teléfono abriendo la app MJMovies Remote e ingresando el PIN mostrado en la pantalla de reproducción.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
