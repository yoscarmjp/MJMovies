import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundView() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 text-center">
      <div className="max-w-md">
        <h1 className="text-8xl font-black tracking-tighter bg-gradient-to-r from-primary via-rose-500 to-amber-500 bg-clip-text text-transparent leading-none mb-4 drop-shadow-[0_0_40px_rgba(229,9,20,0.4)]">
          404
        </h1>
        <h2 className="text-2xl font-bold text-white mb-2">Página no encontrada</h2>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
          Lo sentimos, la página que buscas no existe o fue movida a otra dimensión cinematográfica.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm transition-all shadow-lg shadow-primary/25"
          >
            <Home size={16} /> Ir al inicio
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-2 hover:bg-surface-3 text-gray-300 hover:text-white font-semibold text-sm border border-white/10 transition-all"
          >
            <ArrowLeft size={16} /> Volver
          </button>
        </div>
      </div>
    </div>
  );
}
