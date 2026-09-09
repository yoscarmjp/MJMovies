import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { Search, Users as UsersIcon } from 'lucide-react';

export default function UsersView() {
  const { user: currentUser } = useAuthStore();
  const { success: toastSuccess, error: toastError } = useToastStore();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users?limit=100');
      setUsers(data.users || []);
      setTotal(data.pagination?.total || 0);
    } catch {
      toastError('Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    const s = search.toLowerCase();
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(s) || u.email.toLowerCase().includes(s)
    );
  }, [users, search]);

  const toggleRole = async (targetUser) => {
    const newRole = targetUser.role === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
      await api.put(`/admin/users/${targetUser.id}/role`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
      );
      toastSuccess(`Rol de ${targetUser.username} cambiado a ${newRole}`);
    } catch (e) {
      toastError(e.response?.data?.error || 'Error cambiando rol');
    }
  };

  const toggleStatus = async (targetUser) => {
    try {
      await api.put(`/admin/users/${targetUser.id}/status`);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUser.id ? { ...u, isActive: !u.isActive } : u
        )
      );
      toastSuccess(
        `${targetUser.username} ${targetUser.isActive ? 'desactivado' : 'activado'}`
      );
    } catch (e) {
      toastError(e.response?.data?.error || 'Error cambiando estado');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Nunca';
    return new Date(dateStr).toLocaleDateString('es', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white">Gestión de Usuarios</h1>
        <p className="text-gray-400 text-sm mt-1">{total} usuarios registrados en MJMovies</p>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por usuario o email..."
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-1 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="rounded-2xl bg-surface-1/80 border border-white/10 backdrop-blur-md overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            <UsersIcon size={40} className="mx-auto text-gray-600 mb-2" />
            No se encontraron usuarios
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-gray-400 bg-surface-2/40 border-b border-white/10">
                <tr>
                  <th className="py-3 px-4 font-semibold">Usuario</th>
                  <th className="py-3 px-4 font-semibold">Email</th>
                  <th className="py-3 px-4 font-semibold">Rol</th>
                  <th className="py-3 px-4 font-semibold">Estado</th>
                  <th className="py-3 px-4 font-semibold">Último acceso</th>
                  <th className="py-3 px-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((item) => {
                  const isSelf = item.id === currentUser?.id;
                  const initial = item.username?.[0]?.toUpperCase() || 'U';

                  return (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-rose-600 flex items-center justify-center font-bold text-xs text-white shrink-0">
                            {initial}
                          </div>
                          <div>
                            <span className="font-bold text-white">{item.username}</span>
                            {isSelf && (
                              <span className="ml-2 text-[10px] font-semibold text-primary uppercase">
                                (Tú)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-gray-400 text-xs">{item.email}</td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            item.role === 'ADMIN'
                              ? 'bg-primary/20 text-primary border-primary/30'
                              : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                          }`}
                        >
                          {item.role}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            item.isActive
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border-red-500/30'
                          }`}
                        >
                          {item.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-xs text-gray-400">{formatDate(item.lastLoginAt)}</td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleRole(item)}
                            disabled={isSelf}
                            className="px-3 py-1 rounded-lg bg-surface-2 hover:bg-surface-3 text-xs font-semibold text-gray-300 hover:text-white border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          >
                            {item.role === 'ADMIN' ? '→ User' : '→ Admin'}
                          </button>
                          <button
                            onClick={() => toggleStatus(item)}
                            disabled={isSelf}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                              item.isActive
                                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                            }`}
                          >
                            {item.isActive ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
