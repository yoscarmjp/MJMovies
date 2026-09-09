import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import api from '../services/api'
import MovieCard from '../components/movies/MovieCard'
import StarRating from '../components/movies/StarRating'
import { Play, Star, Calendar, Clock, Globe, Eye, Edit3, ArrowLeft, Film, Layers, ChevronRight } from 'lucide-react'

export default function MovieView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuthStore()

  const [movie, setMovie] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Series state
  const [isTv, setIsTv] = useState(false)
  const [seasonsCount, setSeasonsCount] = useState(1)
  const [activeSeason, setActiveSeason] = useState(1)
  const [episodes, setEpisodes] = useState([])
  const [loadingEpisodes, setLoadingEpisodes] = useState(false)

  const loadEpisodes = async (targetId, season) => {
    setLoadingEpisodes(true)
    try {
      const res = await api.get(`/external-movies/series/${targetId}/season/${season}`)
      setEpisodes(res.data.episodes || [])
    } catch (err) {
      console.warn('Error cargando episodios:', err)
    } finally {
      setLoadingEpisodes(false)
    }
  }

  const changeSeason = async (season) => {
    setActiveSeason(season)
    const streamRes = await api.get(`/stream/${id}?season=${season}`).catch(() => null)
    const targetId = streamRes?.data?.tmdbId || id
    await loadEpisodes(targetId, season)
  }

  useEffect(() => {
    const fetchMovie = async () => {
      setLoading(true)
      try {
        const [movieRes, streamRes] = await Promise.all([
          api.get(`/movies/${id}`),
          api.get(`/stream/${id}`).catch(() => null),
        ])

        const data = movieRes.data
        setMovie(data)
        document.title = `${data.title} — MJMovies`

        const isTvSeries =
          streamRes?.data?.isTv ||
          data.genres?.some((g) => g.genre?.slug === 'series' || g.slug === 'series')

        if (isTvSeries) {
          setIsTv(true)
          setSeasonsCount(streamRes?.data?.seasonsCount || 1)
          const targetId = streamRes?.data?.tmdbId || data.id
          await loadEpisodes(targetId, 1)
        }
      } catch (err) {
        setError(err.response?.status === 404 ? 'Película no encontrada' : 'Error al cargar los detalles')
      } finally {
        setLoading(false)
      }
    }

    fetchMovie()
  }, [id])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 pt-32 pb-24">
        <div className="aspect-[21/9] rounded-3xl skeleton" />
      </div>
    )
  }

  if (error || !movie) {
    return (
      <div className="max-w-xl mx-auto px-4 pt-44 pb-24 text-center">
        <Film className="w-14 h-14 text-neutral-500 mx-auto mb-4 opacity-50" />
        <h2 className="text-2xl font-bold text-white mb-2">{error || 'Película no encontrada'}</h2>
        <Link to="/catalog" className="inline-block mt-4 px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-glow-primary">
          Volver al catálogo
        </Link>
      </div>
    )
  }

  const backdrop = movie.backdropUrl || movie.posterUrl

  return (
    <div className="relative min-h-screen pb-24">
      {backdrop && (
        <div className="fixed inset-0 z-0 h-[65vh] overflow-hidden">
          <img
            src={backdrop}
            alt={movie.title}
            className="w-full h-full object-cover filter blur-sm brightness-40 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2/80 hover:bg-surface-3 text-xs font-semibold text-neutral-300 backdrop-blur-md border border-white/10"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver</span>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-10 items-start">
          <div className="aspect-[2/3] rounded-2xl overflow-hidden bg-surface-2 border border-white/10 shadow-2xl sticky top-28">
            <img
              src={movie.posterUrl || movie.backdropUrl}
              alt={movie.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            {movie.genres?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {movie.genres.map((g) => {
                  const name = g.name || g.genre?.name
                  const slug = g.slug || g.genre?.slug
                  return (
                    <Link
                      key={slug || name}
                      to={`/catalog?genre=${slug}`}
                      className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-neutral-300 transition-colors"
                    >
                      {name}
                    </Link>
                  )
                })}
              </div>
            )}

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4 leading-tight">
              {movie.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-300 font-medium mb-6">
              {movie.year && (
                <div className="flex items-center gap-1 bg-surface-2 px-2.5 py-1 rounded-md border border-white/5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{movie.year}</span>
                </div>
              )}
              {movie.duration && (
                <div className="flex items-center gap-1 bg-surface-2 px-2.5 py-1 rounded-md border border-white/5">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{Math.floor(movie.duration / 60)} min</span>
                </div>
              )}
              {movie.rating && (
                <div className="flex items-center gap-1 bg-gold/10 text-gold px-2.5 py-1 rounded-md border border-gold/20 font-bold">
                  <Star className="w-3.5 h-3.5 fill-gold" />
                  <span>{Number(movie.rating).toFixed(1)} / 10</span>
                </div>
              )}
              {movie.views && (
                <div className="flex items-center gap-1 bg-surface-2 px-2.5 py-1 rounded-md border border-white/5">
                  <Eye className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{movie.views.toLocaleString()} vistas</span>
                </div>
              )}
            </div>

            <div className="mb-6 max-w-lg">
              <StarRating
                movieId={movie.id}
                initialRating={movie.rating}
                title={movie.title}
                onRatingChange={(newRating) => setMovie((prev) => ({ ...prev, rating: newRating }))}
              />
            </div>

            <p className="text-neutral-300 text-sm sm:text-base leading-relaxed mb-6 max-w-3xl">
              {movie.description}
            </p>

            <div className="space-y-2 text-xs sm:text-sm mb-8">
              {movie.director && (
                <p>
                  <span className="text-neutral-400 font-semibold">Director: </span>
                  <span className="text-white font-medium">{movie.director}</span>
                </p>
              )}
              {movie.cast?.length > 0 && (
                <p>
                  <span className="text-neutral-400 font-semibold">Reparto: </span>
                  <span className="text-white font-medium">{movie.cast.slice(0, 6).join(', ')}</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-4 flex-wrap mb-10">
              <Link
                to={isTv ? `/watch/${movie.id}?season=1&episode=1&type=tv` : `/watch/${movie.id}`}
                className="px-7 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-sm flex items-center gap-2 shadow-glow-primary transition-all hover:scale-105"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{isTv ? 'Ver Temporada 1, Ep. 1' : 'Reproducir Película'}</span>
              </Link>

              {isAdmin && (
                <Link
                  to="/admin/movies"
                  className="px-5 py-3.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-white font-semibold text-sm flex items-center gap-2 border border-white/10 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Editar en Admin</span>
                </Link>
              )}
            </div>

            {isTv && (
              <div className="pt-8 border-t border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                    <Layers className="w-6 h-6 text-primary" />
                    <span>Temporadas y Capítulos</span>
                  </h2>
                  <span className="text-xs text-neutral-400 font-semibold">{episodes.length} capítulos</span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6">
                  {Array.from({ length: seasonsCount }).map((_, i) => {
                    const sNum = i + 1
                    return (
                      <button
                        key={sNum}
                        onClick={() => changeSeason(sNum)}
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                          activeSeason === sNum
                            ? 'bg-primary text-white shadow-glow-primary'
                            : 'bg-surface-2 text-neutral-400 hover:text-white hover:bg-surface-3 border border-white/5'
                        }`}
                      >
                        Temporada {sNum}
                      </button>
                    )
                  })}
                </div>

                {loadingEpisodes ? (
                  <div className="py-12 flex flex-col items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-2" />
                    <p className="text-xs text-neutral-400">Cargando capítulos...</p>
                  </div>
                ) : episodes.length > 0 ? (
                  <div className="space-y-3">
                    {episodes.map((ep) => (
                      <Link
                        key={ep.episodeNumber}
                        to={`/watch/${movie.id}?season=${activeSeason}&episode=${ep.episodeNumber}&type=tv`}
                        className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-surface-1/70 hover:bg-surface-2 border border-white/5 hover:border-primary/50 transition-all gap-4"
                      >
                        <div className="flex items-start sm:items-center gap-3.5">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary flex items-center justify-center text-primary group-hover:text-white transition-colors shrink-0 font-black text-xs">
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-neutral-400">Cap. {ep.episodeNumber}</span>
                              <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                                {ep.name}
                              </h3>
                            </div>
                            {ep.overview && (
                              <p className="text-xs text-neutral-400 line-clamp-2 mt-1 leading-relaxed max-w-2xl">
                                {ep.overview}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 text-xs text-neutral-400 font-medium">
                          {ep.runtime && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-neutral-400" />
                              {ep.runtime} min
                            </span>
                          )}
                          <span className="text-primary font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            <span>Ver en HD</span>
                            <ChevronRight className="w-4 h-4" />
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
