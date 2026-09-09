import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../../services/api';
import { RotateCw, Cpu, AlertTriangle } from 'lucide-react';

export default function JobsView() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);

  const fetchJobs = async () => {
    try {
      const { data } = await api.get('/admin/jobs');
      setJobs(data.jobs || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();

    const token = localStorage.getItem('accessToken');
    const socket = io(window.location.origin, {
      path: '/socket.io',
      query: { role: 'admin' },
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('join:admin');
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('transcode:progress', ({ movieId, jobId, progress }) => {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId ? { ...j, progress, status: 'PROCESSING' } : j
        )
      );
    });

    socket.on('transcode:done', ({ movieId, jobId }) => {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? { ...j, status: 'DONE', progress: 100, completedAt: new Date().toISOString() }
            : j
        )
      );
      fetchJobs();
    });

    socket.on('transcode:error', ({ movieId, jobId, error }) => {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? { ...j, status: 'FAILED', errorMsg: error, completedAt: new Date().toISOString() }
            : j
        )
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const statusBadge = (status) => {
    switch (status) {
      case 'DONE':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'PROCESSING':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse';
      case 'FAILED':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const statusLabel = (status) => {
    switch (status) {
      case 'QUEUED':
        return 'En cola';
      case 'PROCESSING':
        return 'Procesando';
      case 'DONE':
        return 'Completado';
      case 'FAILED':
        return 'Fallido';
      default:
        return status;
    }
  };

  const formatDate = (d) => {
    if (!d) return '–';
    return new Date(d).toLocaleString('es', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Jobs de Transcodificación
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Monitorea el procesamiento y generación de calidades adaptativas HLS
          </p>
        </div>

        <div className="flex items-center gap-3">
          {socketConnected && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>En tiempo real</span>
            </div>
          )}
          <button
            onClick={fetchJobs}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-1 hover:bg-surface-2 border border-white/10 text-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <RotateCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-surface-1/80 border border-white/10 backdrop-blur-md overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            <Cpu size={40} className="mx-auto text-gray-600 mb-2" />
            No hay jobs registrados aún
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-gray-400 bg-surface-2/40 border-b border-white/10">
                <tr>
                  <th className="py-3 px-4 font-semibold">Película</th>
                  <th className="py-3 px-4 font-semibold">Estado</th>
                  <th className="py-3 px-4 font-semibold">Progreso</th>
                  <th className="py-3 px-4 font-semibold">Calidades</th>
                  <th className="py-3 px-4 font-semibold">Creado</th>
                  <th className="py-3 px-4 font-semibold">Completado</th>
                  <th className="py-3 px-4 font-semibold">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    className={`hover:bg-white/5 transition-colors ${
                      job.status === 'PROCESSING' ? 'bg-amber-500/[0.03]' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-bold text-white">
                      {job.movie?.title || '–'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusBadge(
                          job.status
                        )}`}
                      >
                        {statusLabel(job.status)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3 min-w-[150px]">
                        <div className="w-24 h-2 rounded-full bg-surface-3 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              job.status === 'PROCESSING'
                                ? 'bg-gradient-to-r from-amber-500 to-rose-500 animate-pulse'
                                : 'bg-primary'
                            }`}
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 font-mono font-bold">
                          {job.progress}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {job.quality ? (
                        <div className="flex gap-1 flex-wrap">
                          {job.quality.split(',').map((q) => (
                            <span
                              key={q}
                              className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-gray-300"
                            >
                              {q}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs">–</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-400">
                      {formatDate(job.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-400">
                      {formatDate(job.completedAt)}
                    </td>
                    <td className="py-3.5 px-4">
                      {job.errorMsg ? (
                        <span
                          className="text-xs text-red-400 font-mono truncate flex items-center gap-1.5 max-w-[200px]"
                          title={job.errorMsg}
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          <span className="truncate">{job.errorMsg}</span>
                        </span>
                      ) : (
                        <span className="text-gray-600 text-xs">–</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
