import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, Star, Sparkles, Award, Film, Tv, Flame } from 'lucide-react'

export default function MovieCard({ movie, className = '' }) {
  const [imageError, setImageError] = useState(false)

  if (!movie) return null

  const isTv = movie.mediaType === 'tv'

  const movieRoute = isTv
    ? `/watch/${movie.id || movie.tmdbId}?season=1&episode=1&type=tv`
    : `/watch/${movie.id || movie.tmdbId}`

  const getPosterSrc = () => {
    if (imageError) return null
    let url = movie.posterUrl || movie.poster_path || movie.backdropUrl || movie.backdrop_path
    if (!url || typeof url !== 'string' || url.trim().length < 6) return null
    if (url.startsWith('/')) {
      url = `https://image.tmdb.org/t/p/w500${url}`
    }
    if (url.includes('image.tmdb.org')) {
      return `/api/external-movies/image-proxy?url=${encodeURIComponent(url)}`
    }
    return url
  }

  const posterSrc = getPosterSrc()

  if (imageError || !posterSrc) {
    return null
  }

  const getBadge = () => {
    if (isTv) return { label: 'SERIE VIP', color: 'bg-indigo-600/90 text-white' }
    const rating = Number(movie.rating || 0)
    if (rating >= 8.5) return { label: 'OSCAR® WINNER', color: 'bg-rose-600 text-white' }
    if (movie.featured) return { label: 'DESTACADA', color: 'bg-primary text-white' }
    if (rating >= 8.0) return { label: 'TOP 3 MEJOR', color: 'bg-amber-600 text-white' }
    if (movie.year >= 2023) return { label: 'NUEVO ÉXITO', color: 'bg-emerald-600 text-white' }
    return { label: 'EN CARTELERA', color: 'bg-neutral-800 text-neutral-200' }
  }

  const badge = getBadge()
  const year = movie.year || (movie.releaseDate ? movie.releaseDate.slice(0, 4) : '2024')
  const directorOrStudio = movie.director || (isTv ? 'HBO / Netflix' : 'Warner Bros / Universal')

  return (
    <Link
      to={movieRoute}
      data-nav-item="movie"
      className={`movie-card group relative flex flex-col rounded-sm overflow-hidden bg-surface-1/90 border border-white/10 hover:border-primary/60 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/20 focus:outline-none ${className}`}
      aria-label={`Ver ${movie.title}`}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-surface-2">
        <img
          src={posterSrc}
          alt=""
          loading="lazy"
          onError={() => setImageError(true)}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 z-10 pointer-events-none">
          <span className={`px-2 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-wider shadow-md ${badge.color}`}>
            {badge.label}
          </span>

          {movie.rating ? (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[11px] font-black bg-black/80 backdrop-blur-md text-gold border border-gold/30 shadow-md">
              <Star className="w-3 h-3 fill-gold text-gold" />
              <span>{Number(movie.rating).toFixed(1)}</span>
            </div>
          ) : null}
        </div>

        <div className="absolute top-8 left-2.5 z-10 pointer-events-none">
          <span className="px-1.5 py-0.5 rounded-sm text-[9px] font-extrabold tracking-tight bg-black/60 backdrop-blur-md text-neutral-300 border border-white/10 uppercase">
            {isTv ? '1080P PRO' : '4K ULTRA HD'}
          </span>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
          <div className="w-12 h-12 rounded-sm bg-primary/90 text-white flex items-center justify-center shadow-glow-primary group-hover:scale-110 transition-transform">
            <Play className="w-5 h-5 fill-white translate-x-0.5" />
          </div>
        </div>
      </div>

      <div className="p-3 bg-surface-1/95 flex flex-col justify-between flex-1 border-t border-white/5">
        <div>
          <h3 className="text-xs sm:text-sm font-black text-white truncate tracking-tight group-hover:text-primary transition-colors">
            {movie.title}
          </h3>

          <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-1 font-medium">
            <span className="truncate max-w-[130px]">
              {year} • {directorOrStudio}
            </span>
            <span className="text-[10px] text-neutral-500 font-bold uppercase shrink-0">
              Dolby Vision
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
