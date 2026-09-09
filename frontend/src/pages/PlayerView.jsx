import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import Hls from 'hls.js'
import api from '../services/api'
import { useToastStore } from '../stores/toastStore'
import { useTvRemote } from '../context/TvRemoteContext'
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  ArrowLeft,
  Settings,
  List,
  Check,
  Smartphone,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Star,
  Activity,
  Zap,
  Download,
  FastForward,
  Film,
  Globe,
} from 'lucide-react'

export default function PlayerView() {
  const { info: toastInfo } = useToastStore()
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // URL Params
  const querySeason = parseInt(searchParams.get('season') || '1', 10)
  const queryEpisode = parseInt(searchParams.get('episode') || '1', 10)
  const queryType = searchParams.get('type') || ''

  // Content state
  const [movie, setMovie] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Series & Servers
  const [isTv, setIsTv] = useState(false)
  const [currentTmdbId, setCurrentTmdbId] = useState(null)
  const [currentSeason, setCurrentSeason] = useState(querySeason)
  const [currentEpisode, setCurrentEpisode] = useState(queryEpisode)
  const [totalSeasons, setTotalSeasons] = useState(1)
  const [servers, setServers] = useState([])
  const [activeServer, setActiveServer] = useState(null)
  const [showServerMenu, setShowServerMenu] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('es')
  const [showLangMenu, setShowLangMenu] = useState(false)

  // Episodes Modal & List
  const [showEpisodesModal, setShowEpisodesModal] = useState(false)
  const [loadingEpisodes, setLoadingEpisodes] = useState(false)
  const [episodesList, setEpisodesList] = useState([])
  const [embedStarted, setEmbedStarted] = useState(false)

  // Native Video Player State
  const videoRef = useRef(null)
  const playerContainerRef = useRef(null)
  const hlsRef = useRef(null)
  const controlsTimeoutRef = useRef(null)
  const savedProgressRef = useRef(0)
  const hasResumedRef = useRef(false)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [bufferedPercent, setBufferedPercent] = useState(100)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [playbackRate, setPlaybackRate] = useState(1.0)

  // Remote Control State from Global Context
  const {
    pairingCode,
    qrCode: pairingQrCode,
    remoteConnected,
    sendPlayerState,
    serverUrl,
  } = useTvRemote()
  const [showPairingPanel, setShowPairingPanel] = useState(false)

  const showControls = useCallback(() => {
    setControlsVisible(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showEpisodesModal && !showServerMenu && !showLangMenu && !showPairingPanel) {
        setControlsVisible(false)
      }
    }, 4000)
  }, [isPlaying, showEpisodesModal, showServerMenu, showLangMenu, showPairingPanel])

  // Fetch episodes for a given season
  const fetchEpisodes = async (season, targetId) => {
    setLoadingEpisodes(true)
    try {
      const tid = targetId || currentTmdbId || id
      const res = await api.get(`/external-movies/series/${tid}/season/${season}`)
      setEpisodesList(res.data.episodes || [])
    } catch (err) {
      console.warn('Error cargando episodios:', err)
      setEpisodesList(
        Array.from({ length: 8 }).map((_, i) => ({
          episodeNumber: i + 1,
          name: `Capítulo ${i + 1}`,
          runtime: 50,
          overview: `Episodio ${i + 1} de la temporada ${season}`,
        }))
      )
    } finally {
      setLoadingEpisodes(false)
    }
  }

  // Apply playback resume position cleanly
  const applyResume = useCallback((vid) => {
    const video = vid || videoRef.current
    if (!video || !savedProgressRef.current || savedProgressRef.current <= 5) return
    if (hasResumedRef.current) return

    const target = savedProgressRef.current
    const dur = video.duration || 0
    const safeTarget = dur > 15 && isFinite(dur) ? Math.min(target, Math.max(0, dur - 10)) : target

    try {
      video.currentTime = safeTarget
      hasResumedRef.current = true
      const m = Math.floor(safeTarget / 60)
      const s = Math.floor(safeTarget % 60)
      toastInfo(`Reanudando reproducción desde ${m}:${s < 10 ? '0' : ''}${s}`)
    } catch (err) {
      console.warn('Error applying resume:', err)
    }
  }, [toastInfo])

  useEffect(() => {
    const loadContent = async () => {
      setLoading(true)
      setError(null)
      hasResumedRef.current = false
      savedProgressRef.current = 0

      try {
        const streamRes = await api.get(`/stream/${id}`, {
          params: {
            season: currentSeason,
            episode: currentEpisode,
            type: queryType,
            lang: selectedLanguage,
          },
        })

        const sData = streamRes.data
        const servs = sData.servers || []
        setServers(servs)
        setIsTv(sData.isTv || sData.mediaType === 'tv')
        setTotalSeasons(sData.seasonsCount || 1)
        setCurrentTmdbId(sData.tmdbId)

        const defaultServ = servs.find((s) => s.isRecommended) || servs[0]
        setActiveServer(defaultServ)

        // 2. Obtener metadatos
        let mData = null
        try {
          const mRes = await api.get(`/movies/${id}`)
          mData = mRes.data
        } catch {
          try {
            const extRes = await api.get(`/external-movies/${id}?type=${sData.isTv ? 'tv' : 'movie'}`)
            mData = extRes.data
          } catch {
            mData = { title: sData.title || 'Película', id }
          }
        }

        setMovie(mData)
        document.title = `${mData.title} — MJMovies`

        // Check saved progress
        const queryT = parseInt(searchParams.get('t') || '0', 10)
        let localT = 0
        try {
          const raw = localStorage.getItem(`mjmovies_progress_${id}`)
          if (raw) localT = JSON.parse(raw).position || 0
        } catch {}

        const bestProgress = (queryT > 0 ? queryT : 0) || mData?.progress || localT || 0
        if (bestProgress > 5) {
          savedProgressRef.current = bestProgress
        }

        // 3. Cargar episodios si es serie
        if (sData.isTv || sData.mediaType === 'tv') {
          await fetchEpisodes(currentSeason, sData.tmdbId)
        }
      } catch (err) {
        console.error('Error cargando reproductor:', err)
        setError('No se pudo cargar la película o serie.')
      } finally {
        setLoading(false)
      }
    }

    loadContent()
  }, [id])

  const saveProgress = useCallback((pos, dur) => {
    if (!pos || pos < 5) return
    const posSec = Math.floor(pos)
    const durSec = Math.floor(dur || duration || (movie?.duration ? Number(movie.duration) : 5400))

    const record = {
      id,
      movieId: id,
      position: posSec,
      duration: durSec,
      updatedAt: new Date().toISOString(),
      title: movie?.title || 'Película',
      posterUrl: movie?.posterUrl,
      backdropUrl: movie?.backdropUrl,
      mediaType: isTv ? 'tv' : 'movie',
      season: currentSeason,
      episode: currentEpisode,
    }

    try {
      localStorage.setItem(`mjmovies_progress_${id}`, JSON.stringify(record))

      const raw = localStorage.getItem('mjmovies_recent_history') || '[]'
      let list = JSON.parse(raw)
      list = list.filter((item) => (item.id || item.movieId) !== id)
      list.unshift(record)
      localStorage.setItem('mjmovies_recent_history', JSON.stringify(list.slice(0, 30)))
    } catch {}

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    if (isUuid) {
      api.post(`/movies/${id}/progress`, { position: posSec }).catch(() => {})
    }
  }, [id, movie, duration, isTv, currentSeason, currentEpisode])

  useEffect(() => {
    if (activeServer?.type === 'hls' && videoRef.current) {
      const video = videoRef.current
      const url = activeServer.url || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
      const isHlsUrl = url.includes('.m3u8')
      const mp4Fallback = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'

      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }

      if (isHlsUrl && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
          capLevelToPlayerSize: true,
          startPosition: savedProgressRef.current > 5 ? savedProgressRef.current : -1,
        })
        hlsRef.current = hls
        hls.loadSource(url)
        hls.attachMedia(video)

        const selectPreferredAudio = (lang = selectedLanguage) => {
          if (hls.audioTracks && hls.audioTracks.length > 0) {
            const isEn = lang === 'en'
            const targetIdx = hls.audioTracks.findIndex((t) => {
              const l = (t.lang || '').toLowerCase()
              const n = (t.name || '').toLowerCase()
              if (isEn) {
                return l.startsWith('en') || n.includes('eng') || n.includes('orig')
              }
              return (
                l.startsWith('es') ||
                l.startsWith('spa') ||
                n.includes('esp') ||
                n.includes('lat') ||
                n.includes('cast')
              )
            })
            if (targetIdx !== -1 && hls.audioTrack !== targetIdx) {
              hls.audioTrack = targetIdx
            }
          }
        }

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          selectPreferredAudio()
          applyResume(video)
          video.play().catch(() => setIsPlaying(false))
        })

        hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
          selectPreferredAudio()
        })

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad()
                break
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError()
                break
              default:
                hls.destroy()
                hlsRef.current = null
                video.src = mp4Fallback
                video.play().catch(() => setIsPlaying(false))
            }
          }
        })
      } else {
        video.src = isHlsUrl ? url : (url || mp4Fallback)
        applyResume(video)
        video.play().catch(() => setIsPlaying(false))
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [activeServer, applyResume])

  // Periodic progress saving interval
  useEffect(() => {
    const timer = setInterval(() => {
      if (videoRef.current && isPlaying) {
        saveProgress(videoRef.current.currentTime, videoRef.current.duration)
      } else if (activeServer?.type === 'embed') {
        savedProgressRef.current = (savedProgressRef.current || 0) + 5
        saveProgress(savedProgressRef.current, movie?.duration || 5400)
      }
    }, 5000)
    return () => clearInterval(timer)
  }, [isPlaying, activeServer, saveProgress, movie])

  // Save on unload / leave
  useEffect(() => {
    const handleUnload = () => {
      if (videoRef.current) {
        saveProgress(videoRef.current.currentTime, videoRef.current.duration)
      }
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => {
      handleUnload()
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [saveProgress])

  // Change Episode
  const changeEpisode = async (newEpisodeNum, targetSeason = currentSeason, targetLang = selectedLanguage) => {
    if (newEpisodeNum < 1) return
    setCurrentEpisode(newEpisodeNum)
    if (targetSeason !== currentSeason) {
      setCurrentSeason(targetSeason)
    }

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('season', targetSeason)
      next.set('episode', newEpisodeNum)
      return next
    })

    try {
      const res = await api.get(`/stream/${id}`, {
        params: {
          season: targetSeason,
          episode: newEpisodeNum,
          type: isTv ? 'tv' : 'movie',
          lang: targetLang,
        },
      })
      const servs = res.data.servers || []
      setServers(servs)

      const matching = servs.find((s) => s.id === activeServer?.id) || servs[0]
      setActiveServer(matching)
      setEmbedStarted(true)
    } catch (err) {
      console.error('Error cambiando de capítulo:', err)
    }
  }

  // Change Season
  const onSelectSeason = async (season) => {
    setCurrentSeason(season)
    setCurrentEpisode(1)
    await fetchEpisodes(season)
    await changeEpisode(1, season, selectedLanguage)
  }

  // Change Language (Español / Inglés)
  const handleLanguageChange = async (newLang) => {
    setSelectedLanguage(newLang)
    setShowLangMenu(false)
    toastInfo(newLang === 'en' ? 'Cambiando a Servidores en Inglés...' : 'Cambiando a Servidores en Español Latino...')

    try {
      const res = await api.get(`/stream/${id}`, {
        params: {
          season: currentSeason,
          episode: currentEpisode,
          type: isTv ? 'tv' : 'movie',
          lang: newLang,
        },
      })
      const servs = res.data.servers || []
      setServers(servs)

      const best = servs.find((s) => s.isRecommended) || servs[0]
      setActiveServer(best)
      setEmbedStarted(false)

      // Si es reproductor nativo HLS, cambiar pista de audio activa
      if (hlsRef.current?.audioTracks?.length > 0) {
        const isEn = newLang === 'en'
        const idx = hlsRef.current.audioTracks.findIndex((t) => {
          const l = (t.lang || '').toLowerCase()
          const n = (t.name || '').toLowerCase()
          if (isEn) {
            return l.startsWith('en') || n.includes('eng') || n.includes('orig')
          }
          return (
            l.startsWith('es') ||
            l.startsWith('spa') ||
            n.includes('esp') ||
            n.includes('lat') ||
            n.includes('cast')
          )
        })
        if (idx !== -1) {
          hlsRef.current.audioTrack = idx
        }
      }
    } catch (err) {
      console.error('Error al cambiar de idioma:', err)
    }
  }

  // Native Controls Handlers
  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch(() => {})
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  const seekRelative = (seconds) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds))
    toastInfo(seconds > 0 ? `+${seconds}s` : `${seconds}s`)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setIsMuted(video.muted)
  }

  const toggleFullscreen = () => {
    const el = playerContainerRef.current
    if (!document.fullscreenElement) {
      el?.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  const cycleSpeed = () => {
    const speeds = [1.0, 1.25, 1.5, 2.0]
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length
    const next = speeds[nextIdx]
    setPlaybackRate(next)
    if (videoRef.current) videoRef.current.playbackRate = next
    toastInfo(`Velocidad: ${next}x`)
  }

  // Sincronizar estado de reproducción hacia el control remoto móvil
  useEffect(() => {
    sendPlayerState({
      playing: isPlaying,
      position: currentTime,
      duration: duration || (movie?.duration ? Number(movie.duration) : 5400),
      volume: isMuted ? 0 : volume,
      title: movie?.title || 'MJMovies Player',
    })
  }, [isPlaying, currentTime, duration, volume, isMuted, movie, sendPlayerState])

  // Escuchar comandos del control remoto móvil
  useEffect(() => {
    const handleRemoteCommand = (e) => {
      const { command, payload } = e.detail || {}

      if (command === 'play') {
        setEmbedStarted(true)
        if (videoRef.current) {
          videoRef.current.play().catch(() => {})
          setIsPlaying(true)
        }
        return
      }

      if (command === 'select' && (!videoRef.current || activeServer?.type === 'embed')) {
        setEmbedStarted(true)
        return
      }

      if (command === 'back') {
        if (showEpisodesModal) {
          setShowEpisodesModal(false)
        } else if (showServerMenu) {
          setShowServerMenu(false)
        } else if (showLangMenu) {
          setShowLangMenu(false)
        } else if (showPairingPanel) {
          setShowPairingPanel(false)
        } else {
          navigate(-1)
        }
        return
      }

      const video = videoRef.current
      if (!video) return

      switch (command) {
        case 'pause':
          video.pause()
          setIsPlaying(false)
          break
        case 'select':
          if (video.paused) {
            video.play().catch(() => {})
            setIsPlaying(true)
          } else {
            video.pause()
            setIsPlaying(false)
          }
          break
        case 'seek':
          seekRelative(payload?.value || 10)
          break
        case 'seekTo':
          if (typeof payload?.position === 'number') {
            video.currentTime = payload.position
            setCurrentTime(payload.position)
          }
          break
        case 'volume':
          const newVol = Math.max(0, Math.min(1, video.volume + (payload?.value || 0.1)))
          video.volume = newVol
          setVolume(newVol)
          setIsMuted(false)
          break
        case 'toggleMute':
          toggleMute()
          break
        case 'fullscreen':
          toggleFullscreen()
          break
        default:
          break
      }
    }

    window.addEventListener('mjmovies:remote_command', handleRemoteCommand)
    return () => {
      window.removeEventListener('mjmovies:remote_command', handleRemoteCommand)
    }
  }, [showEpisodesModal, showServerMenu, showLangMenu, showPairingPanel, activeServer, navigate, seekRelative, toggleMute, toggleFullscreen])

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const currentEpisodeObj = episodesList.find((e) => e.episodeNumber === currentEpisode)
  const isLastEpisode = episodesList.length > 0 && currentEpisode >= Math.max(...episodesList.map((e) => e.episodeNumber))

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-full border-3 border-primary border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-semibold text-neutral-400">Iniciando transmisiones de alta fidelidad...</p>
      </div>
    )
  }

  if (error || !movie) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-white p-4 text-center">
        <AlertTriangle className="w-14 h-14 text-amber-400 mb-4 mx-auto" />
        <h2 className="text-xl font-bold mb-3">{error}</h2>
        <button
          onClick={() => navigate('/catalog')}
          className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-glow-primary"
        >
          Volver a Cartelera
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-white pt-24 pb-28 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {(showServerMenu || showLangMenu) && (
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => {
              setShowServerMenu(false)
              setShowLangMenu(false)
            }}
          />
        )}

        <div className="relative z-50 flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-sm bg-surface-1/90 border border-white/10 backdrop-blur-2xl shadow-xl">
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              data-nav-item="back-to-catalog"
              onClick={() => navigate('/catalog')}
              className="px-3.5 py-2 rounded-sm bg-white/10 hover:bg-white/20 text-xs font-bold text-white border border-white/15 backdrop-blur-md flex items-center gap-2 transition-all shrink-0 hover:scale-105"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a Cartelera</span>
            </button>

            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-black text-white truncate flex items-center gap-2">
                <span>{movie.title}</span>
                {isTv && (
                  <span className="text-neutral-400 font-semibold text-xs truncate">
                    • T{currentSeason}:E{currentEpisode} {currentEpisodeObj?.name ? `"${currentEpisodeObj.name}"` : ''}
                  </span>
                )}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {isTv && (
              <button
                type="button"
                data-nav-item="open-episodes-modal"
                onClick={() => setShowEpisodesModal(true)}
                className="px-3.5 py-1.5 rounded-sm bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-glow-primary flex items-center gap-1.5 transition-all hover:scale-105 focus:ring-2 focus:ring-primary"
              >
                <List className="w-3.5 h-3.5" />
                <span>Temporadas & Episodios</span>
              </button>
            )}

            <button
              type="button"
              data-nav-item="pairing-btn"
              onClick={() => setShowPairingPanel(!showPairingPanel)}
              className="p-2 rounded-sm bg-white/10 hover:bg-white/20 text-white border border-white/15 backdrop-blur-md transition-colors"
              title="Vincular Control Remoto"
            >
              <Smartphone className={`w-4 h-4 ${remoteConnected ? 'text-emerald-400' : 'text-white'}`} />
            </button>
          </div>
        </div>

  
        <div
          ref={playerContainerRef}
          className="relative z-0 aspect-video w-full rounded-sm overflow-hidden bg-black border border-white/15 shadow-2xl group"
          onMouseMove={showControls}
          onTouchStart={showControls}
        >
          {activeServer?.type === 'embed' ? (
            <div className="w-full h-full relative">
              <iframe
                key={`${activeServer?.id || 'server'}-${selectedLanguage}-${currentSeason}-${currentEpisode}`}
                src={
                  savedProgressRef.current > 5 && activeServer.url
                    ? `${activeServer.url}${activeServer.url.includes('?') ? '&' : '?'}start=${Math.floor(
                        savedProgressRef.current
                      )}&t=${Math.floor(savedProgressRef.current)}`
                    : activeServer.url
                }
                className="w-full h-full border-0 block"
                allowFullScreen
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                referrerPolicy="no-referrer"
                title="Reproductor MJMovies"
              />
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                onClick={togglePlay}
                onTimeUpdate={() => {
                  if (videoRef.current) {
                    setCurrentTime(videoRef.current.currentTime)
                    if (videoRef.current.buffered.length > 0) {
                      setBufferedPercent(
                        (videoRef.current.buffered.end(videoRef.current.buffered.length - 1) /
                          videoRef.current.duration) *
                          100
                      )
                    }
                  }
                }}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    setDuration(videoRef.current.duration || 0)
                    applyResume(videoRef.current)
                  }
                }}
                onCanPlay={() => {
                  if (videoRef.current) applyResume(videoRef.current)
                }}
                onPlay={() => {
                  setIsPlaying(true)
                  if (videoRef.current) applyResume(videoRef.current)
                }}
                onPause={() => {
                  setIsPlaying(false)
                  if (videoRef.current) {
                    saveProgress(videoRef.current.currentTime, videoRef.current.duration)
                  }
                }}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => setIsBuffering(false)}
                onEnded={() => {
                  setIsPlaying(false)
                  if (isTv && !isLastEpisode) changeEpisode(currentEpisode + 1)
                }}
                playsInline
              />

              {!isPlaying && !isBuffering && (
                <button
                  type="button"
                  data-nav-item="player-play"
                  onClick={togglePlay}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer z-20 focus:outline-none"
                  aria-label="Reproducir"
                >
                  <div className="w-20 h-20 rounded-sm bg-primary hover:scale-110 transition-transform flex items-center justify-center text-white shadow-glow-primary-lg">
                    <Play className="w-8 h-8 fill-white ml-1" />
                  </div>
                </button>
              )}

              {isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <div className="w-14 h-14 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                </div>
              )}

              <button
                onClick={() => seekRelative(85)}
                className="absolute bottom-20 right-6 z-40 px-4 py-2 rounded-sm bg-black/80 hover:bg-black/95 text-white text-xs font-bold border border-white/25 backdrop-blur-xl shadow-2xl flex items-center gap-2 hover:scale-105 transition-all"
              >
                <FastForward className="w-3.5 h-3.5 text-primary" />
                <span>Saltar Introducción (+85s)</span>
              </button>

              <div
                className={`absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-30 transition-all duration-300 ${
                  controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                }`}
              >
                <div
                  onClick={(e) => {
                    if (videoRef.current && duration) {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const pos = (e.clientX - rect.left) / rect.width
                      videoRef.current.currentTime = pos * duration
                    }
                  }}
                  className="relative h-1.5 hover:h-2.5 bg-white/20 rounded-full cursor-pointer transition-all mb-4 group/bar"
                >
                  <div
                    style={{ width: `${bufferedPercent}%` }}
                    className="absolute inset-y-0 left-0 bg-white/30 rounded-full"
                  />
                  <div
                    style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                    className="absolute inset-y-0 left-0 bg-primary rounded-full shadow-glow-primary"
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full scale-0 group-hover/bar:scale-100 transition-transform shadow-md" />
                  </div>
                </div>

                <div className="flex items-center justify-between text-white flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <button onClick={togglePlay} className="hover:text-primary transition-colors">
                      {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
                    </button>
                    <button onClick={() => seekRelative(-10)} className="hover:text-primary transition-colors">
                      <RotateCcw className="w-5 h-5" />
                    </button>
                    <button onClick={() => seekRelative(10)} className="hover:text-primary transition-colors">
                      <RotateCw className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-2 ml-2">
                      <button onClick={toggleMute} className="hover:text-primary transition-colors">
                        {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={volume}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value)
                          setVolume(val)
                          if (videoRef.current) {
                            videoRef.current.volume = val
                            videoRef.current.muted = val === 0
                            setIsMuted(val === 0)
                          }
                        }}
                        className="w-16 h-1 accent-primary bg-white/20 rounded-lg cursor-pointer"
                      />
                    </div>

                    <span className="text-xs text-neutral-300 font-medium ml-2">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  {isTv && (
                    <div className="flex items-center gap-2 bg-surface-2/90 border border-white/10 px-3 py-1 rounded-sm backdrop-blur-md">
                      <button
                        type="button"
                        data-nav-item="player-prev-ep"
                        disabled={currentEpisode <= 1}
                        onClick={() => changeEpisode(currentEpisode - 1)}
                        className="text-xs font-bold text-neutral-300 hover:text-white disabled:opacity-30 p-1 rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        ‹ Anterior
                      </button>
                      <span className="px-2.5 py-0.5 rounded-sm bg-primary text-white text-[11px] font-black">
                        T{currentSeason}:E{currentEpisode}
                      </span>
                      <button
                        type="button"
                        data-nav-item="player-next-ep"
                        disabled={isLastEpisode}
                        onClick={() => changeEpisode(currentEpisode + 1)}
                        className="text-xs font-bold text-neutral-300 hover:text-white disabled:opacity-30 p-1 rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        Siguiente ›
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      data-nav-item="player-speed"
                      onClick={cycleSpeed}
                      className="px-2 py-0.5 rounded-sm bg-white/10 hover:bg-white/20 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {playbackRate}x
                    </button>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-sm bg-primary text-white">
                      4K / HDR
                    </span>
                    <button
                      type="button"
                      data-nav-item="player-fullscreen"
                      onClick={toggleFullscreen}
                      className="hover:text-primary transition-colors focus:outline-none focus:ring-1 focus:ring-primary p-1 rounded-sm"
                    >
                      {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {isTv && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                  <span className="w-2 h-6 bg-primary rounded-full inline-block" />
                  <span>Capítulos de la Temporada {currentSeason}</span>
                  <span className="text-sm font-semibold text-neutral-400">
                    ({episodesList.length} Episodios)
                  </span>
                </h2>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {Array.from({ length: totalSeasons }).map((_, i) => {
                  const sNum = i + 1
                  return (
                    <button
                      key={sNum}
                      type="button"
                      data-nav-item="season-selector"
                      onClick={() => onSelectSeason(sNum)}
                      className={`px-4 py-1.5 rounded-sm text-xs font-bold transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-primary ${
                        currentSeason === sNum
                          ? 'bg-primary text-white shadow-glow-primary'
                          : 'bg-surface-1 hover:bg-surface-2 text-neutral-400 hover:text-white border border-white/10'
                      }`}
                    >
                      {sNum === 1 ? 'Temporada 1' : `T${sNum}`}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {episodesList.map((ep) => {
                const isActive = ep.episodeNumber === currentEpisode
                const thumb = ep.stillPath
                  ? (ep.stillPath.startsWith('http') ? ep.stillPath : `https://image.tmdb.org/t/p/w500${ep.stillPath}`)
                  : (movie.backdropUrl || movie.posterUrl)

                return (
                  <button
                    key={ep.episodeNumber}
                    type="button"
                    data-nav-item="episode-card"
                    onClick={() => changeEpisode(ep.episodeNumber)}
                    className={`group relative text-left w-full rounded-sm overflow-hidden p-3 bg-surface-1/80 border transition-all cursor-pointer hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary ${
                      isActive
                        ? 'border-primary shadow-glow-primary/40 bg-surface-2'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="relative aspect-video rounded-sm overflow-hidden bg-surface-3 mb-3">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={ep.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-surface-3">
                          <Film className="w-8 h-8 text-neutral-600" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-10 h-10 rounded-sm bg-primary text-white flex items-center justify-center shadow-lg">
                          <Play className="w-4 h-4 fill-white ml-0.5" />
                        </div>
                      </div>

                      <div className="absolute top-2 left-2">
                        {isActive ? (
                          <span className="px-2 py-0.5 rounded-sm text-[10px] font-black uppercase bg-primary text-white shadow-glow-primary animate-pulse">
                            REPRODUCIENDO
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-sm text-[10px] font-extrabold uppercase bg-black/70 text-neutral-300 border border-white/15">
                            EPISODIO {ep.episodeNumber}
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-sm bg-black/80 text-[10px] font-bold text-neutral-300">
                        {ep.runtime ? `${ep.runtime} min` : '50 min'}
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
                      {ep.episodeNumber}. {ep.name}
                    </h4>
                    <p className="text-xs text-neutral-400 line-clamp-2 mt-1 leading-relaxed">
                      {ep.overview || `Capítulo ${ep.episodeNumber} de la temporada ${currentSeason}.`}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
          <div className="lg:col-span-8 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap text-xs font-bold text-neutral-300">
                {movie.rating && (
                  <div className="flex items-center gap-1 text-gold">
                    <Star className="w-4 h-4 fill-gold text-gold" />
                    <span className="font-black text-sm text-white">{Number(movie.rating).toFixed(1)}</span>
                  </div>
                )}
                <span>{movie.year || '2024'}</span>
                <span className="px-1.5 py-0.5 rounded border border-neutral-600 text-[11px] font-extrabold text-neutral-300">
                  TV-MA / 18+
                </span>
                <span>
                  {movie.genres?.map((g) => g.name || g).join(', ') || 'Ciencia Ficción, Terror, Drama'}
                </span>
              </div>

              <p className="text-sm sm:text-base text-neutral-300 leading-relaxed max-w-3xl">
                {movie.overview || movie.description || 'Una obra cinematográfica imprescindible en streaming de alta calidad.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 font-mono">
                  CREADORES
                </span>
                <p className="text-xs font-bold text-primary">
                  {movie.director || 'The Duffer Brothers'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 font-mono">
                  REPARTO PRINCIPAL
                </span>
                <p className="text-xs font-semibold text-neutral-300">
                  {movie.cast?.length ? movie.cast.join(', ') : 'Millie Bobby Brown, Finn Wolfhard, Winona Ryder, David Harbour'}
                </p>
              </div>
            </div>
          </div>


      </div>
      </div>

      {showEpisodesModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEpisodesModal(false)
          }}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            data-modal-container="true"
            role="dialog"
            className="w-full max-w-3xl max-h-[85vh] bg-surface-1 border border-white/15 rounded-sm overflow-hidden flex flex-col shadow-2xl animate-slide-up"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{movie.title}</h2>
                <p className="text-xs text-neutral-400 mt-0.5">Selecciona el capítulo que deseas reproducir</p>
              </div>
              <button
                type="button"
                data-modal-close="true"
                data-nav-item="modal-close"
                onClick={() => setShowEpisodesModal(false)}
                className="w-9 h-9 rounded-sm bg-white/10 hover:bg-white/20 flex items-center justify-center text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 px-6 py-3 border-b border-white/10 overflow-x-auto">
              {Array.from({ length: totalSeasons }).map((_, i) => {
                const sNum = i + 1
                return (
                  <button
                    key={sNum}
                    type="button"
                    data-nav-item="modal-season"
                    onClick={() => onSelectSeason(sNum)}
                    className={`px-4 py-1.5 rounded-sm text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                      currentSeason === sNum
                        ? 'bg-primary text-white shadow-glow-primary'
                        : 'bg-surface-2 text-neutral-400 hover:text-white'
                    }`}
                  >
                    Temporada {sNum}
                  </button>
                )
              })}
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-2.5">
              {loadingEpisodes ? (
                <div className="py-16 text-center">
                  <div className="w-8 h-8 rounded-sm border-2 border-primary border-t-transparent animate-spin mx-auto mb-2" />
                  <p className="text-xs text-neutral-400">Cargando capítulos...</p>
                </div>
              ) : episodesList.length > 0 ? (
                episodesList.map((ep) => (
                  <button
                    key={ep.episodeNumber}
                    type="button"
                    data-nav-item="modal-episode"
                    onClick={() => {
                      changeEpisode(ep.episodeNumber)
                      setShowEpisodesModal(false)
                    }}
                    className={`w-full text-left p-3.5 rounded-sm flex items-center justify-between gap-4 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                      ep.episodeNumber === currentEpisode
                        ? 'bg-primary/20 border border-primary/50 text-white'
                        : 'bg-surface-2/60 hover:bg-surface-2 border border-white/5 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="text-xs font-bold text-neutral-400 shrink-0 w-12">
                        Cap. {ep.episodeNumber}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">{ep.name}</h4>
                        {ep.overview && (
                          <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5">{ep.overview}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {ep.runtime && <span className="text-xs text-neutral-400">{ep.runtime} min</span>}
                      {ep.episodeNumber === currentEpisode && (
                        <span className="text-[10px] px-2 py-0.5 rounded-sm bg-primary text-white font-extrabold uppercase">
                          Viendo
                        </span>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-center py-12 text-xs text-neutral-400">No hay episodios disponibles.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showPairingPanel && (
        <div className="fixed bottom-6 right-6 w-80 rounded-sm bg-surface-1/95 border border-white/15 backdrop-blur-2xl shadow-2xl p-5 z-[90] animate-slide-up space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-primary" />
              <span>Control Remoto Móvil</span>
            </span>
            <button onClick={() => setShowPairingPanel(false)} className="text-neutral-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {remoteConnected ? (
            <div className="p-3.5 rounded-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-center">
              <p className="text-sm font-bold">¡Móvil Conectado!</p>
              <p className="text-xs text-neutral-300 mt-1">Controla este reproductor desde la app MJMovies Remote.</p>
            </div>
          ) : pairingCode ? (
            <div className="flex flex-col items-center gap-2.5">
              {pairingQrCode && (
                <div className="p-1.5 bg-white rounded-sm">
                  <img src={pairingQrCode} alt="QR Pairing" className="w-36 h-36 object-contain" />
                </div>
              )}
              <div className="text-center w-full">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Código PIN</span>
                <p className="text-2xl font-black text-gold tracking-widest mt-0.5">{pairingCode}</p>
              </div>

              {serverUrl && (
                <div className="w-full p-2.5 rounded-sm bg-surface-2 border border-white/10 text-center space-y-1.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    URL Servidor para el Control Móvil
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-mono text-primary font-bold text-xs">{serverUrl}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(serverUrl);
                        toastInfo('URL copiada al portapapeles');
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary hover:bg-primary hover:text-white transition-colors"
                    >
                      Copiar
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-tight">
                    ⚠️ Usa el puerto <strong className="text-white font-mono">5000</strong> (Backend). No uses el 3000 ni el 8081.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-neutral-400">Generando código...</div>
          )}
        </div>
      )}
    </div>
  )
}
