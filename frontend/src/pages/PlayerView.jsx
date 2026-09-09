import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import Hls from 'hls.js'
import api from '../services/api'
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
} from 'lucide-react'

export default function PlayerView() {
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

  // Episodes Modal
  const [showEpisodesModal, setShowEpisodesModal] = useState(false)
  const [loadingEpisodes, setLoadingEpisodes] = useState(false)
  const [episodesList, setEpisodesList] = useState([])

  // Native Video Player State
  const videoRef = useRef(null)
  const playerContainerRef = useRef(null)
  const hlsRef = useRef(null)
  const controlsTimeoutRef = useRef(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [bufferedPercent, setBufferedPercent] = useState(0)
  const [controlsVisible, setControlsVisible] = useState(true)

  // Remote Control State
  const [pairingCode, setPairingCode] = useState(null)
  const [pairingQrCode, setPairingQrCode] = useState(null)
  const [tvSessionId, setTvSessionId] = useState(null)
  const [remoteConnected, setRemoteConnected] = useState(false)
  const [showPairingPanel, setShowPairingPanel] = useState(false)
  const socketRef = useRef(null)

  const showControls = useCallback(() => {
    setControlsVisible(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showEpisodesModal && !showServerMenu && !showPairingPanel) {
        setControlsVisible(false)
      }
    }, 4000)
  }, [isPlaying, showEpisodesModal, showServerMenu, showPairingPanel])

  // Fetch episodes for a given season
  const fetchEpisodes = async (season, targetId) => {
    setLoadingEpisodes(true)
    try {
      const tid = targetId || currentTmdbId || id
      const res = await api.get(`/external-movies/series/${tid}/season/${season}`)
      setEpisodesList(res.data.episodes || [])
    } catch (err) {
      console.warn('Error cargando episodios:', err)
      // Fallback
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

  // Initial Content Load
  useEffect(() => {
    const loadContent = async () => {
      setLoading(true)
      setError(null)

      try {
        // 1. Obtener streams y servidores
        const streamRes = await api.get(`/stream/${id}`, {
          params: {
            season: currentSeason,
            episode: currentEpisode,
            type: queryType,
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

  // Native Player initialization when HLS server is active
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
        })
        hlsRef.current = hls
        hls.loadSource(url)
        hls.attachMedia(video)

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => setIsPlaying(false))
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
        video.play().catch(() => setIsPlaying(false))
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [activeServer])

  // Remote Pairing Setup
  useEffect(() => {
    api.get('/remote/pairing')
      .then(({ data }) => {
        setPairingCode(data.pairingCode)
        setPairingQrCode(data.qrCode)
        setTvSessionId(data.tvSessionId)

        const socket = io(window.location.origin, {
          query: { sessionId: data.tvSessionId, role: 'tv' },
          transports: ['websocket', 'polling'],
          reconnection: true,
        })
        socketRef.current = socket

        socket.on('remote:connected', () => setRemoteConnected(true))
        socket.on('remote:disconnected', () => setRemoteConnected(false))
        socket.on('remote:command', ({ command }) => {
          if (command === 'play' || command === 'pause' || command === 'select') {
            togglePlay()
          } else if (command === 'back') {
            navigate(-1)
          } else if (command === 'fullscreen') {
            toggleFullscreen()
          }
        })
      })
      .catch(() => {})

    return () => {
      socketRef.current?.disconnect()
    }
  }, [])

  // Change Episode
  const changeEpisode = async (newEpisodeNum) => {
    if (newEpisodeNum < 1) return
    setCurrentEpisode(newEpisodeNum)

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('season', currentSeason)
      next.set('episode', newEpisodeNum)
      return next
    })

    try {
      const res = await api.get(`/stream/${id}`, {
        params: {
          season: currentSeason,
          episode: newEpisodeNum,
          type: isTv ? 'tv' : 'movie',
        },
      })
      const servs = res.data.servers || []
      setServers(servs)

      const matching = servs.find((s) => s.id === activeServer?.id) || servs[0]
      setActiveServer(matching)
    } catch (err) {
      console.error('Error cambiando de capítulo:', err)
    }
  }

  // Change Season in modal
  const onSelectSeason = async (season) => {
    setCurrentSeason(season)
    setCurrentEpisode(1)
    await fetchEpisodes(season)
    await changeEpisode(1)
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
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white z-50">
        <div className="w-12 h-12 rounded-full border-3 border-primary border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-semibold text-neutral-400">Cargando reproductor...</p>
      </div>
    )
  }

  if (error || !movie) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white z-50 p-4 text-center">
        <AlertTriangle className="w-14 h-14 text-amber-400 mb-4 mx-auto" />
        <h2 className="text-xl font-bold mb-3">{error}</h2>
        <button
          onClick={() => navigate('/catalog')}
          className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-glow-primary"
        >
          Volver al catálogo
        </button>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden select-none"
      onMouseMove={showControls}
      onTouchStart={showControls}
    >
      <div
        className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between gap-4 transition-all duration-300 pointer-events-auto bg-gradient-to-b from-black/95 via-black/60 to-transparent ${
          controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white border border-white/15 backdrop-blur-md flex items-center gap-1.5 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>

          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-white truncate">
              {movie.title}
              {isTv && (
                <span className="text-primary ml-2 text-xs sm:text-sm font-semibold">
                  T{currentSeason}:E{currentEpisode} {currentEpisodeObj?.name ? `"${currentEpisodeObj.name}"` : ''}
                </span>
              )}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isTv && (
            <button
              onClick={() => setShowEpisodesModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-glow-primary flex items-center gap-1.5 transition-all"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Temporadas & Capítulos</span>
              <span className="sm:hidden">Capítulos</span>
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowServerMenu(!showServerMenu)}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 backdrop-blur-md flex items-center gap-1.5 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">
                {activeServer?.name?.split('(')[0]?.trim() || 'Servidor'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            {showServerMenu && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-surface-1/95 border border-white/15 backdrop-blur-2xl shadow-2xl p-2 z-50 animate-slide-up">
                <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Servidores de Video
                </div>
                <div className="space-y-1 mt-1">
                  {servers.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setActiveServer(s)
                        setShowServerMenu(false)
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-colors ${
                        activeServer?.id === s.id
                          ? 'bg-primary/20 text-primary font-bold border border-primary/40'
                          : 'text-white hover:bg-white/10'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{s.name}</span>
                          {s.isRecommended && (
                            <span className="px-1.5 py-0.2 text-[9px] bg-emerald-500 text-black font-extrabold rounded">
                              PRO
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-neutral-300 font-bold shrink-0">
                        {s.quality}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowPairingPanel(!showPairingPanel)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 backdrop-blur-md transition-colors"
            title="Vincular Control Remoto"
          >
            <Smartphone className={`w-4 h-4 ${remoteConnected ? 'text-emerald-400' : 'text-white'}`} />
          </button>
        </div>
      </div>

      <div ref={playerContainerRef} className="relative w-full h-full flex items-center justify-center bg-black">
        {activeServer?.type === 'embed' ? (
          <div className="w-full h-full relative">
            <iframe
              src={activeServer.url}
              className="w-full h-full border-0 block"
              allowFullScreen
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              referrerPolicy="no-referrer"
              title="Reproductor MJMovies"
            />

            {isTv && (
              <div
                className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-4 py-2 rounded-full bg-surface-1/90 border border-white/15 backdrop-blur-xl shadow-2xl transition-all duration-300 ${
                  controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                }`}
              >
                <button
                  disabled={currentEpisode <= 1}
                  onClick={() => changeEpisode(currentEpisode - 1)}
                  className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-xs font-bold text-white flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>

                <button
                  onClick={() => setShowEpisodesModal(true)}
                  className="px-4 py-1.5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-glow-primary"
                >
                  T{currentSeason}:E{currentEpisode} · Capítulos
                </button>

                <button
                  disabled={isLastEpisode}
                  onClick={() => changeEpisode(currentEpisode + 1)}
                  className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-xs font-bold text-white flex items-center gap-1 transition-colors"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center group">
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
                if (videoRef.current) setDuration(videoRef.current.duration || 0)
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => setIsBuffering(false)}
              onEnded={() => {
                setIsPlaying(false)
                if (isTv && !isLastEpisode) changeEpisode(currentEpisode + 1)
              }}
              playsInline
            />

            {!isPlaying && !isBuffering && (
              <div
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer z-20"
              >
                <div className="w-20 h-20 rounded-full bg-primary hover:scale-110 transition-transform flex items-center justify-center text-white shadow-glow-primary-lg">
                  <Play className="w-8 h-8 fill-white ml-1" />
                </div>
              </div>
            )}

            {isBuffering && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="w-14 h-14 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              </div>
            )}

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
                  className="absolute inset-y-0 left-0 bg-primary rounded-full"
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full scale-0 group-hover/bar:scale-100 transition-transform shadow-md" />
                </div>
              </div>

              <div className="flex items-center justify-between text-white">
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

                <div className="flex items-center gap-4">
                  <button onClick={toggleFullscreen} className="hover:text-primary transition-colors">
                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showEpisodesModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEpisodesModal(false)
          }}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="w-full max-w-3xl max-h-[85vh] bg-surface-1 border border-white/15 rounded-3xl overflow-hidden flex flex-col shadow-2xl animate-slide-up">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{movie.title}</h2>
                <p className="text-xs text-neutral-400 mt-0.5">Selecciona el capítulo que deseas reproducir</p>
              </div>
              <button
                onClick={() => setShowEpisodesModal(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
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
                    onClick={() => onSelectSeason(sNum)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
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
                  <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-2" />
                  <p className="text-xs text-neutral-400">Cargando capítulos...</p>
                </div>
              ) : episodesList.length > 0 ? (
                episodesList.map((ep) => (
                  <div
                    key={ep.episodeNumber}
                    onClick={() => {
                      changeEpisode(ep.episodeNumber)
                      setShowEpisodesModal(false)
                    }}
                    className={`p-3.5 rounded-xl flex items-center justify-between gap-4 cursor-pointer transition-all ${
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
                        <span className="text-[10px] px-2 py-0.5 rounded bg-primary text-white font-extrabold uppercase">
                          Viendo
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center py-12 text-xs text-neutral-400">No hay episodios disponibles.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showPairingPanel && (
        <div className="fixed bottom-6 right-6 w-80 rounded-3xl bg-surface-1/95 border border-white/15 backdrop-blur-2xl shadow-2xl p-6 z-[90] animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-primary" />
              <span>Control Remoto Móvil</span>
            </span>
            <button onClick={() => setShowPairingPanel(false)} className="text-neutral-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {remoteConnected ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-center">
              <p className="text-sm font-bold">¡Móvil Conectado!</p>
              <p className="text-xs text-neutral-300 mt-1">Controla este reproductor desde la app MJMovies Remote.</p>
            </div>
          ) : pairingCode ? (
            <div className="flex flex-col items-center gap-3">
              {pairingQrCode && (
                <img src={pairingQrCode} alt="QR Pairing" className="w-36 h-36 rounded-xl border border-white/10" />
              )}
              <div className="text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">O ingresa el código</span>
                <p className="text-3xl font-black text-gold tracking-widest mt-1">{pairingCode}</p>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-neutral-400">Generando código...</div>
          )}
        </div>
      )}
    </div>
  )
}
