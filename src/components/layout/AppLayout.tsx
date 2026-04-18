import { useState } from 'react'
import { Outlet, useLocation, Link } from 'react-router-dom'
import { Menu, Leaf } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { useUnreadMessages } from '@/hooks/useMessages'

// Pages that want full viewport height (chat, calendar)
const FULL_HEIGHT_ROUTES = ['/messaggi', '/calendario']

export function AppLayout() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { data: unread } = useUnreadMessages()
  const totalUnread = unread?.length ?? 0
  const isFullHeight = FULL_HEIGHT_ROUTES.some(r => location.pathname.startsWith(r))

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 h-[56px] px-4 border-b border-border/60 bg-background shrink-0 pt-[env(safe-area-inset-top,0px)]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors"
            aria-label="Apri menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/dashboard" className="flex items-center gap-2 flex-1">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
              <Leaf className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">NutriFlow</span>
          </Link>
          {totalUnread > 0 && (
            <Link to="/messaggi" className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white text-[10px] font-bold">
              {totalUnread > 9 ? '9+' : totalUnread}
            </Link>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {isFullHeight ? (
            <div className="h-full px-3 py-4 sm:px-6 sm:py-6">
              <Outlet />
            </div>
          ) : (
            <div className="mx-auto max-w-[1100px] px-4 py-5 sm:px-8 sm:py-8 animate-in pb-[max(20px,env(safe-area-inset-bottom))]">
              <Outlet />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
