import React from 'react'
import { Link } from 'react-router-dom'
import Logo from '../../assets/img/mjmovies.webp'
import { ShieldCheck, Award, Tv, Sparkles, Smartphone, Film } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-black/90 border-t border-white/10 pt-16 pb-12 text-neutral-400 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/10">
          {/* Logo and Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="inline-block">
              <img src={Logo} alt="MJMovies" className="h-10 w-auto object-contain" />
            </Link>
            <p className="text-xs leading-relaxed text-neutral-400 max-w-sm">
              La experiencia definitiva de streaming en tu hogar. Transmisión nativa de alta fidelidad,
              audio espacial multicanal, transcodificación en tiempo real y catálogo curado de películas y series sin límites.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] font-bold text-neutral-300">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span>4K ULTRA HD</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] font-bold text-neutral-300">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>DOLBY ATMOS</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] font-bold text-neutral-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>HLS ADAPTIVE</span>
              </div>
            </div>
          </div>

          {/* Column 1: Explorar */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Explorar</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/catalog?type=movie" className="hover:text-white transition-colors">
                  Películas Populares
                </Link>
              </li>
              <li>
                <Link to="/catalog?type=tv" className="hover:text-white transition-colors">
                  Series en Tendencia
                </Link>
              </li>
              <li>
                <Link to="/catalog?sort=rating" className="hover:text-white transition-colors">
                  Aclamadas por la Crítica
                </Link>
              </li>
              <li>
                <Link to="/catalog" className="hover:text-white transition-colors">
                  Colecciones & Sagas
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-white transition-colors text-primary font-semibold">
                  Registro MJMovies
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Plataforma */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Plataforma</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="hover:text-white transition-colors cursor-default">Dispositivos Compatibles</span>
              </li>
              <li>
                <span className="hover:text-white transition-colors cursor-default">Modo Smart TV</span>
              </li>
              <li>
                <span className="hover:text-white transition-colors cursor-default">Calidad de Reproducción</span>
              </li>
              <li>
                <span className="hover:text-white transition-colors cursor-default">Control Remoto Digital</span>
              </li>
              <li>
                <span className="hover:text-white transition-colors cursor-default">Centro de Ayuda</span>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Legal</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="hover:text-white transition-colors cursor-default">Términos de Servicio</span>
              </li>
              <li>
                <span className="hover:text-white transition-colors cursor-default">Política de Privacidad</span>
              </li>
              <li>
                <span className="hover:text-white transition-colors cursor-default">Contacto & Soporte</span>
              </li>
              <li>
                <span className="hover:text-white transition-colors cursor-default">Aviso Legal de Contenidos</span>
              </li>
              <li>
                <span className="hover:text-white transition-colors cursor-default">Preferencias de Cookies</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-500">
          <p>© {new Date().getFullYear()} MJMovies Entertainment Inc. Todos los derechos reservados.</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
              Audio Lossless 96kHz Certificado
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-neutral-400" />
              4K UltraHD Master Certified
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
