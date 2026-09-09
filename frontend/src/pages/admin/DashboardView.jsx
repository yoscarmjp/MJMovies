import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Film, CheckCircle2, Users, Play, ArrowRight, UploadCloud, Cpu } from 'lucide-react';

export default function DashboardView() {
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({});
  const [recentJobs, setRecentJobs] = useState([]);

  const processingCount = statsData?.movies?.processing || 0;

  const stats = [
    {
      icon: Film,
      label: 'Total Películas',
      value: statsData?.movies?.total ?? '–',
      color: 'bg-red-500/10 text-red-500 border-red-500/20',
    },
    {
      icon: CheckCircle2,
      label: 'Listas para ver',
      value: statsData?.movies?.ready ?? '–',
      color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    },
    {
      icon: Users,
      label: 'Usuarios',
      value: statsData?.users?.total ?? '–',
      color: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
    },
    {
      icon: Play,
      label: 'Reproducciones',
      value: statsData?.views?.total?.toLocaleString() ?? '–',
      color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    },
  ];

  const jobStatusBadge = (status) => {
    switch (status) {
      case 'DONE':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      case 'PROCESSING':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse';
      case 'FAILED':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '–';
    return new Date(dateStr).toLocaleString('es', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, jobsRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/jobs'),
        ]);
        setStatsData(statsRes.data);
        setRecentJobs(jobsRes.data.jobs || []);
      } catch (err) {
        console.error('Error fetching admin dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">
          Bienvenido al centro de control y monitoreo de MJMovies
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="p-6 rounded-2xl bg-surface-1/80 border border-white/10 backdrop-blur-md flex items-center gap-4 hover:border-white/20 transition-all shadow-lg"
            >
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center border shrink-0 ${stat.color}`}>
                <Icon size={26} />
              </div>
              <div>
                <p className="text-2xl font-black text-white leading-tight">
                  {loading ? (
                    <span className="inline-block w-16 h-7 bg-surface-3 animate-pulse rounded" />
                  ) : (
                    stat.value
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-1 uppercase font-semibold tracking-wider">
                  {stat.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Processing Alert */}
      {processingCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-amber-300 text-sm">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
            <span>
              <strong>{processingCount}</strong> película(s) se están transcodificando en segundo plano.
            </span>
          </div>
          <Link
            to="/admin/jobs"
            className="flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            Ver jobs <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <div className="p-6 rounded-2xl bg-surface-1/60 border border-white/10 backdrop-blur-md">
        <h2 className="text-base font-bold text-white mb-4 uppercase tracking-wider text-xs text-gray-400">
          Acciones Rápidas
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/admin/upload"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm transition-all shadow-md shadow-primary/20"
          >
            <UploadCloud size={16} /> Subir Película
          </Link>
          <Link
            to="/admin/movies"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-white font-semibold text-sm border border-white/10 transition-all"
          >
            <Film size={16} /> Ver Catálogo
          </Link>
          <Link
            to="/admin/users"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-white font-semibold text-sm border border-white/10 transition-all"
          >
            <Users size={16} /> Gestionar Usuarios
          </Link>
          <Link
            to="/admin/jobs"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-white font-semibold text-sm border border-white/10 transition-all"
          >
            <Cpu size={16} /> Ver Jobs de Transcodificación
          </Link>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="p-6 rounded-2xl bg-surface-1/60 border border-white/10 backdrop-blur-md">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Trabajos Recientes</h2>
          <Link to="/admin/jobs" className="text-xs text-primary font-semibold hover:underline">
            Ver todos los jobs →
          </Link>
        </div>

        <div className="overflow-x-auto">
          {recentJobs.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">Sin jobs recientes</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-gray-400 border-b border-white/10">
                <tr>
                  <th className="pb-3 font-semibold">Película</th>
                  <th className="pb-3 font-semibold">Estado</th>
                  <th className="pb-3 font-semibold">Progreso</th>
                  <th className="pb-3 font-semibold">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentJobs.slice(0, 8).map((job) => (
                  <tr key={job.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 font-medium text-white">{job.movie?.title || 'Sin nombre'}</td>
                    <td className="py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${jobStatusBadge(job.status)}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 rounded-full bg-surface-3 overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 font-mono">{job.progress}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-xs text-gray-400">{formatDate(job.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
