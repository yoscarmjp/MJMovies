import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  withCredentials: true, // Enviar cookies HttpOnly automáticamente
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest', // CSRF protection hint
  },
})

// Interceptor de request — añadir token si existe en localStorage como fallback
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor de respuesta — manejar 401 automáticamente
let isRefreshing = false
let refreshQueue = []

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Si el error es 401 y no hemos intentado refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Si ya hay un refresh en progreso, encolar este request
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true })
        const newToken = data.accessToken

        if (newToken) {
          localStorage.setItem('accessToken', newToken)
          api.defaults.headers.Authorization = `Bearer ${newToken}`
          refreshQueue.forEach(({ resolve }) => resolve(newToken))
          refreshQueue = []
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return api(originalRequest)
        }
      } catch {
        refreshQueue.forEach(({ reject }) => reject(error))
        refreshQueue = []
        localStorage.removeItem('accessToken')
        // Redirigir al login
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
