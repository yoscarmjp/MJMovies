import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  const { success: toastSuccess } = useToastStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [globalError, setGlobalError] = useState('');

  const validateEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setErrors((prev) => ({ ...prev, email: 'El email es requerido' }));
      return false;
    } else if (!emailRegex.test(email)) {
      setErrors((prev) => ({ ...prev, email: 'Email inválido' }));
      return false;
    } else {
      setErrors((prev) => ({ ...prev, email: '' }));
      return true;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setGlobalError('');

    const emailValid = validateEmail();
    let passValid = true;
    if (!password) {
      setErrors((prev) => ({ ...prev, password: 'La contraseña es requerida' }));
      passValid = false;
    } else {
      setErrors((prev) => ({ ...prev, password: '' }));
    }

    if (!emailValid || !passValid) return;

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      toastSuccess(`¡Bienvenido ${result.user.username}!`);
      const params = new URLSearchParams(location.search);
      const redirect = params.get('redirect') || (result.user.role === 'ADMIN' ? '/admin' : '/');
      navigate(redirect);
    } else {
      setGlobalError('Credenciales incorrectas. Verifica tu email y contraseña.');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(229,9,20,0.12)_0%,transparent_50%),radial-gradient(ellipse_at_80%_20%,rgba(229,9,20,0.08)_0%,transparent_40%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="p-8 sm:p-10 rounded-2xl bg-surface-1/90 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/80">
          <Link to="/" className="block text-3xl font-black text-primary tracking-tighter text-center mb-6 drop-shadow-[0_0_20px_rgba(229,9,20,0.5)]">
            MJ<span className="text-white opacity-90">Movies</span>
          </Link>

          <h1 className="text-2xl font-bold text-center text-white mb-1">Iniciar Sesión</h1>
          <p className="text-sm text-gray-400 text-center mb-8">Bienvenido de nuevo a tu cine digital</p>

          <form onSubmit={handleLogin} noValidate className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2" htmlFor="login-email">
                Correo electrónico
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={validateEmail}
                placeholder="tu@email.com"
                autoComplete="email"
                required
                className={`w-full px-4 py-3 rounded-lg bg-surface-2 border text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-colors ${
                  errors.email ? 'border-primary focus:ring-primary/40' : 'border-white/10 focus:border-primary focus:ring-primary/20'
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-primary">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2" htmlFor="login-password">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  autoComplete="current-password"
                  required
                  className={`w-full px-4 py-3 pr-11 rounded-lg bg-surface-2 border text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-colors ${
                    errors.password ? 'border-primary focus:ring-primary/40' : 'border-white/10 focus:border-primary focus:ring-primary/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-primary">{errors.password}</p>
              )}
            </div>

            {globalError && (
              <div className="flex items-center gap-2 p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                <AlertCircle size={18} className="shrink-0" />
                <span>{globalError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold tracking-wide transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-400">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-primary hover:text-primary-hover font-semibold transition-colors">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
