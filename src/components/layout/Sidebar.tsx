import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Activity, UtensilsCrossed,
  FileText, Settings, LogOut, Leaf, MessageSquare, Calendar, X, BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useUnreadMessages } from '@/hooks/useMessages'
import { Button } from '@/components/ui/button'
import { NotificationsBell } from './NotificationsBell'

const navSections = [
  {
    label: 'Generale',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Clinica',
    items: [
      { to: '/pazienti', icon: Users, label: 'Pazienti' },
      { to: '/misurazioni', icon: Activity, label: 'Misurazioni' },
      { to: '/piani', icon: UtensilsCrossed, label: 'Piani alimentari' },
      { to: '/calendario', icon: Calendar, label: 'Calendario' },
      { to: '/messaggi', icon: MessageSquare, label: 'Messaggi' },
    ],
  },
  {
    label: 'Strumenti',
    items: [
      { to: '/alimenti', icon: Leaf, label: 'Alimenti' },
      { to: '/pasti', icon: BookOpen, label: 'Pasti' },
      { to: '/pdf', icon: FileText, label: 'Genera PDF' },
      { to: '/impostazioni', icon: Settings, label: 'Impostazioni' },
    ],
  },
]

function getInitials(name?: string | null): string {
  if (!name) return 'N'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface SidebarProps {
  /** Mobile: whether drawer is open */
  mobileOpen?: boolean
  /** Mobile: close the drawer */
  onClose?: () => void
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { profile, signOut } = useAuth()
  const { data: unread } = useUnreadMessages()
  const location = useLocation()
  const totalUnread = unread?.length ?? 0

  // Close drawer on route change (mobile)
  useEffect(() => {
    onClose?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const inner = (
    <aside className="sidebar-bg flex h-full w-[228px] shrink-0 flex-col">
      {/* Logo + mobile close button */}
      <div className="flex items-center gap-2.5 px-5 h-[60px] border-b border-border/60 shrink-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shadow-sm">
          <Leaf className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-foreground flex-1">NutriFlow</span>
        {/* Close button — mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:bg-accent transition-colors"
            aria-label="Chiudi menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {navSections.map(({ label, items }) => (
          <div key={label}>
            <p className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50 select-none">
              {label}
            </p>
            <div className="space-y-0.5">
              {items.map(({ to, icon: Icon, label: itemLabel }) => {
                const isMessages = to === '/messaggi'
                const badge = isMessages && totalUnread > 0 ? totalUnread : 0

                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/dashboard'}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13.5px] font-medium transition-all duration-100',
                        isActive
                          ? 'bg-primary/8 text-primary'
                          : 'text-muted-foreground hover:bg-black/[0.04] hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-[18px] w-[3px] rounded-r-full bg-primary" />
                        )}
                        <Icon className={cn(
                          'h-[15px] w-[15px] shrink-0 transition-colors',
                          isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                        )} />
                        <span className="flex-1 leading-none">{itemLabel}</span>
                        {badge > 0 && (
                          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white leading-none">
                            {badge > 99 ? '99+' : badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User + logout */}
      <div className="border-t border-border/60 px-3 py-3 shrink-0 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-black/[0.04] transition-colors">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-[11px] font-bold">
            {getInitials(profile?.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium truncate leading-tight">{profile?.full_name ?? 'Nutrizionista'}</p>
            <p className="text-[11px] text-muted-foreground/70 truncate leading-tight mt-0.5">Nutrizionista</p>
          </div>
        </div>
        <div className="mt-0.5">
          <NotificationsBell />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/8 h-8 text-[13px] mt-0.5"
          onClick={signOut}
        >
          <LogOut className="h-3.5 w-3.5" />
          Esci
        </Button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop: always visible */}
      <div className="hidden lg:flex h-dvh">
        {inner}
      </div>

      {/* Mobile: drawer overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="drawer-backdrop"
            onClick={onClose}
            aria-hidden
          />
          {/* Drawer panel */}
          <div className="relative z-50 h-full animate-in">
            {inner}
          </div>
        </div>
      )}
    </>
  )
}
