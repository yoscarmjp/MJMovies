import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import Logo from "../assets/img/mjmovies.webp"
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Film,
  Volume2,
  ExternalLink,
} from 'lucide-react';

export default function LoginView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  const { success: toastSuccess } = useToastStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [globalError, setGlobalError] = useState('');

  const validateEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setErrors((prev) => ({ ...prev, email: 'El correo electrónico es requerido' }));
      return false;
    } else if (!emailRegex.test(email)) {
      setErrors((prev) => ({ ...prev, email: 'Formato de correo no válido' }));
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
      let redirect = params.get('redirect');
      if (!redirect || redirect.includes('any-movie-id') || redirect === '/login') {
        redirect = result.user.role === 'ADMIN' ? '/admin' : '/';
      }
      navigate(redirect, { replace: true });
    } else {
      setGlobalError(result.error || 'Credenciales incorrectas. Verifica tu email y contraseña.');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-[#07070a] px-4 py-8 overflow-hidden select-none">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#e50914]/15 rounded-full blur-[140px] opacity-75" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#07070a_85%)]" />
      </div>

      <div className="relative z-10 w-full max-w-[440px]">
        <div className="rounded-3xl bg-[#0c0c12]/90 border border-white/10 p-7 sm:p-9 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] backdrop-blur-2xl">
          
          <div className="text-center mb-3">
            <Link to="/" className="inline-flex items-center gap-1 group transition-transform hover:scale-105">
              <img className='max-w-40' src={Logo} alt="Logo" />
            </Link>
          </div>


          <h1 className="text-xl sm:text-2xl font-extrabold text-center text-white tracking-tight">
            Bienvenido de Nuevo
          </h1>
          <p className="text-xs text-gray-400 text-center leading-relaxed mt-2 max-w-xs mx-auto mb-6">
            Ingresa a tu butaca VIP y continúa disfrutando de tus películas y series en ultra definición.
          </p>

          <form onSubmit={handleLogin} noValidate className="space-y-4">
            
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-email"
                  className="text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                >
                  CORREO ELECTRÓNICO
                </label>
                <span className="text-[10px] text-gray-500 font-medium">
                  ej. usuario@mjmovies.com
                </span>
              </div>
              <div
                className={`relative flex items-center rounded-xl overflow-hidden bg-[#13131b] border transition-all ${
                  errors.email
                    ? 'border-[#e50914] ring-1 ring-[#e50914]/40'
                    : 'border-white/10 hover:border-white/20 focus-within:border-[#e50914] focus-within:ring-1 focus-within:ring-[#e50914]/40'
                }`}
              >
                <span className="pl-3.5 text-gray-400 select-none text-sm font-semibold">@</span>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={validateEmail}
                  placeholder="tu@email.com"
                  autoComplete="email"
                  required
                  className="w-full bg-transparent py-3 pl-2 pr-3.5 text-sm text-white placeholder-gray-500 focus:outline-none"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-[11px] text-[#e50914] font-medium">{errors.email}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                >
                  CONTRASEÑA
                </label>
                <button
                  type="button"
                  onClick={() => alert('Para restablecer tu contraseña, contacta al soporte de MJMovies.')}
                  className="text-[10px] text-gray-400 hover:text-white transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div
                className={`relative flex items-center rounded-xl overflow-hidden bg-[#13131b] border transition-all ${
                  errors.password
                    ? 'border-[#e50914] ring-1 ring-[#e50914]/40'
                    : 'border-white/10 hover:border-white/20 focus-within:border-[#e50914] focus-within:ring-1 focus-within:ring-[#e50914]/40'
                }`}
              >
                <Lock size={15} className="ml-3.5 text-gray-400 shrink-0" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu clave de acceso"
                  autoComplete="current-password"
                  required
                  className="w-full bg-transparent py-3 pl-2.5 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-gray-400 hover:text-white transition-colors p-1"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-[11px] text-[#e50914] font-medium">{errors.password}</p>
              )}
            </div>

            <div className="flex items-center pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={rememberMe}
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                    rememberMe
                      ? 'bg-[#e50914] border border-[#e50914] shadow-[0_0_8px_rgba(229,9,20,0.5)]'
                      : 'bg-transparent border border-white/30'
                  }`}
                >
                  {rememberMe && (
                    <svg className="w-2.5 h-2.5 text-white stroke-current stroke-[3] fill-none" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
                <span className="text-xs text-gray-300 font-normal">Mantener sesión iniciada</span>
              </label>
            </div>

            {globalError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                <AlertCircle size={16} className="shrink-0" />
                <span>{globalError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[#e50914] hover:bg-[#f40612] active:scale-[0.99] text-white font-bold text-xs tracking-wider uppercase shadow-[0_4px_22px_rgba(229,9,20,0.45)] hover:shadow-[0_4px_30px_rgba(229,9,20,0.6)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>INICIAR SESIÓN</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <div className="pt-6 border-t border-white/5 text-center">
            <p className="text-xs text-gray-400">
              ¿Primera vez en MJMovies?{' '}
              <Link
                to="/register"
                className="text-white hover:text-[#e50914] font-bold transition-colors inline-flex items-center gap-1 ml-1"
              >
                <span>Regístrate aquí</span>
                <ExternalLink size={12} className="opacity-80" />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
