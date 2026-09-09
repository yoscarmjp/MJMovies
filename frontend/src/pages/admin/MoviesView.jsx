import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useToastStore } from '../../stores/toastStore';
import { Search, Plus, RotateCw, ExternalLink, Trash2, Film, AlertTriangle } from 'lucide-react';

export default function MoviesView() {
  const { success: toastSuccess, error: toastError } = useToastStore();

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const totalPages = Math.ceil(total / limit) || 1;

  const fetchMovies = useCallback(async (reset = false) => {
    const currentPage = reset ? 1 : page;
    if (reset) setPage(1);

    setLoading(true);
    try {
      const params = new URLSearchParams({ page: currentPage, limit });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const { data } = await api.get(`/admin/movies?${params}`);
      setMovies(data.movies || []);
      setTotal(data.pagination?.total || 0);
    } catch {
      toastError('Error cargando películas');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, toastError]);

  useEffect(() => {
    fetchMovies();
  }, [page, statusFilter]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMovies(true);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const statusBadge = (s) => {
    switch (s) {
      case 'READY':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'PROCESSING':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse';
      case 'ERROR':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const statusLabel = (s) => {
    switch (s) {
      case 'READY':
        return 'Lista';
      case 'PROCESSING':
        return 'Procesando';
      case 'PENDING':
        return 'Pendiente';
      case 'ERROR':
        return 'Error';
      default:
        return s;
    }
  };

  const formatDate = (d) => {
    if (!d) return '–';
    return new Date(d).toLocaleDateString('es', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/movies/${deleteTarget.id}`);
      toastSuccess(`"${deleteTarget.title}" eliminada`);
      setMovies((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setTotal((prev) => prev - 1);
      setDeleteTarget(null);
    } catch (e) {
      toastError(e.response?.data?.error || 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  const retranscode = async (movie) => {
    try {
      const { data } = await api.post(`/admin/movies/${movie.id}/retranscode`);
      toastSuccess(data.message || 'Transcodificación reencolada');
      fetchMovies();
    } catch (e) {
      toastError(e.response?.data?.error || 'No se pudo reencolar la transcodificación');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Películas</h1>
          <p className="text-gray-400 text-sm mt-1">{total} películas en la biblioteca</p>
        </div>
        <Link
          to="/admin/upload"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm transition-all shadow-lg shadow-primary/20 w-fit"
        >
          <Plus size={18} /> Nueva Película
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-1 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 rounded-xl bg-surface-1 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
        >
          <option value="">Todos los estados</option>
          <option value="READY">Listas</option>
          <option value="PROCESSING">Procesando</option>
          <option value="PENDING">Pendientes</option>
          <option value="ERROR">Con error</option>
        </select>
      </div>

      <div className="rounded-2xl bg-surface-1/80 border border-white/10 backdrop-blur-md overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : movies.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            <Film size={40} className="mx-auto text-gray-600 mb-2" />
            No se encontraron películas
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-gray-400 bg-surface-2/40 border-b border-white/10">
                <tr>
                  <th className="py-3 px-4 font-semibold">Película</th>
                  <th className="py-3 px-4 font-semibold">Estado</th>
                  <th className="py-3 px-4 font-semibold">Géneros</th>
                  <th className="py-3 px-4 font-semibold">Año</th>
                  <th className="py-3 px-4 font-semibold">Vistas</th>
                  <th className="py-3 px-4 font-semibold">Agregada</th>
                  <th className="py-3 px-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {movies.map((movie) => (
                  <tr key={movie.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {movie.posterUrl ? (
                          <img
                            src={movie.posterUrl}
                            alt={movie.title}
                            className="w-9 h-13 object-cover rounded shadow-md shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-13 bg-surface-3 rounded flex items-center justify-center text-gray-500 text-xs shrink-0">
                            🎬
                          </div>
                        )}
                        <div className="min-w-0 max-w-[200px]">
                          <p className="font-bold text-white truncate">{movie.title}</p>
                          <p className="text-xs text-gray-400 truncate">{movie.director || '–'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusBadge(movie.status)}`}>
                        {statusLabel(movie.status)}
                      </span>
                      {movie.latestJob?.status === 'PROCESSING' && (
                        <p className="text-[11px] text-gray-400 mt-1">
                          {movie.latestJob?.progress}% completado
                        </p>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex gap-1 flex-wrap">
                        {(movie.genres || []).slice(0, 2).map((g) => (
                          <span
                            key={g.name}
                            className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] text-gray-300"
                          >
                            {g.name}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-gray-300">{movie.year || '–'}</td>

                    <td className="py-3 px-4 text-gray-300">{movie.views?.toLocaleString() || 0}</td>

                    <td className="py-3 px-4 text-gray-400 text-xs">{formatDate(movie.createdAt)}</td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {(movie.status === 'ERROR' || movie.status === 'PENDING') && (
                          <button
                            onClick={() => retranscode(movie)}
                            title="Reintentar transcodificación"
                            className="p-1.5 text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                          >
                            <RotateCw size={15} />
                          </button>
                        )}
                        <Link
                          to={`/movie/${movie.id}`}
                          target="_blank"
                          title="Ver detalles"
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <ExternalLink size={15} />
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(movie)}
                          title="Eliminar"
                          className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl bg-surface-1 border border-white/10 text-sm font-semibold text-gray-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            ← Anterior
          </button>
          <span className="text-sm text-gray-400">
            Página <strong className="text-white">{page}</strong> de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-xl bg-surface-1 border border-white/10 text-sm font-semibold text-gray-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Siguiente →
          </button>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl bg-surface-1 border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle size={24} />
              <h2 className="text-xl font-bold text-white">¿Eliminar película?</h2>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">
              Esta acción eliminará permanentemente <strong>{deleteTarget.title}</strong> y todos sus archivos de video transcodificados. Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-sm font-semibold text-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={doDelete}
                disabled={deleting}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-semibold text-white shadow-lg shadow-red-600/30 transition-all disabled:opacity-50"
              >
                {deleting ? 'Eliminando...' : 'Eliminar película'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
