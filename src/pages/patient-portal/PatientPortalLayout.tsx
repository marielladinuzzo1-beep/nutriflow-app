import { Outlet, NavLink } from 'react-router-dom'
import { useEffect } from 'react'
import { Calendar, MessageSquare, UtensilsCrossed, Leaf, LogOut, ClipboardList } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const NAV = [
  { to: '/portale/calendario', icon: Calendar, label: 'Appuntamenti' },
  { to: '/portale/piano', icon: UtensilsCrossed, label: 'Piano alimentare' },
  { to: '/portale/messaggi', icon: MessageSquare, label: 'Messaggi' },
  { to: '/portale/feedback', icon: ClipboardList, label: 'Questionario' },
]

export function PatientPortalLayout() {
  const { profile, signOut } = useAuth()

  // Self-healing: tenta di linkare l'account al record paziente se mancante
  useEffect(() => {
    if (!profile) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any).rpc('patient_self_link').then(() => {
      /* fire-and-forget: la migrazione 010 gestisce il link via email */
    })
  }, [profile?.id])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Slim sidebar */}
      <aside className="sidebar-bg flex h-screen w-[220px] shrink-0 flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-[60px] border-b border-border/60 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shadow-sm">
            <Leaf className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">NutriFlow</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          <p className="px-2.5 mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50 select-none">
            Portale paziente
          </p>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13.5px] font-medium transition-all duration-100',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-border/60 px-4 py-3 space-y-2">
          <p className="text-[12px] font-medium truncate">{profile?.full_name}</p>
          <p className="text-[11px] text-muted-foreground truncate">{profile?.email}</p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-[12px] h-7"
            onClick={() => signOut()}
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />Esci
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[900px] px-8 py-8 animate-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
