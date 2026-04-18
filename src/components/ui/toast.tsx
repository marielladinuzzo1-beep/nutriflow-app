import * as React from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Simple local toast system (no radix dependency) ─────────────────────────

export type ToastType = 'success' | 'error' | 'info'

interface ToastMessage {
  id: string
  message: string
  type: ToastType
}

const listeners: Array<(toasts: ToastMessage[]) => void> = []
let toasts: ToastMessage[] = []

function emit() {
  listeners.forEach(l => l([...toasts]))
}

export const toast = {
  success(message: string) {
    const id = crypto.randomUUID()
    toasts = [...toasts, { id, message, type: 'success' }]
    emit()
    setTimeout(() => {
      toasts = toasts.filter(t => t.id !== id)
      emit()
    }, 3500)
  },
  error(message: string) {
    const id = crypto.randomUUID()
    toasts = [...toasts, { id, message, type: 'error' }]
    emit()
    setTimeout(() => {
      toasts = toasts.filter(t => t.id !== id)
      emit()
    }, 4500)
  },
  info(message: string) {
    const id = crypto.randomUUID()
    toasts = [...toasts, { id, message, type: 'info' }]
    emit()
    setTimeout(() => {
      toasts = toasts.filter(t => t.id !== id)
      emit()
    }, 3500)
  },
}

const icons: Record<ToastType, React.ElementType> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
}

const styles: Record<ToastType, string> = {
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
}

export function Toaster() {
  const [localToasts, setLocalToasts] = React.useState<ToastMessage[]>([])

  React.useEffect(() => {
    listeners.push(setLocalToasts)
    return () => {
      const idx = listeners.indexOf(setLocalToasts)
      if (idx > -1) listeners.splice(idx, 1)
    }
  }, [])

  if (!localToasts.length) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {localToasts.map(t => {
        const Icon = icons[t.type]
        return (
          <div
            key={t.id}
            className={cn(
              'flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg text-sm animate-in slide-in-from-bottom-5',
              styles[t.type]
            )}
          >
            <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => {
                toasts = toasts.filter(x => x.id !== t.id)
                emit()
              }}
              className="opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
