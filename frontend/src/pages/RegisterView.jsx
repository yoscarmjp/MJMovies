import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import Logo from "../assets/img/mjmovies.webp"
import {
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  Check,
  Tv,
  Download,
  Play,
  ArrowRight,
} from 'lucide-react';

export default function RegisterView() {
  const navigate = useNavigate();
  const { register, login } = useAuthStore();
  const { success: toastSuccess } = useToastStore();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [newsletterAccepted, setNewsletterAccepted] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverErrors, setServerErrors] = useState([]);
  const [globalError, setGlobalError] = useState('');

  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: 'Sin evaluar', color: 'text-gray-500' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score++;

    if (score <= 1) return { score: 1, label: 'Débil', color: 'text-red-500' };
    if (score === 2) return { score: 2, label: 'Media', color: 'text-amber-500' };
    if (score >= 3) return { score: Math.min(score, 4), label: 'Fuerte', color: 'text-emerald-500' };
    return { score: 0, label: 'Sin evaluar', color: 'text-gray-500' };
  }, [password]);

  const validate = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!username.trim()) {
      newErrors.username = 'El nombre de usuario es requerido';
    } else if (username.length < 3) {
      newErrors.username = 'Mínimo 3 caracteres';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      newErrors.username = 'Solo letras, números, guión o guión bajo';
    }

    if (!email.trim()) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Formato de correo no válido';
    }

    if (!password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (password.length < 8) {
      newErrors.password = 'Mínimo 8 caracteres';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = 'Incluye al menos una mayúscula, minúscula y número';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    if (!termsAccepted) {
      newErrors.terms = 'Debes aceptar los Términos de Servicio y la Política de Privacidad';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setGlobalError('');
    setServerErrors([]);

    if (!validate()) return;

    setLoading(true);
    const result = await register(email, username, password);

    if (result.success) {
      toastSuccess(`¡Cuenta creada! Bienvenido a la sala VIP, ${username}`);
      const loginRes = await login(email, password);
      setLoading(false);
      if (loginRes.success) {
        navigate('/', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    } else if (result.errors) {
      setLoading(false);
      setServerErrors(result.errors);
    } else {
      setLoading(false);
      setGlobalError(result.error || 'No se pudo crear la cuenta. Por favor verifica los datos ingresados.');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-[#07070a] px-4 py-8 overflow-hidden select-none">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[760px] h-[760px] bg-[#e50914]/15 rounded-full blur-[150px] opacity-80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#07070a_85%)]" />
      </div>

      <div className="relative z-10 w-full max-w-[460px]">
        <div className="rounded-3xl bg-[#0c0c12]/92 border border-white/10 p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] backdrop-blur-2xl">

          <div className="text-center mb-2">
            <Link to="/" className="inline-flex items-center gap-1 group transition-transform hover:scale-105">
              <img className='max-w-40' src={Logo} alt="Logo" />
            </Link>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-center text-white tracking-tight">
            Únete a la Experiencia MJMovies
          </h1>
          <p className="text-xs text-gray-400 text-center leading-relaxed mt-1.5 max-w-sm mx-auto mb-4">
            Disfruta estrenos exclusivos, cine de cartelera y series en 4K Ultra HD sin anuncios publicitarios.
          </p>

          <form onSubmit={handleRegister} noValidate className="space-y-3.5">
            <div>
              <label
                htmlFor="reg-username"
                className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1"
              >
                Nombre de Usuario
              </label>
              <div
                className={`relative flex items-center rounded-xl overflow-hidden bg-[#13131b] border transition-all ${errors.username
                    ? 'border-[#e50914] ring-1 ring-[#e50914]/40'
                    : 'border-white/10 hover:border-white/20 focus-within:border-[#e50914] focus-within:ring-1 focus-within:ring-[#e50914]/40'
                  }`}
              >
                <User size={15} className="ml-3.5 text-gray-400 shrink-0" />
                <input
                  id="reg-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="mjmoviesuser"
                  autoComplete="username"
                  required
                  className="w-full bg-transparent py-2.5 pl-2.5 pr-3.5 text-sm text-white placeholder-gray-500 focus:outline-none"
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-[11px] text-[#e50914] font-medium">{errors.username}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="reg-email"
                className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1"
              >
                Correo Electrónico
              </label>
              <div
                className={`relative flex items-center rounded-xl overflow-hidden bg-[#13131b] border transition-all ${errors.email
                    ? 'border-[#e50914] ring-1 ring-[#e50914]/40'
                    : 'border-white/10 hover:border-white/20 focus-within:border-[#e50914] focus-within:ring-1 focus-within:ring-[#e50914]/40'
                  }`}
              >
                <span className="pl-3.5 text-gray-400 select-none text-sm font-semibold">@</span>
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@mjmovies.com"
                  autoComplete="email"
                  required
                  className="w-full bg-transparent py-2.5 pl-2 pr-3.5 text-sm text-white placeholder-gray-500 focus:outline-none"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-[11px] text-[#e50914] font-medium">{errors.email}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="reg-password"
                  className="text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                >
                  Contraseña
                </label>
                <span className="text-[10px] text-gray-500 font-medium">
                  Mín. 8 caracteres
                </span>
              </div>
              <div
                className={`relative flex items-center rounded-xl overflow-hidden bg-[#13131b] border transition-all ${errors.password
                    ? 'border-[#e50914] ring-1 ring-[#e50914]/40'
                    : 'border-white/10 hover:border-white/20 focus-within:border-[#e50914] focus-within:ring-1 focus-within:ring-[#e50914]/40'
                  }`}
              >
                <Lock size={15} className="ml-3.5 text-gray-400 shrink-0" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  className="w-full bg-transparent py-2.5 pl-2.5 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none tracking-widest"
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

              <div className="mt-1.5 space-y-1">
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((step) => {
                    let barColor = 'bg-white/10';
                    if (passwordStrength.score >= step) {
                      if (passwordStrength.score === 1) barColor = 'bg-red-500';
                      else if (passwordStrength.score === 2) barColor = 'bg-amber-500';
                      else barColor = 'bg-emerald-500';
                    }
                    return (
                      <div
                        key={step}
                        className={`h-1 rounded-full transition-all duration-300 ${barColor}`}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-500">Nivel de seguridad</span>
                  <span className={`font-semibold ${passwordStrength.color}`}>
                    {passwordStrength.label}
                  </span>
                </div>
              </div>
              {errors.password && (
                <p className="mt-1 text-[11px] text-[#e50914] font-medium">{errors.password}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="reg-confirm-password"
                className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1"
              >
                Confirmar Contraseña
              </label>
              <div
                className={`relative flex items-center rounded-xl overflow-hidden bg-[#13131b] border transition-all ${errors.confirmPassword
                    ? 'border-[#e50914] ring-1 ring-[#e50914]/40'
                    : 'border-white/10 hover:border-white/20 focus-within:border-[#e50914] focus-within:ring-1 focus-within:ring-[#e50914]/40'
                  }`}
              >
                <ShieldCheck size={15} className="ml-3.5 text-gray-400 shrink-0" />
                <input
                  id="reg-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  className="w-full bg-transparent py-2.5 pl-2.5 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 text-gray-400 hover:text-white transition-colors p-1"
                  aria-label={showConfirmPassword ? 'Ocultar' : 'Mostrar'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-[11px] text-[#e50914] font-medium">{errors.confirmPassword}</p>
              )}
            </div>

            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={termsAccepted}
                  onClick={() => setTermsAccepted(!termsAccepted)}
                  className={`mt-0.5 w-4 h-4 shrink-0 rounded flex items-center justify-center transition-all ${termsAccepted
                      ? 'bg-[#e50914] border border-[#e50914] shadow-[0_0_8px_rgba(229,9,20,0.5)]'
                      : 'bg-transparent border border-white/30'
                    }`}
                >
                  {termsAccepted && (
                    <svg className="w-2.5 h-2.5 text-white stroke-current stroke-[3] fill-none" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
                <span className="text-[11px] text-gray-300 leading-tight">
                  Acepto los{' '}
                  <span className="text-white hover:underline">Términos de Servicio</span> y la{' '}
                  <span className="text-white hover:underline">Política de Privacidad</span> de MJMovies.
                </span>
              </label>
              {errors.terms && (
                <p className="mt-1 text-[11px] text-[#e50914] font-medium pl-6">{errors.terms}</p>
              )}
            </div>

            <div>
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={newsletterAccepted}
                  onClick={() => setNewsletterAccepted(!newsletterAccepted)}
                  className={`mt-0.5 w-4 h-4 shrink-0 rounded flex items-center justify-center transition-all ${newsletterAccepted
                      ? 'bg-[#e50914] border border-[#e50914] shadow-[0_0_8px_rgba(229,9,20,0.5)]'
                      : 'bg-transparent border border-white/30'
                    }`}
                >
                  {newsletterAccepted && (
                    <svg className="w-2.5 h-2.5 text-white stroke-current stroke-[3] fill-none" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
                <span className="text-[11px] text-gray-300 leading-tight">
                  Deseo recibir invitaciones a estrenos exclusivos y catálogo semanal de cartelera.
                </span>
              </label>
            </div>

            {serverErrors.length > 0 && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                <ul className="list-disc list-inside space-y-1">
                  {serverErrors.map((err, i) => (
                    <li key={i}>{err.message}</li>
                  ))}
                </ul>
              </div>
            )}

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
                  <div className="w-4 h-4 rounded-full border border-white flex items-center justify-center">
                    <Play size={8} className="fill-white translate-x-[0.5px]" />
                  </div>
                  <span>CREAR MI CUENTA GRATIS</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-3 border-t border-white/5 text-center">
            <p className="text-xs text-gray-400">
              ¿Ya tienes cuenta activa?{' '}
              <Link
                to="/login"
                className="text-white hover:text-[#e50914] font-bold transition-colors inline-flex items-center gap-1 ml-1"
              >
                <span>Inicia sesión aquí</span>
                <ArrowRight size={13} />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
