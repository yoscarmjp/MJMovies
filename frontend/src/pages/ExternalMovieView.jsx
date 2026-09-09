import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { Play, Star, Calendar, Clock, ArrowLeft, Film, Tv, Layers, ChevronRight } from 'lucide-react'

export default function ExternalMovieView() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const mediaType = searchParams.get('type') || 'movie'

  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Series state
  const [activeSeason, setActiveSeason] = useState(1)
  const [episodes, setEpisodes] = useState([])
  const [loadingEpisodes, setLoadingEpisodes] = useState(false)

  const loadEpisodes = async (season) => {
    setLoadingEpisodes(true)
    try {
      const res = await api.get(`/external-movies/series/${id}/season/${season}`)
      setEpisodes(res.data.episodes || [])
    } catch (err) {
      console.warn('Error cargando episodios de TMDB:', err)
    } finally {
      setLoadingEpisodes(false)
    }
  }

  const changeSeason = async (season) => {
    setActiveSeason(season)
    await loadEpisodes(season)
  }

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true)
      try {
        const res = await api.get(`/external-movies/${id}?type=${mediaType}`)
        const data = res.data
        setItem(data)
        document.title = `${data.title} — MJMovies`

        if (data.mediaType === 'tv') {
          await loadEpisodes(1)
        }
      } catch (err) {
        setError('No se pudo cargar el contenido. Intenta de nuevo.')
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [id, mediaType])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 pt-32 pb-24">
        <div className="aspect-[21/9] rounded-3xl skeleton" />
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="max-w-xl mx-auto px-4 pt-44 pb-24 text-center">
        <Film className="w-14 h-14 text-neutral-500 mx-auto mb-4 opacity-50" />
        <h2 className="text-2xl font-bold text-white mb-2">{error || 'Contenido no encontrado'}</h2>
        <Link to="/" className="inline-block mt-4 px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-glow-primary">
          Volver al inicio
        </Link>
      </div>
    )
  }

  const proxyUrl = (url) => {
    if (!url) return null
    if (url.includes('image.tmdb.org')) {
      return `/api/external-movies/image-proxy?url=${encodeURIComponent(url)}`
    }
    return url
  }

  const backdrop = proxyUrl(item.backdropUrl || item.posterUrl)
  const poster = proxyUrl(item.posterUrl)
  const isTv = item.mediaType === 'tv'
  const seasonsCount = item.seasons || 1

  return (
    <div className="relative min-h-screen pb-24">
      {backdrop && (
        <div className="fixed inset-0 z-0 h-[65vh] overflow-hidden">
          <img
            src={backdrop}
            alt={item.title}
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
              src={poster}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isTv ? 'bg-indigo-600 text-white' : 'bg-primary text-white'
                }`}>
                {isTv ? <Tv className="w-3.5 h-3.5" /> : <Film className="w-3.5 h-3.5" />}
                <span>{isTv ? 'Serie' : 'Película'}</span>
              </span>

              {item.genres?.map((g) => {
                const name = typeof g === 'string' ? g : g.name
                return (
                  <span
                    key={name}
                    className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-neutral-300"
                  >
                    {name}
                  </span>
                )
              })}
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-3">
              {item.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-300 font-medium mb-6">
              {(item.year || item.releaseDate) && (
                <div className="flex items-center gap-1 bg-surface-2 px-2.5 py-1 rounded-md border border-white/5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{item.year || item.releaseDate?.slice(0, 4)}</span>
                </div>
              )}
              {item.duration && !isTv && (
                <div className="flex items-center gap-1 bg-surface-2 px-2.5 py-1 rounded-md border border-white/5">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{Math.floor(item.duration / 60)} min</span>
                </div>
              )}
              {item.rating && (
                <div className="flex items-center gap-1 bg-gold/10 text-gold px-2.5 py-1 rounded-md border border-gold/20 font-bold">
                  <Star className="w-3.5 h-3.5 fill-gold" />
                  <span>{Number(item.rating).toFixed(1)} / 10</span>
                </div>
              )}
              {isTv && (
                <div className="flex items-center gap-1.5 bg-surface-2 px-2.5 py-1 rounded-md border border-white/5">
                  <Layers className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{seasonsCount} temporada{seasonsCount > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>

            <p className="text-neutral-300 text-sm sm:text-base leading-relaxed mb-6 max-w-3xl">
              {item.overview}
            </p>

            <div className="space-y-2 text-xs sm:text-sm mb-8">
              {item.director && (
                <p>
                  <span className="text-neutral-400 font-semibold">Director: </span>
                  <span className="text-white font-medium">{item.director}</span>
                </p>
              )}
              {item.cast?.length > 0 && (
                <p>
                  <span className="text-neutral-400 font-semibold">Reparto: </span>
                  <span className="text-white font-medium">{item.cast.slice(0, 6).join(', ')}</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-4 flex-wrap mb-10">
              <Link
                to={isTv ? `/watch/${item.tmdbId}?season=1&episode=1&type=tv` : `/watch/${item.tmdbId}?type=movie`}
                className="px-7 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-sm flex items-center gap-2 shadow-glow-primary transition-all hover:scale-105"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{isTv ? 'Ver Temporada 1, Ep. 1' : 'Reproducir Película'}</span>
              </Link>
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
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeSeason === sNum
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
                        to={`/watch/${item.tmdbId}?season=${activeSeason}&episode=${ep.episodeNumber}&type=tv`}
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
