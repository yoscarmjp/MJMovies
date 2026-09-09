import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useToastStore } from '../../stores/toastStore'
import { Search, User, Shield, LogOut, Menu, X, Bell } from 'lucide-react'
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

  const dropdownRef = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowSearchInput(true)
        searchInputRef.current?.focus()
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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowUserDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
    setShowUserDropdown(false)
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
          {/* Desktop Integrated Search Pill */}
          <div className="hidden lg:block relative">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar película, serie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 xl:w-72 bg-surface-2/70 hover:bg-surface-2 border border-white/15 focus:border-primary/80 rounded-full py-1.5 pl-9 pr-16 text-xs text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary/50 backdrop-blur-md transition-all"
              />
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-neutral-400 border border-white/10">
                  Ctrl K
                </kbd>
              </div>
            </form>
          </div>

          {/* Mobile / Tablet Search Toggle */}
          <div className="lg:hidden relative">
            {showSearchInput ? (
              <form onSubmit={handleSearchSubmit} className="flex items-center">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-44 sm:w-56 bg-surface-2/95 border border-white/20 rounded-full py-1.5 pl-8 pr-7 text-xs text-white placeholder-neutral-400 focus:outline-none focus:border-primary backdrop-blur-md"
                />
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowSearchInput(false)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
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

          {/* Notification Bell */}
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
                className="flex items-center gap-2 p-1 pl-2 pr-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all focus:outline-none"
                aria-label="Menú de usuario"
              >
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center font-bold text-white text-xs uppercase shadow-glow-primary">
                  {user?.username?.slice(0, 2) || 'U'}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold text-white leading-none">{user?.username}</span>
                  <span className="text-[10px] text-neutral-400 leading-none mt-0.5">
                    {user?.role === 'ADMIN' ? 'Admin' : 'User'}
                  </span>
                </div>
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-3 w-56 rounded-2xl bg-surface-1/95 border border-white/10 backdrop-blur-xl shadow-2xl p-2 z-50 animate-slide-up">
                  <div className="px-3 py-2 border-b border-white/10">
                    <p className="text-xs font-bold text-white truncate">{user?.username}</p>
                    <p className="text-[11px] text-neutral-400 truncate">{user?.email}</p>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/profile"
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <User className="w-4 h-4 text-neutral-400" />
                      <span>Mi Perfil</span>
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                      >
                        <Shield className="w-4 h-4 text-amber-400" />
                        <span>Panel Admin</span>
                      </Link>
                    )}
                  </div>

                  <div className="pt-1 border-t border-white/10">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-left"
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
                className="text-xs font-semibold text-neutral-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors hidden sm:block"
              >
                Iniciar Sesión
              </Link>
              <Link
                to="/register"
                className="text-xs font-bold text-white bg-primary hover:bg-primary-hover px-4 py-1.5 rounded-full shadow-glow-primary transition-all hover:scale-105"
              >
                Registrarse
              </Link>
            </div>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-neutral-300 hover:text-white rounded-lg hover:bg-white/10"
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
