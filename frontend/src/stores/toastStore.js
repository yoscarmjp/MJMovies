import { create } from 'zustand'

export const useToastStore = create((set, get) => ({
  toasts: [],

  addToast: ({ type = 'info', title = '', message, duration = 4000 }) => {
    const id = typeof crypto !== 'undefined' ? crypto.randomUUID() : `toast-${Date.now()}-${Math.random()}`
    set((state) => ({
      toasts: [...state.toasts, { id, type, title, message }],
    }))

    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id)
      }, duration)
    }

    return id
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },

  success: (message, title = '') => get().addToast({ type: 'success', title, message }),
  error: (message, title = 'Error') => get().addToast({ type: 'error', title, message, duration: 6000 }),
  warning: (message, title = '') => get().addToast({ type: 'warning', title, message }),
  info: (message, title = '') => get().addToast({ type: 'info', title, message }),
}))
