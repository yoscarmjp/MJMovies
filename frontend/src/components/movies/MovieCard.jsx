import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, Star, Film, Tv, Sparkles } from 'lucide-react'

export default function MovieCard({ movie, className = '' }) {
  const [imageError, setImageError] = useState(false)

  // Determinar ruta de detalle
  const movieRoute =
    movie.tmdbId && !movie.slug
      ? `/external/${movie.tmdbId}?type=${movie.mediaType || 'movie'}`
      : `/movie/${movie.id}`

  // Géneros normalizados
  const genreNames = movie.genres?.length
    ? movie.genres.map((g) => (typeof g === 'string' ? g : g.name || g.genre?.name)).filter(Boolean)
    : []

  // Proxy para TMDB
  const getPosterSrc = () => {
    if (imageError || !movie.posterUrl) return null
    if (movie.posterUrl.includes('image.tmdb.org')) {
      return `/api/external-movies/image-proxy?url=${encodeURIComponent(movie.posterUrl)}`
    }
    return movie.posterUrl
  }

  const posterSrc = getPosterSrc()
  const isTv = movie.mediaType === 'tv'

  return (
    <Link
      to={movieRoute}
      className={`group relative block rounded-2xl overflow-hidden aspect-[2/3] bg-surface-2 border border-white/5 shadow-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
      aria-label={`Ver ${movie.title}`}
    >
      {posterSrc ? (
        <img
          src={posterSrc}
          alt={`Póster de ${movie.title}`}
          loading="lazy"
          onError={() => setImageError(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-surface-2 text-neutral-600">
          {isTv ? <Tv className="w-12 h-12 opacity-30" /> : <Film className="w-12 h-12 opacity-30" />}
          <span className="text-xs mt-2 opacity-40 font-medium px-4 text-center line-clamp-2">
            {movie.title}
          </span>
        </div>
      )}

      {isTv ? (
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide bg-indigo-600/90 backdrop-blur-md text-white border border-indigo-400/30">
          <Tv className="w-3 h-3" />
          <span>SERIE</span>
        </div>
      ) : movie.featured ? (
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide bg-primary/90 backdrop-blur-md text-white border border-primary/30">
          <Sparkles className="w-3 h-3 text-amber-300" />
          <span>DESTACADA</span>
        </div>
      ) : null}

      {movie.rating ? (
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-black/75 backdrop-blur-md text-gold border border-gold/20">
          <Star className="w-3 h-3 fill-gold text-gold" />
          <span>{Number(movie.rating).toFixed(1)}</span>
        </div>
      ) : null}

      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 z-20">
        <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug drop-shadow-md">
          {movie.title}
        </h3>

        <div className="flex items-center gap-2 text-[11px] text-neutral-300 mt-1.5 font-medium">
          {(movie.year || movie.releaseDate) && (
            <span>{movie.year || movie.releaseDate?.slice(0, 4)}</span>
          )}
          {genreNames.length > 0 && (
            <>
              <span>•</span>
              <span className="truncate">{genreNames.slice(0, 2).join(', ')}</span>
            </>
          )}
        </div>

        <button
          tabIndex={-1}
          className="mt-3 w-full py-2 px-3 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-glow-primary"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          <span>Reproducir</span>
        </button>
      </div>
    </Link>
  )
}
