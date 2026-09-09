import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useToastStore } from '../../stores/toastStore'
import api from '../../services/api'
import { Search, User, Shield, LogOut, Menu, X, Bell, Star, Loader2 } from 'lucide-react'
import Logo from '../../assets/img/mjmovies.webp'

export default function Navbar() {
  const { user, isLoggedIn, isAdmin, logout } = useAuthStore()
  const { success } = useToastStore()
  const navigate = useNavigate()
  const location = useLocation()

  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchInput, setShowSearchInput] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  // Live search state
  const [liveResults, setLiveResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showLiveDropdown, setShowLiveDropdown] = useState(false)

  const dropdownRef = useRef(null)
  const searchContainerRef = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowSearchInput(true)
        searchInputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        setShowLiveDropdown(false)
        setShowUserDropdown(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Búsqueda reactiva en vivo mientras escribe
  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 2) {
      setLiveResults([])
      setShowLiveDropdown(false)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const timer = setTimeout(async () => {
      try {
        const [localRes, extRes] = await Promise.allSettled([
          api.get('/movies/search', { params: { q } }),
          api.get('/external-movies/all/search', { params: { query: q } }),
        ])

        const locals = localRes.status === 'fulfilled' ? (localRes.value.data.movies || []) : []
        const externals = extRes.status === 'fulfilled' ? (extRes.value.data.items || extRes.value.data.results || []) : []

        const combined = [
          ...locals.map((m) => ({
            ...m,
            isLocal: true,
            route: `/movie/${m.id}`,
            poster: m.posterUrl,
          })),
          ...externals.map((m) => ({
            ...m,
            isLocal: false,
            route: `/external/${m.id || m.tmdbId}?type=${m.mediaType || 'movie'}`,
            poster: m.posterUrl || (m.poster_path ? `https://image.tmdb.org/t/p/w200${m.poster_path}` : null),
          })),
        ]

        // Filtrar elementos sin poster válido
        const withPoster = combined.filter((m) => m.poster && typeof m.poster === 'string' && m.poster.trim().length > 5)

        // De-duplicar por título
        const seen = new Set()
        const unique = []
        for (const item of withPoster) {
          const key = (item.title || '').toLowerCase()
          if (!seen.has(key)) {
            seen.add(key)
            unique.push(item)
          }
        }

        setLiveResults(unique.slice(0, 6))
        setShowLiveDropdown(true)
      } catch (err) {
        console.warn('Error en búsqueda en vivo:', err)
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowUserDropdown(false)
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowLiveDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cerrar menús al cambiar de ruta
  useEffect(() => {
    setMobileMenuOpen(false)
    setShowUserDropdown(false)
    setShowLiveDropdown(false)
  }, [location.pathname])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/catalog?q=${encodeURIComponent(searchQuery.trim())}`)
      setShowSearchInput(false)
      setSearchQuery('')
    }
  }

  const handleLogout = async () => {
    await logout()
    success('Sesión cerrada correctamente')
    navigate('/')
  }

  const navLinks = [
    { name: 'Inicio', path: '/' },
    { name: 'Películas', path: '/catalog?type=movie' },
    { name: 'Series', path: '/catalog?type=tv' },
    { name: 'Catálogo', path: '/catalog' },
  ]

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-background/90 backdrop-blur-md border-b border-white/10 shadow-2xl py-3'
          : 'bg-gradient-to-b from-black/80 via-black/40 to-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mt-4 mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-1 text-2xl font-black tracking-tight text-white group">
            <img className='max-w-48' src={Logo} alt="" />
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => {
              const isActive = location.pathname + location.search === link.path
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-semibold transition-all relative py-1 ${
                    isActive
                      ? 'text-white font-bold after:content-[""] after:absolute after:bottom-[-2px] after:left-0 after:right-0 after:h-[2.5px] after:bg-primary after:rounded-full'
                      : 'text-neutral-300 hover:text-white'
                  }`}
                >
                  {link.name}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3.5">
          {/* Desktop Search con Dropdown Flotante en Vivo */}
          <div className="hidden lg:block relative" ref={searchContainerRef}>
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar película, serie..."
                value={searchQuery}
                onFocus={() => {
                  if (liveResults.length > 0) setShowLiveDropdown(true)
                }}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 xl:w-72 bg-surface-2/70 hover:bg-surface-2 border border-white/15 focus:border-primary/80 rounded-full py-1.5 pl-9 pr-16 text-xs text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary/50 backdrop-blur-md transition-all"
              />
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {isSearching ? (
                  <Loader2 className="w-3 h-3 text-primary animate-spin mr-1" />
                ) : (
                  <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-neutral-400 border border-white/10">
                    Ctrl K
                  </kbd>
                )}
              </div>
            </form>

            {/* Dropdown flotante en vivo Desktop */}
            {showLiveDropdown && searchQuery.trim().length >= 2 && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-black/85 border border-white/15 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-2 z-50 animate-fade-in">
                {isSearching && liveResults.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 py-4 text-xs text-neutral-400">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Buscando en catálogo...</span>
                  </div>
                ) : liveResults.length > 0 ? (
                  <div className="space-y-1">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-white/10 pb-1.5">
                      Coincidencias encontradas
                    </div>
                    {liveResults.map((item) => (
                      <Link
                        key={item.id || item.tmdbId}
                        to={item.route}
                        onClick={() => {
                          setShowLiveDropdown(false)
                          setSearchQuery('')
                        }}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors group"
                      >
                        <img
                          src={
                            item.poster.includes('image.tmdb.org')
                              ? `/api/external-movies/image-proxy?url=${encodeURIComponent(item.poster)}`
                              : item.poster
                          }
                          alt={item.title}
                          className="w-9 h-12 rounded-lg object-cover bg-surface-2 shrink-0 border border-white/10"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-white truncate group-hover:text-primary transition-colors">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5">
                            <span>{item.year || item.releaseDate?.slice(0, 4) || '2024'}</span>
                            <span>•</span>
                            <span className="uppercase text-[9px] font-bold text-neutral-300">
                              {item.mediaType === 'tv' ? 'Serie' : 'Película'}
                            </span>
                            {item.rating > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-gold font-bold flex items-center gap-0.5">
                                  ★ {Number(item.rating).toFixed(1)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                    <button
                      type="button"
                      onClick={handleSearchSubmit}
                      className="w-full text-center py-2 text-[11px] font-bold text-primary hover:text-white transition-colors border-t border-white/10 mt-1 block"
                    >
                      Ver todos los resultados en el catálogo →
                    </button>
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-neutral-400">
                    No se encontraron películas con "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile / Tablet Search */}
          <div className="lg:hidden relative">
            {showSearchInput ? (
              <div className="relative">
                <form onSubmit={handleSearchSubmit} className="flex items-center">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-48 sm:w-60 bg-surface-2/95 border border-white/20 rounded-full py-1.5 pl-8 pr-7 text-xs text-white placeholder-neutral-400 focus:outline-none focus:border-primary backdrop-blur-md"
                  />
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => {
                      setShowSearchInput(false)
                      setShowLiveDropdown(false)
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </form>

                {showLiveDropdown && searchQuery.trim().length >= 2 && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-black/90 border border-white/15 backdrop-blur-2xl shadow-2xl p-2 z-50">
                    {liveResults.slice(0, 4).map((item) => (
                      <Link
                        key={item.id || item.tmdbId}
                        to={item.route}
                        onClick={() => {
                          setShowLiveDropdown(false)
                          setShowSearchInput(false)
                          setSearchQuery('')
                        }}
                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/10 text-xs text-white truncate"
                      >
                        <span className="truncate flex-1 font-semibold">{item.title}</span>
                        <span className="text-[10px] text-gold font-bold">★ {Number(item.rating || 0).toFixed(1)}</span>
                      </Link>
                    ))}
                    <button
                      type="button"
                      onClick={handleSearchSubmit}
                      className="w-full text-center py-1.5 text-[10px] font-bold text-primary border-t border-white/10 mt-1"
                    >
                      Ver todo en catálogo
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowSearchInput(true)}
                className="p-2 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                aria-label="Abrir buscador"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            className="relative p-2 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            title="Notificaciones"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-background" />
          </button>

          {isLoggedIn ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2.5 py-1.5 pl-2 pr-3.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md transition-all shadow-sm focus:outline-none"
                aria-label="Menú de usuario"
              >
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center font-bold text-white text-sm uppercase shadow-glow-primary shrink-0">
                  {user?.username?.slice(0, 2) || 'U'}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-sm font-bold text-white leading-tight">{user?.username}</span>
                  <span className="text-[11px] text-neutral-400 font-medium leading-none mt-0.5">
                    {user?.role === 'ADMIN' ? 'Admin' : 'User'}
                  </span>
                </div>
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-1.5 w-60 rounded-2xl bg-black/80 border border-white/15 backdrop-blur-2xl shadow-[0_15px_40px_rgba(0,0,0,0.85)] p-2 z-50 animate-fade-in">
                  <div className="px-3.5 py-2.5 border-b border-white/10">
                    <p className="text-sm font-bold text-white truncate">{user?.username}</p>
                    <p className="text-xs text-neutral-400 truncate mt-0.5">{user?.email}</p>
                  </div>

                  <div className="py-1.5 space-y-0.5">
                    <Link
                      to="/profile"
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                    >
                      <User className="w-4 h-4 text-neutral-400" />
                      <span>Mi Perfil</span>
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setShowUserDropdown(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-500/10 rounded-xl transition-colors"
                      >
                        <Shield className="w-4 h-4 text-amber-400" />
                        <span>Panel Admin</span>
                      </Link>
                    )}
                  </div>

                  <div className="pt-1.5 border-t border-white/10">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/15 rounded-xl transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4 text-red-400" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-sm font-semibold text-neutral-300 hover:text-white px-3 py-1.5 rounded-sm hover:bg-white/10 transition-colors hidden sm:block"
              >
                Iniciar Sesión
              </Link>
              <Link
                to="/register"
                className="text-sm font-bold text-white bg-primary hover:bg-primary-hover px-4 py-1.5 rounded-sm shadow-glow-primary transition-all hover:scale-105"
              >
                Registrarse
              </Link>
            </div>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-neutral-300 hover:text-white rounded-sm hover:bg-white/10"
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-surface-1/95 border-b border-white/10 backdrop-blur-xl px-4 pt-3 pb-6 space-y-2 animate-slide-up">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="block px-3 py-2 text-sm font-semibold text-neutral-300 hover:text-white hover:bg-white/5 rounded-lg"
            >
              {link.name}
            </Link>
          ))}

          {!isLoggedIn && (
            <div className="pt-4 border-t border-white/10 flex flex-col gap-2">
              <Link
                to="/login"
                className="text-center py-2 text-sm font-bold text-neutral-300 hover:bg-white/5 rounded-lg"
              >
                Iniciar Sesión
              </Link>
              <Link
                to="/register"
                className="text-center py-2 text-sm font-bold text-white bg-primary rounded-lg shadow-glow-primary"
              >
                Registrarse
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
