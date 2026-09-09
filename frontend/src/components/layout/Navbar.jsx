import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useToastStore } from '../../stores/toastStore'
import { Search, Film, Tv, User, Shield, LogOut, Menu, X } from 'lucide-react'

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo & Main Nav */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-1 text-2xl font-black tracking-tight text-white group">
            <span className="text-primary group-hover:text-primary-hover transition-colors">MJ</span>
            <span>MOVIES</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = location.pathname + location.search === link.path
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-semibold transition-colors hover:text-white ${
                    isActive ? 'text-primary' : 'text-neutral-300'
                  }`}
                >
                  {link.name}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-4">
          {/* Search Box */}
          <div className="relative">
            {showSearchInput ? (
              <form onSubmit={handleSearchSubmit} className="flex items-center">
                <input
                  type="text"
                  placeholder="Buscar película, serie..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-48 sm:w-64 bg-surface-2/90 border border-white/20 rounded-full py-1.5 pl-9 pr-8 text-xs text-white placeholder-neutral-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary backdrop-blur-md"
                />
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowSearchInput(false)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </form>
            ) : (
              <button
                onClick={() => setShowSearchInput(true)}
                className="p-2 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                aria-label="Abrir buscador"
              >
                <Search className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* User Profile / Auth */}
          {isLoggedIn ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2.5 p-1 rounded-full hover:ring-2 hover:ring-primary transition-all focus:outline-none"
                aria-label="Menú de usuario"
              >
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-white text-xs uppercase shadow-glow-primary">
                  {user?.username?.slice(0, 2) || 'U'}
                </div>
              </button>

              {/* Dropdown Menu */}
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
            <div className="hidden sm:flex items-center gap-3">
              <Link
                to="/login"
                className="text-xs font-bold text-neutral-300 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                Iniciar Sesión
              </Link>
              <Link
                to="/register"
                className="text-xs font-bold text-white bg-primary hover:bg-primary-hover px-4 py-2 rounded-lg shadow-glow-primary transition-colors"
              >
                Registrarse
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-neutral-300 hover:text-white rounded-lg hover:bg-white/10"
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
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
