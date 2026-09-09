import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import api from '../services/api'
import MovieCard from '../components/movies/MovieCard'
import { Play, Info, Star, ChevronRight, Tv, Sparkles, FolderHeart, Flame, Award, Clock } from 'lucide-react'

export default function HomeView() {
  const { isLoggedIn } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [loadingExternal, setLoadingExternal] = useState(true)

  const [localMovies, setLocalMovies] = useState([])
  const [genreSections, setGenreSections] = useState([])
  const [watchHistory, setWatchHistory] = useState([])

  const [trendingMovies, setTrendingMovies] = useState([])
  const [trendingSeries, setTrendingSeries] = useState([])
  const [topRatedMovies, setTopRatedMovies] = useState([])
  const [topRatedSeries, setTopRatedSeries] = useState([])

  // Hero: prefer local featured, then first trending
  const heroItem = useMemo(() => {
    const featured = localMovies.find((m) => m.featured)
    if (featured) return featured
    return trendingMovies[0] || trendingSeries[0] || null
  }, [localMovies, trendingMovies, trendingSeries])

  // Backdrop hero proxy for TMDB
  const heroBg = useMemo(() => {
    const url = heroItem?.backdropUrl || heroItem?.posterUrl
    if (!url) return null
    if (url.includes('image.tmdb.org')) {
      return `/api/external-movies/image-proxy?url=${encodeURIComponent(url)}`
    }
    return url
  }, [heroItem])

  useEffect(() => {
    // 1. Cargar catálogo local
    const loadLocal = async () => {
      try {
        const [moviesRes, genresRes] = await Promise.all([
          api.get('/movies?limit=12&sort=views&order=desc'),
          api.get('/movies/genres').catch(() => ({ data: { genres: [] } })),
        ])

        const movies = moviesRes.data.movies || []
        setLocalMovies(movies)

        // Agrupar por géneros
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

    // 2. Cargar catálogo externo (TMDB o fallback del backend)
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

    // 3. Cargar historial si está logueado
    const loadHistory = async () => {
      if (isLoggedIn) {
        try {
          const res = await api.get('/movies/user/history')
          setWatchHistory(res.data.history || [])
        } catch { }
      }
    }

    loadLocal()
    loadExternal()
    loadHistory()
  }, [isLoggedIn])

  const heroPlayLink = useMemo(() => {
    if (!heroItem) return '/'
    if (heroItem.slug) return `/watch/${heroItem.id}`
    return `/external/${heroItem.tmdbId}?type=${heroItem.mediaType || 'movie'}`
  }, [heroItem])

  const heroInfoLink = useMemo(() => {
    if (!heroItem) return '/'
    if (heroItem.slug) return `/movie/${heroItem.id}`
    return `/external/${heroItem.tmdbId}?type=${heroItem.mediaType || 'movie'}`
  }, [heroItem])

  return (
    <div className="pb-24 overflow-x-hidden">
      <section className="relative min-h-[75vh] lg:min-h-[85vh] flex items-center justify-start overflow-hidden">
        {heroBg ? (
          <div className="absolute inset-0 z-0">
            <img
              src={heroBg}
              alt={heroItem?.title}
              className="w-full h-full object-cover object-center filter brightness-75 scale-105 transition-transform duration-1000"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
          </div>
        ) : null}

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16 w-full">
          {heroItem ? (
            <div className="max-w-2xl animate-fade-in">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-primary text-white shadow-glow-primary">
                  {heroItem.mediaType === 'tv' ? (
                    <>
                      <Tv className="w-3.5 h-3.5" />
                      <span>Serie</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Destacada</span>
                    </>
                  )}
                </span>
                {(heroItem.year || heroItem.releaseDate) && (
                  <span className="text-xs font-semibold text-neutral-300">
                    {heroItem.year || heroItem.releaseDate?.slice(0, 4)}
                  </span>
                )}
                {heroItem.rating && (
                  <div className="flex items-center gap-1 text-xs font-bold text-gold">
                    <Star className="w-3.5 h-3.5 fill-gold" />
                    <span>{Number(heroItem.rating).toFixed(1)}</span>
                  </div>
                )}
              </div>

              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-none mb-4 drop-shadow-xl">
                {heroItem.title}
              </h1>

              <p className="text-sm sm:text-base text-neutral-300 line-clamp-3 mb-8 leading-relaxed font-normal drop-shadow-md">
                {heroItem.overview || heroItem.description}
              </p>

              <div className="flex items-center gap-4 flex-wrap">
                <Link
                  to={heroPlayLink}
                  className="px-6 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-bold flex items-center gap-2 shadow-glow-primary hover:scale-105 transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{heroItem.slug ? 'Reproducir' : 'Ver Detalles'}</span>
                </Link>

                <Link
                  to={heroInfoLink}
                  className="px-6 py-3.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white text-sm font-bold flex items-center gap-2 border border-white/20 transition-all hover:scale-105"
                >
                  <Info className="w-4 h-4" />
                  <span>Más información</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl space-y-4">
              <div className="w-24 h-6 rounded-full bg-white/10 skeleton" />
              <div className="w-96 h-12 rounded-xl bg-white/10 skeleton" />
              <div className="w-80 h-20 rounded-xl bg-white/10 skeleton" />
              <div className="flex gap-4">
                <div className="w-36 h-12 rounded-xl bg-white/10 skeleton" />
                <div className="w-36 h-12 rounded-xl bg-white/10 skeleton" />
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 -mt-6 relative z-20">
        {isLoggedIn && watchHistory.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <span>Continuar viendo</span>
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {watchHistory.map((item) => (
                <MovieCard key={item.movie?.id} movie={item.movie} />
              ))}
            </div>
          </section>
        )}

        {localMovies.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FolderHeart className="w-5 h-5 text-primary" />
                <span>Mi Biblioteca</span>
              </h2>
              <Link to="/catalog" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                <span>Ver todo</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {localMovies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-primary" />
              <span>Películas en Tendencia</span>
            </h2>
            <Link to="/catalog?type=movie" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              <span>Ver todas</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {loadingExternal ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-2xl skeleton" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {trendingMovies.map((movie) => (
                <MovieCard key={movie.tmdbId || movie.id} movie={movie} />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Tv className="w-5 h-5 text-primary" />
              <span>Series en Tendencia</span>
            </h2>
            <Link to="/catalog?type=tv" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              <span>Ver todas</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {loadingExternal ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-2xl skeleton" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {trendingSeries.map((serie) => (
                <MovieCard key={serie.tmdbId || serie.id} movie={serie} />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-gold fill-gold" />
              <span>Películas Mejor Calificadas</span>
            </h2>
          </div>
          {loadingExternal ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-2xl skeleton" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {topRatedMovies.map((movie) => (
                <MovieCard key={movie.tmdbId || movie.id} movie={movie} />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>Series Aclamadas por la Crítica</span>
            </h2>
          </div>
          {loadingExternal ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-2xl skeleton" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {topRatedSeries.map((serie) => (
                <MovieCard key={serie.tmdbId || serie.id} movie={serie} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
