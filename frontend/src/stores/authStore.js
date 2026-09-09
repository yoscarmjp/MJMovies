import { create } from 'zustand'
import api from '../services/api.js'

export const useAuthStore = create((set, get) => ({
  user: null,
  isLoggedIn: false,
  isAdmin: false,
  initialized: false,
  loading: false,

  initialize: async () => {
    if (get().initialized) return
    try {
      const token = localStorage.getItem('accessToken')
      if (token) {
        const { data } = await api.get('/auth/me')
        const user = data.user
        set({
          user,
          isLoggedIn: !!user,
          isAdmin: user?.role === 'ADMIN',
        })
      } else {
        set({ user: null, isLoggedIn: false, isAdmin: false })
      }
    } catch {
      localStorage.removeItem('accessToken')
      set({ user: null, isLoggedIn: false, isAdmin: false })
    } finally {
      set({ initialized: true })
    }
  },

  login: async (email, password) => {
    set({ loading: true })
    try {
      const { data } = await api.post('/auth/login', { email, password })
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken)
      }
      const user = data.user
      set({
        user,
        isLoggedIn: !!user,
        isAdmin: user?.role === 'ADMIN',
        loading: false,
      })
      return { success: true, user }
    } catch (error) {
      set({ loading: false })
      return {
        success: false,
        error: error.response?.data?.error || 'Error al iniciar sesión',
      }
    }
  },

  register: async (email, username, password) => {
    set({ loading: true })
    try {
      await api.post('/auth/register', { email, username, password })
      set({ loading: false })
      return { success: true }
    } catch (error) {
      set({ loading: false })
      return {
        success: false,
        error: error.response?.data?.error || 'Error al crear cuenta',
        errors: error.response?.data?.errors,
      }
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Ignorar errores en logout
    } finally {
      localStorage.removeItem('accessToken')
      set({ user: null, isLoggedIn: false, isAdmin: false })
    }
  },
}))
