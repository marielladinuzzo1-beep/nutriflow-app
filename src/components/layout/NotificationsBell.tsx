import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, ClipboardList } from 'lucide-react'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/useNotifications'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ora'
  if (m < 60) return `${m}m fa`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h fa`
  const d = Math.floor(h / 24)
  return `${d}g fa`
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { data: notifications } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()

  const unread = (notifications ?? []).filter(n => !n.is_read)
  const count = unread.length

  function handleOpenNotification(id: string, link: string | null | undefined) {
    markRead.mutate(id)
    setOpen(false)
    if (link) navigate(link)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex items-center justify-center h-8 w-full rounded-md text-[13px] text-muted-foreground hover:bg-black/[0.04] hover:text-foreground transition-colors gap-2"
        title="Notifiche"
      >
        <Bell className="h-4 w-4" />
        <span>Notifiche</span>
        {count > 0 && (
          <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white leading-none">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifiche
              {count > 0 && (
                <span className="text-[10px] font-bold rounded-full bg-destructive text-white px-1.5 py-0.5">
                  {count} nuove
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto -mx-2 px-2">
            {(!notifications || notifications.length === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                Nessuna notifica
              </p>
            ) : (
              notifications.map(n => {
                const icon = n.type === 'feedback_submitted'
                  ? <ClipboardList className="h-4 w-4 text-primary" />
                  : <Bell className="h-4 w-4 text-muted-foreground" />
                return (
                  <button
                    key={n.id}
                    onClick={() => handleOpenNotification(n.id, n.link)}
                    className={cn(
                      'w-full text-left flex items-start gap-3 rounded-md p-3 transition-colors',
                      n.is_read
                        ? 'bg-muted/30 hover:bg-muted/60'
                        : 'bg-primary/5 hover:bg-primary/10 border border-primary/20'
                    )}
                  >
                    <div className="mt-0.5 shrink-0">{icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm', !n.is_read && 'font-semibold')}>{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-[10px] text-muted-foreground/70 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_read && <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />}
                  </button>
                )
              })
            )}
          </div>

          {count > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAll.mutate()} disabled={markAll.isPending} className="w-full">
              <CheckCheck className="mr-2 h-3.5 w-3.5" />
              Segna tutte come lette
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
