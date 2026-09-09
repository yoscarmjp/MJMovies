import React from 'react'
import { useToastStore } from '../../stores/toastStore'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (!toasts.length) return null

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
      default:
        return <Info className="w-5 h-5 text-blue-400 shrink-0" />
    }
  }

  const getBorderColor = (type) => {
    switch (type) {
      case 'success': return 'border-emerald-500/30'
      case 'error': return 'border-red-500/30'
      case 'warning': return 'border-amber-500/30'
      default: return 'border-blue-500/30'
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl bg-surface-1/95 backdrop-blur-md border ${getBorderColor(
            toast.type
          )} shadow-2xl animate-slide-up text-white transition-all duration-200`}
        >
          {getIcon(toast.type)}
          <div className="flex-1 min-w-0">
            {toast.title && <h4 className="text-sm font-semibold text-white mb-0.5">{toast.title}</h4>}
            <p className="text-xs text-neutral-300 leading-relaxed break-words">{toast.message}</p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-neutral-400 hover:text-white p-1 rounded-md transition-colors"
            aria-label="Cerrar notificación"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
