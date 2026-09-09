import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import {
  LayoutDashboard,
  Film,
  UploadCloud,
  Users,
  Cpu,
  LogOut,
} from 'lucide-react';

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const userInitial = user?.username?.[0]?.toUpperCase() || 'A';

  const navItems = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/movies', icon: Film, label: 'Películas' },
    { path: '/admin/upload', icon: UploadCloud, label: 'Subir Película' },
    { path: '/admin/users', icon: Users, label: 'Usuarios' },
    { path: '/admin/jobs', icon: Cpu, label: 'Transcodificación' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-surface-1/90 backdrop-blur-xl flex flex-col shrink-0 fixed inset-y-0 left-0 z-30">
        {/* Brand */}
        <div className="p-6 border-b border-white/10">
          <Link to="/" className="flex items-center justify-between text-2xl font-black text-primary tracking-tighter">
            <span>
              MJ<span className="text-white opacity-90">Movies</span>
            </span>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-primary text-white tracking-wider">
              Admin
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-lg shadow-primary/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Icon size={18} className="shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-white/10 bg-surface-2/40 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-rose-600 flex items-center justify-center font-bold text-sm text-white shrink-0">
              {userInitial}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{user?.username || 'Admin'}</p>
              <p className="text-xs text-gray-400 truncate">Administrador</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 p-8 sm:p-10 min-w-0">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
