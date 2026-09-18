import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import api from '../services/api'
import MovieCard from '../components/movies/MovieCard'
import {
  Search,
  Film,
  Tv,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Flame,
  Award,
  Filter,
  CheckCircle2,
  Zap,
  Radio,
  SlidersHorizontal,
  Mail,
  Crown,
  ChevronDown,
  Compass,
} from 'lucide-react'
import { useToastStore } from '../stores/toastStore'

export default function CatalogView() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { info: toastInfo } = useToastStore()

  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [genres, setGenres] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const appendModeRef = useRef(false)
  const currentQuery = searchParams.get('q') || ''
  const currentType = searchParams.get('type') || ''
  const currentGenre = searchParams.get('genre') || ''
  const currentOrigin = searchParams.get('origin') || ''
  const currentYear = searchParams.get('year') || ''
  const currentRating = searchParams.get('rating') || ''
  const currentSort = searchParams.get('sort') || 'popular'
  const currentFormat = searchParams.get('format') || ''
  const currentCategory = searchParams.get('category') || 'all'
  const [searchInput, setSearchInput] = useState(currentQuery)

  useEffect(() => {
    api.get('/movies/genres')
      .then((res) => setGenres(res.data.genres || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== currentQuery) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev)
          if (searchInput.trim()) next.set('q', searchInput.trim())
          else next.delete('q')
          return next
        }, { replace: true })
        setPage(1)
      }
    }, 280)

    return () => clearTimeout(timer)
  }, [searchInput])

  const hasValidPoster = (item) => {
    if (!item) return false
    const url = item.posterUrl || item.poster_path || item.backdropUrl || item.backdrop_path
    if (!url || typeof url !== 'string') return false
    const clean = url.trim()
    return clean.length > 5 && !clean.includes('dqK9Hag1054tghRQSqLSPoY2fgn') && !clean.includes('7u3DUTNuLhvJRlZ9qn5gqMxgf8w')
  }

  useEffect(() => {
    let isMounted = true
    const isAppend = appendModeRef.current

    const fetchCatalog = async () => {
      if (!isAppend) setLoading(true)
      try {
        const filterParams = {
          ...(currentGenre && { genre: currentGenre }),
          ...(currentYear && { year: currentYear }),
          ...(currentRating && { rating: currentRating }),
          ...(currentSort && { sort: currentSort }),
        }

        const localParams = {
          page,
          limit: 18,
          status: 'READY',
          ...(currentGenre && { genre: currentGenre }),
          ...(currentYear && { year: currentYear }),
          ...(currentRating && { rating: currentRating }),
          sort: currentSort === 'rating' ? 'rating' : currentSort === 'title' ? 'title' : currentSort === 'newest' ? 'year' : 'views',
          order: currentSort === 'title' ? 'asc' : 'desc',
        }

        const matchesClientFilters = (it) => {
          if (!hasValidPoster(it)) return false

          if (currentYear) {
            const rawYear = it.year || parseInt((it.releaseDate || it.release_date || it.first_air_date || '').split('-')[0], 10)
            if (currentYear === 'classic') {
              if (rawYear && rawYear > 2010) return false
            } else if (!isNaN(parseInt(currentYear, 10))) {
              if (rawYear && String(rawYear) !== String(currentYear)) return false
            }
          }

          if (currentRating) {
            const minR = parseFloat(currentRating)
            const r = it.rating || it.vote_average || 0
            if (r < minR) return false
          }

          return true
        }

        if (currentQuery) {
          const [localRes, extRes] = await Promise.allSettled([
            api.get('/movies/search', { params: { q: currentQuery } }),
            api.get('/external-movies/all/search', { params: { query: currentQuery, page } }),
          ])

          const locals = localRes.status === 'fulfilled' ? (localRes.value.data.movies || []) : []
          const extData = extRes.status === 'fulfilled' ? extRes.value.data : {}
          const externals = extData.items || extData.results || extData.movies || []

          const combined = [...locals, ...externals]
          const seen = new Set()
          const unique = []
          for (const it of combined) {
            const key = (it.title || it.name || '').toLowerCase()
            if (!seen.has(key) && matchesClientFilters(it)) {
              seen.add(key)
              unique.push(it)
            }
          }

          const extTotalPages = extData.totalPages || 1
          const extTotalResults = extData.totalResults || extData.total_results || externals.length
          const realTotal = locals.length + extTotalResults

          if (isMounted) {
            if (isAppend) {
              setItems((prev) => {
                const prevKeys = new Set(prev.map((it) => (it.title || it.name || '').toLowerCase()))
                return [...prev, ...unique.filter((it) => !prevKeys.has((it.title || it.name || '').toLowerCase()))]
              })
            } else {
              setItems(unique)
            }
            setTotalPages(extTotalPages)
            setTotalCount(realTotal)
          }
        } else if (currentOrigin === 'local') {
          const res = await api.get('/movies', { params: localParams })
          const raw = res.data.movies || []
          const filtered = raw.filter(matchesClientFilters)
          const pag = res.data.pagination || {}

          if (isMounted) {
            if (isAppend) {
              setItems((prev) => {
                const prevKeys = new Set(prev.map((it) => String(it.id)))
                return [...prev, ...filtered.filter((it) => !prevKeys.has(String(it.id)))]
              })
            } else {
              setItems(filtered)
            }
            setTotalPages(pag.pages || pag.totalPages || 1)
            setTotalCount(pag.total || pag.count || raw.length)
          }
        } else if (currentCategory === 'cinema' || currentCategory === 'estrenos') {
          const res = await api.get('/external-movies/movies/trending', {
            params: { page, ...filterParams },
          })
          const raw = res.data.movies || []
          const filtered = raw.filter(matchesClientFilters)
          const realTotalPages = res.data.totalPages || res.data.total_pages || 1
          const realTotalResults = res.data.totalResults || res.data.total_results || filtered.length

          if (isMounted) {
            if (isAppend) {
              setItems((prev) => {
                const prevKeys = new Set(prev.map((it) => String(it.id || it.tmdbId)))
                return [...prev, ...filtered.filter((it) => !prevKeys.has(String(it.id || it.tmdbId)))]
              })
            } else {
              setItems(filtered)
            }
            setTotalPages(realTotalPages)
            setTotalCount(realTotalResults)
          }
        } else if (currentCategory === 'top' || currentCategory === 'awards') {
          const res = await api.get('/external-movies/movies/top-rated', {
            params: { page, ...filterParams, rating: currentRating || '8.0', sort: currentSort || 'rating' },
          })
          const raw = res.data.movies || []
          const filtered = raw.filter(matchesClientFilters)
          const realTotalPages = res.data.totalPages || res.data.total_pages || 1
          const realTotalResults = res.data.totalResults || res.data.total_results || filtered.length

          if (isMounted) {
            if (isAppend) {
              setItems((prev) => {
                const prevKeys = new Set(prev.map((it) => String(it.id || it.tmdbId)))
                return [...prev, ...filtered.filter((it) => !prevKeys.has(String(it.id || it.tmdbId)))]
              })
            } else {
              setItems(filtered)
            }
            setTotalPages(realTotalPages)
            setTotalCount(realTotalResults)
          }
        } else if (currentType === 'tv') {
          const res = await api.get('/external-movies/series/popular', {
            params: { page, ...filterParams },
          })
          const raw = res.data.series || []
          const filtered = raw.filter(matchesClientFilters)
          const realTotalPages = res.data.totalPages || res.data.total_pages || 1
          const realTotalResults = res.data.totalResults || res.data.total_results || filtered.length

          if (isMounted) {
            if (isAppend) {
              setItems((prev) => {
                const prevKeys = new Set(prev.map((it) => String(it.id || it.tmdbId)))
                return [...prev, ...filtered.filter((it) => !prevKeys.has(String(it.id || it.tmdbId)))]
              })
            } else {
              setItems(filtered)
            }
            setTotalPages(realTotalPages)
            setTotalCount(realTotalResults)
          }
        } else {
          const [localRes, extRes] = await Promise.allSettled([
            page === 1 ? api.get('/movies', { params: { ...localParams, limit: 12 } }) : Promise.resolve({ data: { movies: [], pagination: {} } }),
            api.get('/external-movies/movies/popular', { params: { page, ...filterParams } }),
          ])

          const localData = localRes.status === 'fulfilled' ? localRes.value.data : {}
          const locals = (localData.movies || []).filter(matchesClientFilters)
          const localTotal = localData.pagination?.total || locals.length

          const extData = extRes.status === 'fulfilled' ? extRes.value.data : {}
          const externals = (extData.movies || []).filter(matchesClientFilters)
          const extTotalPages = extData.totalPages || extData.total_pages || 1
          const extTotalResults = extData.totalResults || extData.total_results || (extTotalPages * 20)

          const combined = [...locals, ...externals]
          const seen = new Set()
          const unique = []
          for (const it of combined) {
            const key = (it.title || it.name || '').toLowerCase()
            if (!seen.has(key)) {
              seen.add(key)
              unique.push(it)
            }
          }

          if (isMounted) {
            if (isAppend) {
              setItems((prev) => {
                const prevKeys = new Set(prev.map((it) => (it.title || it.name || '').toLowerCase()))
                return [...prev, ...unique.filter((it) => !prevKeys.has((it.title || it.name || '').toLowerCase()))]
              })
            } else {
              setItems(unique)
            }
            setTotalPages(extTotalPages)
            setTotalCount(localTotal + extTotalResults)
          }
        }
      } catch (err) {
        console.error('Error cargando catálogo:', err)
      } finally {
        if (isMounted) {
          setLoading(false)
          appendModeRef.current = false
        }
      }
    }

    fetchCatalog()

    return () => {
      isMounted = false
    }
  }, [currentQuery, currentType, currentGenre, currentOrigin, currentCategory, currentYear, currentRating, currentSort, currentFormat, page])

  const setParam = (key, val) => {
    appendModeRef.current = false
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (val) next.set(key, val)
      else next.delete(key)
      return next
    })
    setPage(1)
  }

  const handleTabClick = (tabId) => {
    appendModeRef.current = false
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('type')
      next.delete('origin')
      next.set('category', tabId)

      if (tabId === 'movie') {
        next.set('type', 'movie')
      } else if (tabId === 'tv') {
        next.set('type', 'tv')
      } else if (tabId === 'local') {
        next.set('origin', 'local')
      }
      return next
    })
    setPage(1)
  }

  const isTabActive = (tabId) => {
    if (tabId === 'all') {
      return !currentType && !currentOrigin && (!currentCategory || currentCategory === 'all')
    }
    if (tabId === 'cinema') return currentCategory === 'cinema' || currentCategory === 'estrenos'
    if (tabId === 'movie') return currentType === 'movie' || currentCategory === 'movies'
    if (tabId === 'tv') return currentType === 'tv' || currentCategory === 'tv'
    if (tabId === 'local') return currentOrigin === 'local' || currentCategory === 'local'
    if (tabId === 'awards') return currentCategory === 'awards' || currentCategory === 'top'
    return false
  }

  const trendingTags = ['Dune 2', 'Oppenheimer', 'Interstellar', 'Spider-Man', 'The Dark Knight']

  return (
    <div className="min-h-screen bg-background text-white pt-24 pb-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <div className="flex flex-col mt-4 sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold text-neutral-400 border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <Link to="/" className="hover:text-white transition-colors">MJMovies</Link>
            <span className="text-neutral-600">›</span>
            <span className="text-neutral-300">Catálogo</span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pt-2">
          <div className="space-y-3 max-w-2xl">
            <span className="text-xs font-black uppercase tracking-widest text-primary font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              CARTELERA MJMOVIES
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase font-display leading-[0.95]">
              CARTELERA & CATÁLOGO <br className="hidden sm:inline" />
              <span className="text-primary">UNIVERSAL</span>
            </h1>

            <p className="text-sm text-neutral-400 leading-relaxed max-w-xl">
              Explora producciones cinematográficas galardonadas, estrenos de taquilla y sagas legendarias remasterizadas en Dolby Atmos y Vision HDR.
            </p>
          </div>

          <div className="w-full lg:max-w-md space-y-2.5">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar película, director, autor o saga..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-surface-2/90 border border-white/15 focus:border-primary rounded-sm py-3 pl-11 pr-10 text-sm text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/40 backdrop-blur-xl shadow-xl transition-all"
              />
              <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchInput ? (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <Sparkles className="w-4 h-4 text-primary/60 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap text-xs text-neutral-400">
              <span className="font-semibold text-neutral-500 text-[11px]">Tendencias hoy:</span>
              {trendingTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSearchInput(tag)}
                  className="text-[11px] font-bold text-neutral-400 hover:text-white hover:underline transition-colors"
                >
                  #{tag.replace(/\s+/g, '')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'cinema', label: 'Estrenos en Cines', icon: Flame, isCinema: true },
            { id: 'movie', label: 'Películas', icon: Film },
            { id: 'tv', label: 'Series', icon: Tv },
            { id: 'local', label: 'Subidas / Locales', icon: Sparkles },
            { id: 'awards', label: 'Aclamadas y Premiadas', icon: Award },
          ].map((tab) => {
            const active = isTabActive(tab.id)
            const Icon = tab.icon

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-bold transition-all whitespace-nowrap ${
                  active
                    ? 'bg-primary text-white shadow-glow-primary'
                    : 'bg-surface-1/80 hover:bg-surface-2 text-neutral-300 hover:text-white border border-white/10'
                }`}
              >
                {tab.isCinema && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                {Icon && <Icon className="w-3.5 h-3.5" />}
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-3 rounded-sm bg-surface-1/80 border border-white/10 backdrop-blur-xl">
          <div className="relative">
            <select
              value={currentGenre}
              onChange={(e) => setParam('genre', e.target.value)}
              className="w-full appearance-none bg-surface-2/90 border border-white/10 rounded-sm px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-primary cursor-pointer pr-8"
            >
              <option value="">Géneros: Todos</option>
              {genres.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={currentYear}
              onChange={(e) => setParam('year', e.target.value)}
              className="w-full appearance-none bg-surface-2/90 border border-white/10 rounded-sm px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-primary cursor-pointer pr-8"
            >
              <option value="">Año: Todos</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
              <option value="2021">2021</option>
              <option value="2020">2020</option>
              <option value="classic">Clásicos (Pre-2010)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={currentRating}
              onChange={(e) => setParam('rating', e.target.value)}
              className="w-full appearance-none bg-surface-2/90 border border-white/10 rounded-sm px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-primary cursor-pointer pr-8"
            >
              <option value="">Calificación: Todas</option>
              <option value="8.5">+8.5 IMDb (Obras Maestras)</option>
              <option value="8.0">+8.0 IMDb (Excelentes)</option>
              <option value="7.0">+7.0 IMDb (Buenas)</option>
              <option value="6.0">+6.0 IMDb (Aceptables)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={currentFormat}
              onChange={(e) => setParam('format', e.target.value)}
              className="w-full appearance-none bg-surface-2/90 border border-white/10 rounded-sm px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-primary cursor-pointer pr-8"
            >
              <option value="">Formato: Todos</option>
              <option value="4k">Formato: 4K HDR</option>
              <option value="imax">IMAX Enhanced</option>
              <option value="dolby">Dolby Vision & Atmos</option>
              <option value="1080p">1080p Full HD</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="relative col-span-2 sm:col-span-1">
            <select
              value={currentSort}
              onChange={(e) => setParam('sort', e.target.value)}
              className="w-full appearance-none bg-surface-2/90 border border-white/10 rounded-sm px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-primary cursor-pointer pr-8"
            >
              <option value="popular">Ordenar por: Más Populares</option>
              <option value="rating">Mayor Calificación</option>
              <option value="newest">Más Recientes</option>
              <option value="title">Título A-Z</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-sm skeleton" />
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
            {items.map((item) => (
              <MovieCard key={item.tmdbId || item.id} movie={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-surface-1/60 rounded-sm border border-white/10 backdrop-blur-xl">
            <Film className="w-16 h-16 mx-auto text-neutral-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No se encontraron producciones</h3>
            <p className="text-sm text-neutral-400 max-w-md mx-auto mb-6">
              {searchInput
                ? `No encontramos resultados con banner para "${searchInput}".`
                : 'Intenta restablecer los filtros para ver el catálogo completo.'}
            </p>
            <button
              onClick={() => {
                setSearchInput('')
                setSearchParams({})
              }}
              className="px-6 py-2.5 rounded-sm bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-glow-primary transition-all"
            >
              Restablecer Filtros
            </button>
          </div>
        )}

        <div className="relative rounded-sm overflow-hidden bg-gradient-to-r from-surface-1 via-surface-2 to-surface-1 border border-white/10 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-sm bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0 shadow-glow-primary">
                <Compass className="w-7 h-7" />
              </div>
              <div className="space-y-1 text-center sm:text-left">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  ¿No encuentras lo que buscas?
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl leading-relaxed">
                  Nuestro catálogo se sincroniza a diario con estrenos mundiales, filmotecas internacionales y masterizaciones 4K de distribuidoras oficiales.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap justify-center">
              <button
                onClick={() => toastInfo('Solicitud enviada a los curadores de MJMovies')}
                className="px-5 py-2.5 rounded-sm bg-surface-3 hover:bg-white/10 text-white text-xs font-bold flex items-center gap-2 border border-white/15 transition-all hover:scale-105"
              >
                <Mail className="w-4 h-4 text-neutral-300" />
                <span>Solicitar Película</span>
              </button>

              <button
                onClick={() => toastInfo('Calidad IMAX Pro activada para todas las transmisiones')}
                className="px-5 py-2.5 rounded-sm bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center gap-2 shadow-glow-primary transition-all hover:scale-105"
              >
                <Crown className="w-4 h-4" />
                <span>Activar Calidad IMAX Pro</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-neutral-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>
              Mostrando <strong className="text-white">{items.length}</strong>
              {totalCount > 0 && (
                <> de <strong className="text-white">{totalCount.toLocaleString()}</strong></>
              )}
              {' '}producciones cinematográficas.
            </span>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => { appendModeRef.current = false; setPage((p) => Math.max(1, p - 1)) }}
                className="w-8 h-8 rounded-sm bg-surface-2 hover:bg-surface-3 disabled:opacity-30 text-white flex items-center justify-center border border-white/10 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {(() => {
                const buttons = []
                if (totalPages <= 7) {
                  for (let i = 1; i <= totalPages; i++) buttons.push(i)
                } else {
                  const left = Math.max(2, page - 1)
                  const right = Math.min(totalPages - 1, page + 1)
                  buttons.push(1)
                  if (left > 2) buttons.push('...')
                  for (let i = left; i <= right; i++) buttons.push(i)
                  if (right < totalPages - 1) buttons.push('...')
                  buttons.push(totalPages)
                }
                return buttons.map((num, idx) =>
                  num === '...' ? (
                    <span key={`ellipsis-${idx}`} className="text-neutral-500 px-1 text-xs">…</span>
                  ) : (
                    <button
                      key={num}
                      onClick={() => { appendModeRef.current = false; setPage(num) }}
                      className={`min-w-[2rem] h-8 px-1 rounded-sm text-xs font-bold transition-all ${
                        page === num
                          ? 'bg-primary text-white shadow-glow-primary font-black'
                          : 'bg-surface-2 hover:bg-surface-3 text-neutral-300 border border-white/10'
                      }`}
                    >
                      {num}
                    </button>
                  )
                )
              })()}

              <button
                disabled={page >= totalPages}
                onClick={() => { appendModeRef.current = false; setPage((p) => p + 1) }}
                className="w-8 h-8 rounded-sm bg-surface-2 hover:bg-surface-3 disabled:opacity-30 text-white flex items-center justify-center border border-white/10 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {page < totalPages && (
                <button
                  disabled={loading}
                  onClick={() => {
                    appendModeRef.current = true
                    setPage((p) => p + 1)
                  }}
                  className="ml-3 px-4 py-2 rounded-sm bg-surface-2 hover:bg-surface-3 disabled:opacity-60 text-white text-xs font-bold border border-white/15 flex items-center gap-1.5 transition-colors"
                >
                  <Film className="w-3.5 h-3.5 text-primary" />
                  <span>{loading && appendModeRef.current ? 'Cargando…' : 'Cargar Más Títulos'}</span>
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
