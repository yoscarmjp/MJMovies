import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

export default function RegisterView() {
  const { register } = useAuthStore();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', username: '', password: '' });
  const [serverErrors, setServerErrors] = useState([]);
  const [globalError, setGlobalError] = useState('');
  const [success, setSuccess] = useState(false);

  // Strength score
  const strengthScore = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }, [password]);

  const strengthPercent = (strengthScore / 6) * 100;
  const strengthColor =
    strengthScore <= 2
      ? 'bg-red-500 text-red-400'
      : strengthScore <= 4
      ? 'bg-yellow-500 text-yellow-400'
      : 'bg-emerald-500 text-emerald-400';
  const strengthLabel = !password
    ? ''
    : strengthScore <= 2
    ? 'Débil'
    : strengthScore <= 4
    ? 'Media'
    : 'Fuerte';

  const validate = () => {
    let valid = true;
    const newErrors = { email: '', username: '', password: '' };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !emailRegex.test(email)) {
      newErrors.email = 'Email válido requerido';
      valid = false;
    }

    if (!username || username.length < 3) {
      newErrors.username = 'Mínimo 3 caracteres';
      valid = false;
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      newErrors.username = 'Solo letras, números, guion y guion bajo';
      valid = false;
    }

    if (!password || password.length < 8) {
      newErrors.password = 'Mínimo 8 caracteres';
      valid = false;
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = 'Incluye mayúscula, minúscula y número';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setGlobalError('');
    setServerErrors([]);

    if (!validate()) return;

    setLoading(true);
    const result = await register(email, username, password);
    setLoading(false);

    if (result.success) {
      setSuccess(true);
    } else if (result.errors) {
      setServerErrors(result.errors);
    } else {
      setGlobalError(result.error || 'Error al crear la cuenta. Intenta más tarde.');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(229,9,20,0.12)_0%,transparent_50%),radial-gradient(ellipse_at_20%_20%,rgba(229,9,20,0.08)_0%,transparent_40%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="p-8 sm:p-10 rounded-2xl bg-surface-1/90 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/80">
          <Link to="/" className="block text-3xl font-black text-primary tracking-tighter text-center mb-6 drop-shadow-[0_0_20px_rgba(229,9,20,0.5)]">
            MJ<span className="text-white opacity-90">Movies</span>
          </Link>

          <h1 className="text-2xl font-bold text-center text-white mb-1">Crear Cuenta</h1>
          <p className="text-sm text-gray-400 text-center mb-8">Únete a MJMovies gratis</p>

          <form onSubmit={handleRegister} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2" htmlFor="reg-email">
                Correo electrónico
              </label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
                required
                className={`w-full px-4 py-3 rounded-lg bg-surface-2 border text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-colors ${
                  errors.email ? 'border-primary focus:ring-primary/40' : 'border-white/10 focus:border-primary focus:ring-primary/20'
                }`}
              />
              {errors.email && <p className="mt-1 text-xs text-primary">{errors.email}</p>}
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2" htmlFor="reg-username">
                Nombre de usuario
              </label>
              <input
                id="reg-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="tu_nombre"
                autoComplete="username"
                required
                className={`w-full px-4 py-3 rounded-lg bg-surface-2 border text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-colors ${
                  errors.username ? 'border-primary focus:ring-primary/40' : 'border-white/10 focus:border-primary focus:ring-primary/20'
                }`}
              />
              {errors.username && <p className="mt-1 text-xs text-primary">{errors.username}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2" htmlFor="reg-password">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mín. 8 caracteres"
                  autoComplete="new-password"
                  required
                  className={`w-full px-4 py-3 pr-11 rounded-lg bg-surface-2 border text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-colors ${
                    errors.password ? 'border-primary focus:ring-primary/40' : 'border-white/10 focus:border-primary focus:ring-primary/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                  aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Password strength */}
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="h-1 w-full bg-surface-3 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strengthColor.split(' ')[0]}`}
                      style={{ width: `${strengthPercent}%` }}
                    />
                  </div>
                  <p className={`text-xs font-medium ${strengthColor.split(' ')[1]}`}>
                    Fortaleza: {strengthLabel}
                  </p>
                </div>
              )}
              {errors.password && <p className="mt-1 text-xs text-primary">{errors.password}</p>}
            </div>

            {/* Server validation errors */}
            {serverErrors.length > 0 && (
              <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                <ul className="list-disc list-inside space-y-1">
                  {serverErrors.map((err, i) => (
                    <li key={i}>{err.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Global error */}
            {globalError && (
              <div className="flex items-center gap-2 p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                <AlertCircle size={18} className="shrink-0" />
                <span>{globalError}</span>
              </div>
            )}

            {/* Success message */}
            {success && (
              <div className="flex items-center gap-2 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
                <CheckCircle size={18} className="shrink-0" />
                <span>
                  Cuenta creada exitosamente.{' '}
                  <Link to="/login" className="underline font-bold text-white hover:text-primary">
                    Inicia sesión aquí
                  </Link>
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-3.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold tracking-wide transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Crear Cuenta'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-400">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primary hover:text-primary-hover font-semibold transition-colors">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
