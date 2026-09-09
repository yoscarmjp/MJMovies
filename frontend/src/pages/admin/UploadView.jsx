import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../../services/api';
import { useToastStore } from '../../stores/toastStore';
import { UploadCloud, Film, Image as ImageIcon, X, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

export default function UploadView() {
  const { success: toastSuccess, error: toastError } = useToastStore();

  const fileInputRef = useRef(null);
  const [videoFile, setVideoFile] = useState(null);
  const [posterFile, setPosterFile] = useState(null);
  const [posterPreview, setPosterPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState('Subiendo archivo...');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [transcoding, setTranscoding] = useState(false);
  const [transcodeProgress, setTranscodeProgress] = useState(0);

  const [genres, setGenres] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);

  const currentYear = new Date().getFullYear();
  const maxSizeMb = parseInt(import.meta.env.VITE_MAX_FILE_SIZE_MB || '5000') / 1024;

  const [meta, setMeta] = useState({
    title: '',
    description: '',
    year: '',
    director: '',
    rating: '',
    language: 'es',
    featured: false,
  });

  const [errors, setErrors] = useState({ title: '' });
  const socketRef = useRef(null);

  useEffect(() => {
    const loadGenres = async () => {
      try {
        const { data } = await api.get('/movies/genres');
        setGenres(data.genres || []);
      } catch {}
    };
    loadGenres();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleSetVideoFile(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) handleSetVideoFile(file);
  };

  const handleSetVideoFile = (file) => {
    const allowed = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
    if (!allowed.includes(file.type) && !file.name.endsWith('.mp4') && !file.name.endsWith('.mkv')) {
      toastError('Solo se permiten archivos de video MP4 o MKV');
      return;
    }
    if (file.size > maxSizeMb * 1024 * 1024 * 1024) {
      toastError(`El archivo excede el tamaño máximo de ${maxSizeMb}GB`);
      return;
    }
    setVideoFile(file);
    if (!meta.title) {
      const suggestedTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[._-]/g, ' ').trim();
      setMeta((prev) => ({ ...prev, title: suggestedTitle }));
    }
  };

  const removeVideoFile = () => {
    setVideoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePosterSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toastError('Solo imágenes JPG, PNG o WebP');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toastError('El poster no puede superar 10MB');
      return;
    }
    setPosterFile(file);
    setPosterPreview(URL.createObjectURL(file));
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const toggleGenre = (genreId) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId) ? prev.filter((id) => id !== genreId) : [...prev, genreId]
    );
  };

  const validate = () => {
    if (!meta.title.trim()) {
      setErrors({ title: 'El título es requerido' });
      return false;
    }
    setErrors({ title: '' });
    return true;
  };

  const submitUpload = async () => {
    if (!validate() || !videoFile) return;

    setUploading(true);
    setUploadError('');
    setUploadSuccess(false);
    setUploadProgress(0);
    setUploadPhase('Subiendo archivo de video...');

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('title', meta.title);
      if (meta.description) formData.append('description', meta.description);
      if (meta.year) formData.append('year', meta.year);
      if (meta.director) formData.append('director', meta.director);
      if (meta.rating) formData.append('rating', meta.rating);
      formData.append('language', meta.language);
      formData.append('featured', meta.featured);
      selectedGenres.forEach((id) => formData.append('genres', id));

      const { data } = await api.post('/admin/movies', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          setUploadProgress(Math.floor((e.loaded / e.total) * 100));
        },
      });

      const movieId = data.movie?.id;

      if (posterFile && movieId) {
        setUploadPhase('Subiendo poster...');
        const posterForm = new FormData();
        posterForm.append('poster', posterFile);
        await api.post(`/admin/movies/${movieId}/poster`, posterForm, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setUploading(false);
      setUploadSuccess(true);
      setTranscoding(true);

      connectToTranscodeUpdates(movieId);
      toastSuccess('Película subida. Transcodificando a calidades múltiples...');
    } catch (err) {
      setUploading(false);
      const msg = err.response?.data?.error || 'Error al subir la película';
      setUploadError(msg);
      toastError(msg);
    }
  };

  const connectToTranscodeUpdates = (movieId) => {
    socketRef.current = io({ path: '/socket.io', query: { role: 'admin' } });

    socketRef.current.on('transcode:progress', (data) => {
      if (data.movieId === movieId) {
        setTranscodeProgress(data.progress);
      }
    });

    socketRef.current.on('transcode:done', (data) => {
      if (data.movieId === movieId) {
        setTranscoding(false);
        setTranscodeProgress(100);
        toastSuccess('¡Transcodificación completada con éxito!');
      }
    });

    socketRef.current.on('transcode:error', (data) => {
      if (data.movieId === movieId) {
        setTranscoding(false);
        toastError('Error en la transcodificación. Revisa los jobs.');
      }
    });
  };

  const resetForm = () => {
    setVideoFile(null);
    setPosterFile(null);
    setPosterPreview(null);
    setUploadSuccess(false);
    setUploadError('');
    setTranscoding(false);
    setTranscodeProgress(0);
    setSelectedGenres([]);
    setMeta({
      title: '',
      description: '',
      year: '',
      director: '',
      rating: '',
      language: 'es',
      featured: false,
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white">Subir Película</h1>
        <p className="text-gray-400 text-sm mt-1">
          Sube un archivo de video y configura la información para la transcodificación HLS
        </p>
      </div>

      <div className="p-8 rounded-2xl bg-surface-1/80 border border-white/10 backdrop-blur-md shadow-xl space-y-8">
        <div className="flex gap-4 items-start">
          <div className="w-8 h-8 rounded-full bg-primary text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-md shadow-primary/30">
            1
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white mb-3">Archivo de Video</h2>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-primary bg-primary/10'
                  : videoFile
                  ? 'border-emerald-500/50 bg-emerald-500/5'
                  : 'border-white/15 bg-surface-2/40 hover:border-white/30 hover:bg-surface-2'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/mpeg,video/quicktime,video/x-matroska"
                onChange={handleFileSelect}
                className="sr-only"
              />

              {!videoFile ? (
                <div className="flex flex-col items-center">
                  <UploadCloud size={44} className="text-gray-400 mb-3" />
                  <p className="text-base font-bold text-white">Arrastra tu archivo MP4/MKV aquí</p>
                  <p className="text-xs text-gray-400 mt-1">o haz click para seleccionar desde tu equipo</p>
                  <p className="text-[11px] text-gray-500 mt-3 font-medium">
                    MP4, MKV · Tamaño máximo hasta {maxSizeMb}GB
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between pointer-events-none">
                  <div className="flex items-center gap-3 text-left min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Film size={24} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{videoFile.name}</p>
                      <p className="text-xs text-emerald-400 font-medium">
                        {formatFileSize(videoFile.size)} · Listo para subir
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeVideoFile();
                    }}
                    className="pointer-events-auto p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-4 items-start">
          <div className="w-8 h-8 rounded-full bg-primary text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-md shadow-primary/30">
            2
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white mb-3">Póster (Opcional)</h2>

            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <div className="w-28 h-40 rounded-xl overflow-hidden bg-surface-2 border border-white/10 shrink-0 shadow-md flex items-center justify-center">
                {posterPreview ? (
                  <img src={posterPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-gray-500 gap-1 text-xs">
                    <ImageIcon size={28} />
                    <span>Sin póster</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 border border-white/10 text-white text-xs font-semibold cursor-pointer transition-colors">
                  <ImageIcon size={14} /> Seleccionar imagen
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePosterSelect}
                    className="sr-only"
                  />
                </label>
                <p className="text-xs text-gray-400">Formatos: JPG, PNG, WebP · Máximo 10MB</p>
                <p className="text-[11px] text-gray-500">Resolución sugerida: 400 × 600 px (relación 2:3)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 items-start">
          <div className="w-8 h-8 rounded-full bg-primary text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-md shadow-primary/30">
            3
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white mb-3">Metadatos de la Película</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5" htmlFor="meta-title">
                  Título *
                </label>
                <input
                  id="meta-title"
                  type="text"
                  value={meta.title}
                  onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                  placeholder="Ej: Inception"
                  required
                  className={`w-full px-4 py-2.5 rounded-xl bg-surface-2 border text-white text-sm focus:outline-none focus:ring-2 ${
                    errors.title ? 'border-primary focus:ring-primary/40' : 'border-white/10 focus:ring-primary/20'
                  }`}
                />
                {errors.title && <p className="mt-1 text-xs text-primary">{errors.title}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5" htmlFor="meta-desc">
                  Descripción / Sinopsis
                </label>
                <textarea
                  id="meta-desc"
                  rows={3}
                  value={meta.description}
                  onChange={(e) => setMeta({ ...meta, description: e.target.value })}
                  placeholder="Sinopsis o trama del filme..."
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5" htmlFor="meta-year">
                  Año de lanzamiento
                </label>
                <input
                  id="meta-year"
                  type="number"
                  min="1888"
                  max={currentYear + 2}
                  value={meta.year}
                  onChange={(e) => setMeta({ ...meta, year: e.target.value })}
                  placeholder="Ej: 2024"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5" htmlFor="meta-director">
                  Director
                </label>
                <input
                  id="meta-director"
                  type="text"
                  value={meta.director}
                  onChange={(e) => setMeta({ ...meta, director: e.target.value })}
                  placeholder="Ej: Christopher Nolan"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5" htmlFor="meta-rating">
                  Calificación (0 - 10)
                </label>
                <input
                  id="meta-rating"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={meta.rating}
                  onChange={(e) => setMeta({ ...meta, rating: e.target.value })}
                  placeholder="Ej: 8.8"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5" htmlFor="meta-lang">
                  Idioma
                </label>
                <select
                  id="meta-lang"
                  value={meta.language}
                  onChange={(e) => setMeta({ ...meta, language: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  <option value="es">Español</option>
                  <option value="en">Inglés</option>
                  <option value="pt">Portugués</option>
                  <option value="fr">Francés</option>
                  <option value="de">Alemán</option>
                  <option value="ja">Japonés</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                  Géneros
                </label>
                <div className="flex flex-wrap gap-2">
                  {genres.map((g) => {
                    const isSelected = selectedGenres.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => toggleGenre(g.id)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                          isSelected
                            ? 'bg-primary border-primary text-white shadow-md shadow-primary/30'
                            : 'bg-surface-2 border-white/10 text-gray-300 hover:border-white/30'
                        }`}
                      >
                        {g.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="sm:col-span-2 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={meta.featured}
                    onChange={(e) => setMeta({ ...meta, featured: e.target.checked })}
                    className="w-4 h-4 rounded text-primary focus:ring-primary/40 bg-surface-2 border-white/20 accent-primary"
                  />
                  <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <Sparkles size={16} className="text-amber-400" /> Marcar como Película Destacada (Hero Banner)
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {uploading && (
          <div className="p-5 rounded-xl bg-surface-2 border border-white/10 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-white">{uploadPhase}</span>
              <span className="font-mono text-primary font-bold">{uploadProgress}%</span>
            </div>
            <div className="w-full h-2.5 bg-surface-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {transcoding && (
          <div className="p-5 rounded-xl bg-surface-2 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-amber-300 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                Transcodificando a calidades múltiples (360p, 720p, 1080p)...
              </span>
              <span className="font-mono text-amber-400 font-bold">{transcodeProgress}%</span>
            </div>
            <div className="w-full h-2.5 bg-surface-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-300 animate-pulse"
                style={{ width: `${transcodeProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">
              Generando streams adaptativos HLS en segundo plano. Puedes continuar o revisar la pestaña de jobs.
            </p>
          </div>
        )}

        {uploadSuccess && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-3 text-emerald-400 text-sm">
            <CheckCircle size={20} className="shrink-0" />
            <div>
              <span>¡Película subida exitosamente! Monitorea el progreso en </span>
              <Link to="/admin/jobs" className="underline font-bold text-white hover:text-emerald-300">
                Jobs de Transcodificación
              </Link>
              .
            </div>
          </div>
        )}

        {uploadError && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center gap-3 text-red-400 text-sm">
            <AlertCircle size={20} className="shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        <div className="flex items-center gap-4 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={submitUpload}
            disabled={!videoFile || !meta.title || uploading}
            className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-sm transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <UploadCloud size={18} /> Subir y Procesar
              </>
            )}
          </button>

          <button
            type="button"
            onClick={resetForm}
            disabled={uploading}
            className="px-5 py-3 rounded-xl bg-surface-2 hover:bg-surface-3 text-gray-300 hover:text-white font-semibold text-sm transition-colors disabled:opacity-50"
          >
            Limpiar Formulario
          </button>
        </div>
      </div>
    </div>
  );
}
