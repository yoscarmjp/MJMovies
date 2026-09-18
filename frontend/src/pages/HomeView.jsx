import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'
import api from '../services/api'
import MovieCard from '../components/movies/MovieCard'
import {
  Play,
  Info,
  Plus,
  Check,
  Star,
  ChevronRight,
  ChevronLeft,
  Tv,
  Sparkles,
  Flame,
  Award,
  Clock,
  Film,
  SlidersHorizontal,
  Smartphone,
  Wifi,
  ShieldCheck,
  MonitorPlay,
  Bookmark,
  Volume2,
  VolumeX,
} from 'lucide-react'

export default function HomeView() {
  const { isLoggedIn } = useAuthStore()
  const { success } = useToastStore()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [loadingExternal, setLoadingExternal] = useState(true)

  const [localMovies, setLocalMovies] = useState([])
  const [genreSections, setGenreSections] = useState([])
  const [watchHistory, setWatchHistory] = useState([])

  const [trendingMovies, setTrendingMovies] = useState([])
  const [trendingSeries, setTrendingSeries] = useState([])
  const [topRatedMovies, setTopRatedMovies] = useState([])
  const [topRatedSeries, setTopRatedSeries] = useState([])

  const [currentHeroIdx, setCurrentHeroIdx] = useState(0)
  const [isMuted, setIsMuted] = useState(true)
  const [savedToList, setSavedToList] = useState({})
  const [carteleraFilter, setCarteleraFilter] = useState('all') 

  const top10Ref = useRef(null)

  useEffect(() => {
    const loadLocal = async () => {
      try {
        const [moviesRes, genresRes] = await Promise.all([
          api.get('/movies?limit=24&sort=views&order=desc'),
          api.get('/movies/genres').catch(() => ({ data: { genres: [] } })),
        ])

        const movies = moviesRes.data.movies || []
        setLocalMovies(movies)

        const genres = genresRes.data.genres || []
        const sections = genres
          .map((g) => ({
            name: g.name,
            slug: g.slug,
            movies: movies.filter((m) => m.genres?.some((mg) => mg.id === g.id || mg.slug === g.slug)),
          }))
          .filter((s) => s.movies.length > 0)

        setGenreSections(sections)
      } catch (err) {
        console.error('Error cargando catálogo local:', err)
      } finally {
        setLoading(false)
      }
    }

    const loadExternal = async () => {
      try {
        const [tMovies, tSeries, topM, topS] = await Promise.all([
          api.get('/external-movies/movies/trending').catch(() => ({ data: { movies: [] } })),
          api.get('/external-movies/series/trending').catch(() => ({ data: { series: [] } })),
          api.get('/external-movies/movies/top-rated').catch(() => ({ data: { movies: [] } })),
          api.get('/external-movies/series/top-rated').catch(() => ({ data: { series: [] } })),
        ])

        setTrendingMovies(tMovies.data.movies || [])
        setTrendingSeries(tSeries.data.series || [])
        setTopRatedMovies(topM.data.movies || [])
        setTopRatedSeries(topS.data.series || [])
      } catch (err) {
        console.error('Error cargando contenidos externos:', err)
      } finally {
        setLoadingExternal(false)
      }
    }

    const loadHistory = async () => {
      try {
        let backendItems = []
        if (isLoggedIn) {
          try {
            const res = await api.get('/movies/user/history')
            backendItems = res.data.history || []
          } catch {}
        }

        let localItems = []
        try {
          const raw = localStorage.getItem('mjmovies_recent_history')
          if (raw) localItems = JSON.parse(raw)
        } catch {}

        const map = new Map()

        localItems.forEach((item) => {
          const key = item.movieId || item.id
          const pos = Number(item.position) || 0
          if (key && pos >= 15) {
            map.set(key, {
              movieId: key,
              position: pos,
              duration: item.duration || 5400,
              updatedAt: item.updatedAt || new Date().toISOString(),
              season: item.season,
              episode: item.episode,
              movie: {
                id: key,
                title: item.title,
                posterUrl: item.posterUrl,
                backdropUrl: item.backdropUrl,
                duration: item.duration,
                mediaType: item.mediaType,
              },
            })
          }
        })

        backendItems.forEach((item) => {
          const key = item.movieId || item.movie?.id
          const pos = Number(item.position) || 0
          if (key && pos >= 15) {
            const existing = map.get(key)
            if (!existing || new Date(item.updatedAt) >= new Date(existing.updatedAt)) {
              map.set(key, {
                ...item,
                movieId: key,
                position: pos,
                duration: item.movie?.duration || item.duration || 5400,
              })
            }
          }
        })

        const combined = Array.from(map.values()).sort(
          (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
        )

        setWatchHistory(combined)
      } catch (err) {
        console.warn('Error cargando historial:', err)
      }
    }

    loadLocal()
    loadExternal()
    loadHistory()
  }, [isLoggedIn])

  const hasValidPoster = (item) => {
    if (!item) return false
    const url = item.backdropUrl || item.posterUrl || item.backdrop_path || item.poster_path
    if (!url || typeof url !== 'string') return false
    const clean = url.trim()
    if (clean.length < 6) return false
    if (clean.includes('dqK9Hag1054tghRQSqLSPoY2fgn') || clean.includes('7u3DUTNuLhvJRlZ9qn5gqMxgf8w')) {
      return false
    }
    return true
  }

  const hasValidHeroBackdrop = (item) => {
    if (!item) return false
    const url = item.backdropUrl || item.backdrop_path
    if (!url || typeof url !== 'string') return false
    const clean = url.trim()
    if (clean.length < 6) return false
    if (clean.includes('dqK9Hag1054tghRQSqLSPoY2fgn') || clean.includes('7u3DUTNuLhvJRlZ9qn5gqMxgf8w')) {
      return false
    }
    return true
  }

  const heroList = useMemo(() => {
    const list = []
    const featuredLocals = localMovies.filter((m) => m.featured && hasValidHeroBackdrop(m))
    list.push(...featuredLocals)

    const validMovies = trendingMovies.filter(hasValidHeroBackdrop)
    const validSeries = trendingSeries.filter(hasValidHeroBackdrop)
    if (validMovies.length > 0) list.push(validMovies[0])
    if (validSeries.length > 0) list.push(validSeries[0])
    if (validMovies.length > 1) list.push(validMovies[1])
    if (validSeries.length > 1) list.push(validSeries[1])

    const seen = new Set()
    const unique = []
    for (const item of list) {
      const key = item.id || item.tmdbId
      if (key && !seen.has(key)) {
        seen.add(key)
        unique.push(item)
      }
    }
    return unique.slice(0, 4)
  }, [localMovies, trendingMovies, trendingSeries])

  const heroItem = useMemo(() => {
    if (heroList.length === 0) return null
    return heroList[currentHeroIdx] || heroList[0]
  }, [heroList, currentHeroIdx])

  useEffect(() => {
    if (heroList.length <= 1) return
    const interval = setInterval(() => {
      setCurrentHeroIdx((prev) => (prev + 1) % heroList.length)
    }, 9000)
    return () => clearInterval(interval)
  }, [heroList.length])

  const getBackdropUrl = (item) => {
    if (!item) return null
    let url = item.backdropUrl || item.posterUrl || item.backdrop_path || item.poster_path
    if (!url) return null
    if (typeof url === 'string' && url.startsWith('/')) {
      url = `https://image.tmdb.org/t/p/original${url}`
    }
    if (typeof url === 'string' && url.includes('image.tmdb.org')) {
      return `/api/external-movies/image-proxy?url=${encodeURIComponent(url)}`
    }
    return url
  }

  const getPosterUrl = (item) => {
    if (!item) return null
    let url = item.posterUrl || item.backdropUrl || item.poster_path || item.backdrop_path
    if (!url) return null
    if (typeof url === 'string' && url.startsWith('/')) {
      url = `https://image.tmdb.org/t/p/w500${url}`
    }
    if (typeof url === 'string' && url.includes('image.tmdb.org')) {
      return `/api/external-movies/image-proxy?url=${encodeURIComponent(url)}`
    }
    return url
  }

  const formatDuration = (val) => {
    if (!val) return '2h 15m'
    if (typeof val === 'string' && (val.includes('h') || val.includes('min'))) return val
    const num = Number(val)
    if (isNaN(num)) return val
    if (num > 500) {
      const hours = Math.floor(num / 3600)
      const minutes = Math.floor((num % 3600) / 60)
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`
    }
    const hours = Math.floor(num / 60)
    const minutes = num % 60
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`
  }

  const heroBg = useMemo(() => getBackdropUrl(heroItem), [heroItem])

  const heroPlayLink = useMemo(() => {
    if (!heroItem) return '/'
    const target = heroItem.slug
      ? `/watch/${heroItem.id}`
      : `/watch/${heroItem.tmdbId}?type=${heroItem.mediaType || 'movie'}`
    if (!isLoggedIn) {
      return `/login?redirect=${encodeURIComponent(target)}`
    }
    return target
  }, [heroItem, isLoggedIn])

  const heroInfoLink = useMemo(() => {
    if (!heroItem) return '/'
    if (heroItem.slug) return `/movie/${heroItem.id}`
    return `/external/${heroItem.tmdbId}?type=${heroItem.mediaType || 'movie'}`
  }, [heroItem])

  const toggleSaveToList = (id) => {
    setSavedToList((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      if (next[id]) {
        success('Añadida a Mi Lista')
      } else {
        success('Eliminada de Mi Lista')
      }
      return next
    })
  }

  const categories = [
    { label: 'Todo el Catálogo', path: '/catalog', active: true },
    { label: 'Cine Taquillero', path: '/catalog?type=movie', icon: Film },
    { label: 'Series Aclamadas', path: '/catalog?type=tv', icon: Tv },
    { label: 'Cine de Culto & Sci-Fi', path: '/catalog?genre=scifi', icon: Sparkles },
    { label: 'Originales MJ Studios', path: '/catalog?origin=original', icon: Award },
    { label: 'Estrenos Recientes', path: '/catalog?sort=newest', icon: Flame },
  ]

  const carteleraItems = useMemo(() => {
    const combined = [...localMovies, ...trendingMovies].filter(hasValidPoster)
    if (carteleraFilter === '4k') {
      return combined.filter((m) => m.featured || m.rating >= 7.5).slice(0, 6)
    }
    if (carteleraFilter === 'dolby') {
      return combined.filter((m) => m.rating >= 8.0).slice(0, 6)
    }
    if (carteleraFilter === 'today') {
      return combined.slice(0, 6)
    }
    return combined.slice(0, 6)
  }, [localMovies, trendingMovies, carteleraFilter])

  const top10Items = useMemo(() => {
    const list = [...trendingMovies, ...trendingSeries, ...localMovies].filter(hasValidPoster)
    const seen = new Set()
    const unique = []
    for (const item of list) {
      const key = item.id || item.tmdbId
      if (key && !seen.has(key)) {
        seen.add(key)
        unique.push(item)
      }
    }
    return unique.slice(0, 10)
  }, [trendingMovies, trendingSeries, localMovies])

  const continueWatchingItems = useMemo(() => {
    return watchHistory
      .filter((item) => {
        const pos = Number(item.position) || 0
        const dur = Number(item.duration || item.movie?.duration) || 5400
        return pos >= 15 && pos < dur * 0.95 && hasValidPoster(item.movie || item)
      })
      .slice(0, 10)
  }, [watchHistory])

  const scrollTop10 = (direction) => {
    if (top10Ref.current) {
      const offset = direction === 'left' ? -600 : 600
      top10Ref.current.scrollBy({ left: offset, behavior: 'smooth' })
    }
  }

  return (
    <div className="pb-24 overflow-x-hidden bg-background">
      <section className="relative min-h-[85vh] lg:min-h-[90vh] flex items-center justify-start overflow-hidden pt-20">
        <div className="absolute inset-0 z-0 overflow-hidden">
          {heroList.map((item, idx) => {
            const bg = getBackdropUrl(item) || getPosterUrl(item)
            const isActive = idx === currentHeroIdx
            return (
              <div
                key={item.id || item.tmdbId || idx}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out pointer-events-none ${
                  isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
              >
                {bg && (
                  <img
                    src={bg}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                    className={`w-full h-full object-cover object-center filter brightness-[0.88] transition-transform duration-10000 ease-out ${
                      isActive ? 'scale-105' : 'scale-100'
                    }`}
                  />
                )}
              </div>
            )
          })}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent z-20 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/35 to-transparent z-20 pointer-events-none" />
        </div>

        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 w-full">
          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8">
            {heroItem ? (
              <div className="max-w-2xl flex flex-col justify-end space-y-4 transition-all duration-300">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-primary text-white shadow-glow-primary">
                    <Flame className="w-3.5 h-3.5" />
                    <span>MÁS POPULAR</span>
                  </span>

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase bg-white/10 text-white border border-white/20 backdrop-blur-md">
                    4K ULTRA HD
                  </span>

                  {heroItem.rating && (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black bg-black/40 text-gold border border-gold/30 backdrop-blur-md">
                      <Star className="w-3.5 h-3.5 fill-gold text-gold" />
                      <span>{Number(heroItem.rating).toFixed(1)} / 10 IMDb</span>
                    </div>
                  )}
                </div>

                <h1
                  key={heroItem?.id || heroItem?.tmdbId}
                  className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight uppercase leading-none drop-shadow-2xl font-display line-clamp-2 animate-fade-in"
                >
                  {heroItem.title}
                </h1>

                <div className="flex items-center gap-3 text-xs font-semibold text-neutral-300 flex-wrap">
                  <span className="px-1.5 py-0.5 rounded border border-neutral-400 text-[11px] font-bold text-neutral-200">
                    18+
                  </span>

                  <span>
                    {heroItem.mediaType === 'tv'
                      ? `${heroItem.seasonsCount || 1} Temporadas`
                      : formatDuration(heroItem.duration)}
                  </span>

                  <span>•</span>

                  <span className="text-neutral-300">
                    {heroItem.genres?.map((g) => g.name || g).join(', ') || 'Acción, Distopía, Suspenso'}
                  </span>
                </div>

                <p
                  key={`desc-${heroItem?.id || heroItem?.tmdbId}`}
                  className="text-sm sm:text-base text-neutral-300 line-clamp-3 leading-relaxed font-normal max-w-xl drop-shadow-md animate-fade-in"
                >
                  {heroItem.overview || heroItem.description}
                </p>

                <div className="flex items-center gap-3 pt-2 flex-wrap">
                  <Link
                    to={heroPlayLink}
                    className="px-7 py-3.5 rounded-sm bg-primary hover:bg-primary-hover text-white text-sm font-bold flex items-center gap-2.5 shadow-glow-primary hover:scale-105 transition-all"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Ver Ahora</span>
                  </Link>

                  <button
                    onClick={() => toggleSaveToList(heroItem.id || heroItem.tmdbId)}
                    className="px-5 py-3.5 rounded-sm bg-surface-2/80 hover:bg-surface-3 text-white text-sm font-semibold flex items-center gap-2 border border-white/15 backdrop-blur-md transition-all hover:scale-105"
                  >
                    {savedToList[heroItem.id || heroItem.tmdbId] ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>En Mi Lista</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Mi Lista</span>
                      </>
                    )}
                  </button>

                  <Link
                    to={heroInfoLink}
                    className="px-5 py-3.5 rounded-sm bg-white/10 hover:bg-white/20 text-white text-sm font-semibold flex items-center gap-2 border border-white/15 backdrop-blur-md transition-all hover:scale-105"
                  >
                    <Info className="w-4 h-4 text-neutral-300" />
                    <span>Ver Tráiler</span>
                  </Link>

                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-3.5 rounded-sm bg-surface-2/80 hover:bg-surface-3 text-white border border-white/15 backdrop-blur-md transition-all"
                    title={isMuted ? 'Activar sonido' : 'Silenciar'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-w-2xl space-y-4">
                <div className="w-32 h-6 rounded-full bg-white/10 skeleton" />
                <div className="w-96 h-14 rounded-xl bg-white/10 skeleton" />
                <div className="w-80 h-20 rounded-xl bg-white/10 skeleton" />
              </div>
            )}

            {heroList.length > 1 && (
              <div className="hidden sm:flex items-center gap-3 bg-black/60 backdrop-blur-xl p-2 rounded-2xl border border-white/10 shadow-2xl shrink-0 self-end">
                {heroList.map((item, idx) => {
                  const isActive = idx === currentHeroIdx
                  const thumb = getBackdropUrl(item) || getPosterUrl(item)
                  if (!thumb) return null
                  return (
                    <button
                      key={item.id || item.tmdbId || idx}
                      onClick={() => setCurrentHeroIdx(idx)}
                      className={`relative w-28 h-16 rounded-xl overflow-hidden border-2 transition-all duration-300 group text-left bg-surface-2 shrink-0 ${
                        isActive
                          ? 'border-primary ring-2 ring-primary/40 scale-105 shadow-glow-primary'
                          : 'border-white/20 hover:border-white/60 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={thumb}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.parentElement.style.display = 'none'
                        }}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
                      <div className="absolute bottom-1 left-1.5 right-1.5 pointer-events-none">
                        <p className="text-[10px] font-bold text-white truncate drop-shadow">
                          {item.title}
                        </p>
                      </div>

                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                          <div className="h-full bg-primary animate-progress-fill" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 mb-12 relative z-20">
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat, idx) => {
            const Icon = cat.icon
            return (
              <Link
                key={idx}
                to={cat.path}
                className={`whitespace-nowrap flex items-center gap-2 px-5 py-2.5 rounded-sm text-xs font-bold transition-all ${
                  cat.active
                    ? 'bg-primary text-white shadow-glow-primary scale-105'
                    : 'bg-surface-2/80 hover:bg-surface-3 text-neutral-300 hover:text-white border border-white/10 hover:border-white/25 backdrop-blur-md'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                <span>{cat.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 relative z-20">
        {continueWatchingItems.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="w-1 h-5 bg-primary rounded-full inline-block" />
                  <h2 className="text-xl font-bold text-white tracking-wide">Continuar Viendo</h2>
                </div>
                <p className="text-xs text-neutral-400 pl-3">Continúa donde te quedaste</p>
              </div>

              <Link
                to="/profile"
                className="text-xs font-bold text-neutral-400 hover:text-primary transition-colors flex items-center gap-1 group"
              >
                <span>Mi biblioteca completa</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {continueWatchingItems.map((item, idx) => {
                const movie = item.movie || item
                const thumb = getBackdropUrl(movie) || getPosterUrl(movie)
                const position = Number(item.position) || 0
                const duration = Number(movie.duration || item.duration) || 5400

                const remainingSec = Math.max(0, duration - position)
                const remainingMin = Math.ceil(remainingSec / 60)
                const progress = Math.min(100, Math.max(1, Math.round((position / duration) * 100)))

                const durH = Math.floor(duration / 3600)
                const durM = Math.floor((duration % 3600) / 60)
                const totalDurationLabel = durH > 0 ? `${durH}h ${durM}m` : `${durM} min`
                const remainingLabel = progress >= 92 ? 'Completada' : (position < 20 ? 'Por comenzar' : `Quedan ${remainingMin} min`)

                const targetId = item.movieId || movie.id || item.id
                const link = `/watch/${targetId}?t=${position}${item.season ? `&season=${item.season}` : ''}${item.episode ? `&episode=${item.episode}` : ''}${movie.mediaType === 'tv' ? '&type=tv' : ''}`

                return (
                  <Link
                    key={targetId || idx}
                    to={link}
                    className="group relative rounded-2xl overflow-hidden bg-surface-1/60 border border-white/10 hover:border-white/30 transition-all hover:-translate-y-1 hover:shadow-2xl"
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-surface-2">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={movie.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="w-8 h-8 text-neutral-600" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-11 h-11 rounded-full bg-primary/90 flex items-center justify-center text-white shadow-glow-primary scale-90 group-hover:scale-100 transition-transform">
                          <Play className="w-5 h-5 fill-white ml-0.5" />
                        </div>
                      </div>

                      <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono font-bold text-neutral-300 border border-white/10">
                        {totalDurationLabel}
                      </span>

                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3.5 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
                          {movie.title}
                        </h3>
                        {movie.rating && (
                          <span className="text-[11px] font-bold text-gold shrink-0">
                            ★ {Number(movie.rating).toFixed(1)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-neutral-400">
                        <span>
                          {item.season ? `Temporada ${item.season} · Ep. ${item.episode}` : (movie.mediaType === 'tv' ? 'Serie' : 'Película HD')}
                        </span>
                        <span className="text-neutral-300 font-semibold">{remainingLabel}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="w-1 h-5 bg-primary rounded-full inline-block" />
              <h2 className="text-xl font-bold text-white tracking-wide">En Cartelera Hoy · Cine en Casa</h2>
            </div>

            <div className="flex items-center gap-1 bg-surface-1/80 p-1 rounded-xl border border-white/10 backdrop-blur-md">
              {[
                { id: 'all', label: 'Todos' },
                { id: '4k', label: '4K UHD' },
                { id: 'dolby', label: 'Dolby Vision' },
                { id: 'today', label: 'Añadidas Hoy' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCarteleraFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    carteleraFilter === tab.id
                      ? 'bg-primary text-white shadow-glow-primary'
                      : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {carteleraItems.map((movie) => (
              <MovieCard key={movie.id || movie.tmdbId} movie={movie} />
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between mb-6">
            <div className="space-y-0.5">
              <p className="text-xs font-extrabold uppercase tracking-widest text-primary">
                LO MÁS VISTO EN LA PLATAFORMA
              </p>
              <div className="flex items-center gap-2">
                <span className="w-1 h-5 bg-primary rounded-full inline-block" />
                <h2 className="text-2xl font-black text-white tracking-tight">Top 10 en Tendencia Hoy</h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => scrollTop10('left')}
                className="p-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-white border border-white/10 transition-colors"
                title="Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollTop10('right')}
                className="p-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-white border border-white/10 transition-colors"
                title="Siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={top10Ref}
            className="flex items-center gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory"
          >
            {top10Items.map((item, idx) => {
              const rank = idx + 1
              const link = item.slug
                ? `/movie/${item.id}`
                : `/external/${item.tmdbId}?type=${item.mediaType || 'movie'}`
              const poster = getPosterUrl(item) || getBackdropUrl(item)

              return (
                <Link
                  key={item.id || item.tmdbId || idx}
                  to={link}
                  className="flex items-end shrink-0 snap-start group relative"
                >
                  <span
                    className="font-black text-8xl sm:text-9xl leading-none select-none tracking-tighter -mr-6 sm:-mr-8 z-0 transition-transform group-hover:scale-105 duration-300 font-mono text-neutral-700/60"
                    style={{
                      WebkitTextStroke: '2px rgba(255, 255, 255, 0.25)',
                    }}
                  >
                    {rank}
                  </span>

                  <div className="relative w-36 sm:w-44 aspect-[2/3] rounded-2xl overflow-hidden bg-surface-2 border border-white/10 shadow-xl z-10 group-hover:border-primary group-hover:scale-105 group-hover:shadow-glow-primary transition-all duration-300">
                    {poster ? (
                      <img
                        src={poster}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-8 h-8 text-neutral-600" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-primary text-white shadow-glow-primary">
                        TOP {rank}
                      </span>
                    </div>

                    <div className="absolute bottom-2.5 left-2.5 right-2.5">
                      <p className="text-xs font-bold text-white truncate drop-shadow-md">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        {item.mediaType === 'tv' ? 'Serie' : 'Película'} • ★ {item.rating ? Number(item.rating).toFixed(1) : '8.0'}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        <section className="rounded-sm bg-gradient-to-br from-surface-1/90 via-surface-2/60 to-black/90 border border-white/10 p-6 sm:p-10 relative overflow-hidden backdrop-blur-xl shadow-2xl">
          <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -top-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white border border-white/15 text-xs font-bold">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>EXPERIENCIA CINEMATOGRÁFICA DE ÚLTIMA GENERACIÓN</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                Transmisión sin pérdidas en{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-400">
                  4K HDR
                </span>{' '}
                y Audio Espacial 360°
              </h2>

              <p className="text-sm text-neutral-300 leading-relaxed font-normal">
                MJMovies utiliza tecnología nativa HLS/DASH con transcodificación adaptativa por hardware
                de ultra baja latencia y soporte completo para perfiles Dolby Vision, HDR10+ y audio multicanal
                lossless de alta fidelidad.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-sm bg-white/5 border border-white/10 flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-white">Dolby Vision IQ</p>
                    <p className="text-[10px] text-neutral-400">Calibración dinámica</p>
                  </div>
                </div>

                <div className="p-3 rounded-sm bg-white/5 border border-white/10 flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-white">Dolby Atmos 3D</p>
                    <p className="text-[10px] text-neutral-400">Inmersión espacial</p>
                  </div>
                </div>

                <div className="p-3 rounded-sm bg-white/5 border border-white/10 flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-white">Lossless Master</p>
                    <p className="text-[10px] text-neutral-400">96kHz / 24-bit audio</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 p-6 rounded-sm bg-surface-1/90 border border-white/15 shadow-2xl space-y-4 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Control Remoto Digital</h3>
                </div>
                <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  EN VIVO
                </span>
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed">
                Convierte tu teléfono inteligente en un mando a distancia para tu TV o pantalla de cine.
                Emparejamiento instantáneo por código PIN o QR vía WebSockets sin instalar aplicaciones extra.
              </p>

              <div className="space-y-2 pt-1 text-xs text-neutral-400">
                <div className="flex items-center justify-between py-1 border-b border-white/10">
                  <span>Latencia de respuesta:</span>
                  <span className="font-mono text-white font-bold">&lt; 15 ms</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/10">
                  <span>Sincronización multi-pantalla:</span>
                  <span className="text-emerald-400 font-bold">Activa</span>
                </div>
              </div>

              <Link
                to="/catalog"
                className="w-full py-3 rounded-sm bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center justify-center gap-2 shadow-glow-primary transition-all hover:scale-102 mt-2"
              >
                <MonitorPlay className="w-4 h-4" />
                <span>Explorar Catálogo en Calidad Máxima</span>
              </Link>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="w-1 h-5 bg-primary rounded-full inline-block" />
              <h2 className="text-xl font-bold text-white tracking-wide">Series en Tendencia</h2>
            </div>
            <Link
              to="/catalog?type=tv"
              className="text-xs font-bold text-neutral-400 hover:text-primary transition-colors flex items-center gap-1 group"
            >
              <span>Ver todas</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {trendingSeries.slice(0, 6).map((serie) => (
              <MovieCard key={serie.tmdbId || serie.id} movie={serie} />
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="w-1 h-5 bg-primary rounded-full inline-block" />
              <h2 className="text-xl font-bold text-white tracking-wide">Aclamadas por la Crítica</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {topRatedMovies.slice(0, 6).map((movie) => (
              <MovieCard key={movie.tmdbId || movie.id} movie={movie} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
