import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../services/api'
import MovieCard from '../components/movies/MovieCard'
import { Search, SlidersHorizontal, Film, Tv, LayoutGrid } from 'lucide-react'

export default function CatalogView() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [genres, setGenres] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const currentQuery = searchParams.get('q') || ''
  const currentType = searchParams.get('type') || ''
  const currentGenre = searchParams.get('genre') || ''

  const [searchInput, setSearchInput] = useState(currentQuery)

  // Cargar lista de géneros disponibles
  useEffect(() => {
    api.get('/movies/genres')
      .then((res) => setGenres(res.data.genres || []))
      .catch(() => {})
  }, [])

  // Cargar contenido según filtros
  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true)
      try {
        if (currentQuery) {
          // Búsqueda externa / combinada
          const res = await api.get('/external-movies/all/search', {
            params: { query: currentQuery, page },
          })
          setItems(res.data.results || res.data.movies || [])
          setTotalPages(res.data.totalPages || 1)
        } else if (currentType === 'tv') {
          const res = await api.get('/external-movies/series/popular', { params: { page } })
          setItems(res.data.series || [])
          setTotalPages(res.data.totalPages || 5)
        } else if (currentType === 'movie') {
          const res = await api.get('/external-movies/movies/popular', { params: { page } })
          setItems(res.data.movies || [])
          setTotalPages(res.data.totalPages || 5)
        } else {
          // Todo el catálogo local + destacados
          const res = await api.get('/movies', {
            params: { genre: currentGenre, page, limit: 18 },
          })
          setItems(res.data.movies || [])
          setTotalPages(res.data.pagination?.totalPages || 1)
        }
      } catch (err) {
        console.error('Error cargando catálogo:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCatalog()
  }, [currentQuery, currentType, currentGenre, page])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (searchInput.trim()) next.set('q', searchInput.trim())
      else next.delete('q')
      return next
    })
    setPage(1)
  }

  const setFilterType = (type) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (type) next.set('type', type)
      else next.delete('type')
      return next
    })
    setPage(1)
  }

  const setFilterGenre = (genreSlug) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (genreSlug) next.set('genre', genreSlug)
      else next.delete('genre')
      return next
    })
    setPage(1)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-24 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Catálogo Completo
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Explora todas las películas, series y producciones disponibles.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="relative max-w-md w-full">
          <input
            type="text"
            placeholder="Buscar por título, reparto, director..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-surface-2/90 border border-white/15 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary backdrop-blur-md"
          />
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </form>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-2xl bg-surface-1 border border-white/10 mb-8">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setFilterType('')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              !currentType ? 'bg-primary text-white shadow-glow-primary' : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Todos</span>
          </button>

          <button
            onClick={() => setFilterType('movie')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentType === 'movie' ? 'bg-primary text-white shadow-glow-primary' : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Películas</span>
          </button>

          <button
            onClick={() => setFilterType('tv')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentType === 'tv' ? 'bg-primary text-white shadow-glow-primary' : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Series</span>
          </button>
        </div>

        {genres.length > 0 && !currentType && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 font-medium">Género:</span>
            <select
              value={currentGenre}
              onChange={(e) => setFilterGenre(e.target.value)}
              className="bg-surface-2 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
            >
              <option value="">Todos los géneros</option>
              {genres.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-2xl skeleton" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
          {items.map((item) => (
            <MovieCard key={item.tmdbId || item.id} movie={item} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-surface-1/50 rounded-2xl border border-white/5">
          <Film className="w-16 h-16 mx-auto text-neutral-600 mb-4" />
          <h3 className="text-lg font-bold text-white mb-1">No se encontraron resultados</h3>
          <p className="text-sm text-neutral-400">Prueba con otros términos de búsqueda o filtros.</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-12">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 disabled:opacity-30 text-xs font-bold text-white border border-white/10 transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-xs font-semibold text-neutral-400">
            Página {page} de {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 disabled:opacity-30 text-xs font-bold text-white border border-white/10 transition-colors"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}
