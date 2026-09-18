import React, { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import { useToastStore } from '../../stores/toastStore'

export default function StarRating({ movieId, initialRating = 0, title = 'Película', onRatingChange }) {
  const { success } = useToastStore()
  const [hoverRating, setHoverRating] = useState(0)
  const [userRating, setUserRating] = useState(0)
  const [currentAvg, setCurrentAvg] = useState(Number(initialRating) || 0)
  const [votesCount, setVotesCount] = useState(12)

  useEffect(() => {
    if (!movieId) return
    try {
      const saved = localStorage.getItem(`mjmovies_user_rating_${movieId}`)
      if (saved) {
        setUserRating(Number(saved))
      }
    } catch {}
  }, [movieId])

  useEffect(() => {
    if (initialRating) {
      setCurrentAvg(Number(initialRating))
    }
  }, [initialRating])

  const handleRate = (score) => {
    setUserRating(score)
    try {
      localStorage.setItem(`mjmovies_user_rating_${movieId}`, score.toString())
    } catch {}

    const newCount = userRating ? votesCount : votesCount + 1
    setVotesCount(newCount)
    const recalculated = ((currentAvg * votesCount + score) / (votesCount + 1)).toFixed(1)
    setCurrentAvg(Number(recalculated))

    if (onRatingChange) {
      onRatingChange(Number(recalculated))
    }

    success(`¡Calificaste "${title}" con ${score} estrellas! ★`)
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-2xl bg-surface-2/80 border border-white/10 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-gold/15 text-gold px-3 py-1 rounded-xl border border-gold/25 font-black text-sm">
          <Star className="w-4 h-4 fill-gold text-gold" />
          <span>{currentAvg.toFixed(1)}</span>
        </div>
        <div className="text-left leading-tight">
          <p className="text-xs font-bold text-white">Promedio de Estrellas</p>
          <p className="text-[10px] text-neutral-400">
            {userRating ? `Tu voto: ${userRating} ★` : 'Puntúa esta película'}
          </p>
        </div>
      </div>

      <div className="h-6 w-[1px] bg-white/10 hidden sm:block mx-1" />

      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => {
          const isFilled = (hoverRating || userRating) >= star
          return (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => handleRate(star)}
              className="p-0.5 hover:scale-125 transition-transform focus:outline-none"
              title={`Puntuar ${star} de 10 estrellas`}
            >
              <Star
                className={`w-4 h-4 transition-colors ${
                  isFilled
                    ? 'fill-gold text-gold drop-shadow-[0_0_6px_rgba(245,197,24,0.6)]'
                    : 'text-neutral-600 hover:text-neutral-400'
                }`}
              />
            </button>
          )
        })}
        <span className="text-[11px] font-bold text-neutral-300 ml-1.5 w-6 text-center">
          {hoverRating ? `${hoverRating}` : userRating ? `${userRating}` : ''}
        </span>
      </div>
    </div>
  )
}
