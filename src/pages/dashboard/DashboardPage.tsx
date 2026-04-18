import { useQuery } from '@tanstack/react-query'
import {
  Users, Activity, UtensilsCrossed, Plus, ArrowRight,
  Calendar, MessageSquare, Clock, ChevronRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useUpcomingAppointments } from '@/hooks/useAppointments'
import { useUnreadMessages } from '@/hooks/useMessages'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { DashboardStats, Patient } from '@/types'

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  title, value, icon: Icon, sub, accent,
}: {
  title: string
  value: number | string
  icon: React.ElementType
  sub?: string
  accent?: boolean
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">{title}</span>
        <Icon className={`h-4 w-4 ${accent ? 'text-destructive' : 'text-muted-foreground/50'}`} />
      </div>
      <div>
        <span className={`text-[2rem] font-bold tracking-tight leading-none ${accent ? 'text-destructive' : 'text-foreground'}`}>
          {value}
        </span>
        {sub && <p className="mt-1 text-[12px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Quick action ─────────────────────────────────────────────────────────────

function QuickAction({ to, icon: Icon, label, description }: {
  to: string; icon: React.ElementType; label: string; description: string
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent transition-colors group"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground group-hover:border-primary/30 group-hover:text-primary transition-colors">
        <Icon className="h-[15px] w-[15px]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium leading-snug">{label}</p>
        <p className="text-[12px] text-muted-foreground truncate">{description}</p>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
    </Link>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { profile } = useAuth()
  const { data: upcomingAppts } = useUpcomingAppointments()
  const { data: unread } = useUnreadMessages()
  const unreadCount = unread?.length ?? 0

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non autenticato')

      const [patients, activePlans, measurements] = await Promise.all([
        supabase.from('patients').select('id, is_active').eq('nutritionist_id', user.id),
        supabase.from('meal_plans').select('id').eq('nutritionist_id', user.id).eq('status', 'active'),
        supabase.from('measurements').select('id').eq('nutritionist_id', user.id)
          .gte('measured_at', new Date(new Date().setDate(1)).toISOString()),
      ])

      type PatientRow = { id: string; is_active: boolean }
      return {
        total_patients: patients.data?.length ?? 0,
        active_patients: (patients.data as PatientRow[] | null)?.filter(p => p.is_active).length ?? 0,
        active_plans: activePlans.data?.length ?? 0,
        measurements_this_month: measurements.data?.length ?? 0,
      }
    },
  })

  const { data: recentPatients } = useQuery<Patient[]>({
    queryKey: ['recent-patients'],
    queryFn: async () => {
      const { data } = await supabase
        .from('patients').select('*').order('created_at', { ascending: false }).limit(5)
      return (data ?? []) as Patient[]
    },
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera'
  const name = profile?.full_name?.split(' ')[0] ?? 'Dottore'

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">
            {greeting}, {name}
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/pazienti">
            <Plus className="mr-1.5 h-3.5 w-3.5" />Nuovo paziente
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title="Pazienti totali"
          value={stats?.total_patients ?? 0}
          icon={Users}
          sub={`${stats?.active_patients ?? 0} attivi`}
        />
        <StatCard
          title="Piani attivi"
          value={stats?.active_plans ?? 0}
          icon={UtensilsCrossed}
          sub="In corso"
        />
        <StatCard
          title="Misurazioni"
          value={stats?.measurements_this_month ?? 0}
          icon={Activity}
          sub="Questo mese"
        />
        <StatCard
          title="Non letti"
          value={unreadCount}
          icon={MessageSquare}
          sub={unreadCount > 0 ? 'Messaggi da leggere' : 'Tutto aggiornato'}
          accent={unreadCount > 0}
        />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Upcoming appointments — 2/3 */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Prossimi appuntamenti
              </CardTitle>
              <CardDescription>Oggi e nei prossimi 7 giorni</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[12px] text-muted-foreground">
              <Link to="/calendario">Calendario <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {(upcomingAppts?.length ?? 0) > 0 ? (
              <div className="space-y-1">
                {upcomingAppts!.map(appt => {
                  const d = new Date(appt.date + 'T00:00:00')
                  const isToday = appt.date === new Date().toISOString().split('T')[0]
                  return (
                    <div key={appt.id} className="flex items-center gap-3.5 rounded-lg px-3 py-2.5 hover:bg-accent transition-colors">
                      <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-lg shrink-0 ${isToday ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        <span className="text-[9px] font-bold uppercase leading-none">
                          {d.toLocaleDateString('it-IT', { weekday: 'short' })}
                        </span>
                        <span className="text-[17px] font-bold leading-tight">{d.getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate">{appt.title}</p>
                        {appt.patient && (
                          <Link
                            to={`/pazienti/${appt.patient.id}`}
                            className="text-[12px] text-muted-foreground hover:text-primary transition-colors"
                          >
                            {appt.patient.first_name} {appt.patient.last_name}
                          </Link>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[12px] text-muted-foreground shrink-0">
                        <Clock className="h-3 w-3" />
                        {appt.start_time}{appt.end_time ? `–${appt.end_time}` : ''}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-2.5">
                <Calendar className="h-7 w-7 text-muted-foreground/25" />
                <p className="text-[13px] text-muted-foreground">Nessun appuntamento in programma</p>
                <Button asChild size="sm" variant="outline" className="mt-1">
                  <Link to="/calendario"><Plus className="mr-1.5 h-3.5 w-3.5" />Aggiungi appuntamento</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions — 1/3 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.07em]">Azioni rapide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5">
            <QuickAction
              to="/pazienti"
              icon={Users}
              label="Nuovo paziente"
              description="Registra un paziente"
            />
            <QuickAction
              to="/calendario"
              icon={Calendar}
              label="Calendario"
              description="Gestisci appuntamenti"
            />
            <QuickAction
              to="/misurazioni"
              icon={Activity}
              label="Aggiungi misurazione"
              description="Peso, BMI, composizione"
            />
            <QuickAction
              to="/messaggi"
              icon={MessageSquare}
              label="Messaggi"
              description={unreadCount > 0 ? `${unreadCount} non letti` : 'Nessun messaggio'}
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent patients */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-muted-foreground" />
              Ultimi pazienti
            </CardTitle>
            <CardDescription>I 5 pazienti più recenti</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[12px] text-muted-foreground">
            <Link to="/pazienti">Vedi tutti <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </CardHeader>
        <CardContent>
          {(recentPatients?.length ?? 0) > 0 ? (
            <div className="space-y-0.5">
              {recentPatients!.map((p) => (
                <Link
                  key={p.id}
                  to={`/pazienti/${p.id}`}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-accent transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-[12px] font-semibold shrink-0">
                      {p.first_name[0]}{p.last_name[0]}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium leading-snug">{p.first_name} {p.last_name}</p>
                      <p className="text-[12px] text-muted-foreground">{p.email ?? 'Nessuna email'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={p.is_active ? 'success' : 'secondary'}>
                      {p.is_active ? 'Attivo' : 'Inattivo'}
                    </Badge>
                    <span className="text-[12px] text-muted-foreground/60 hidden sm:block">{formatDate(p.created_at)}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-2.5">
              <Users className="h-7 w-7 text-muted-foreground/25" />
              <p className="text-[13px] text-muted-foreground">Nessun paziente ancora</p>
              <Button asChild size="sm" variant="outline" className="mt-1">
                <Link to="/pazienti"><Plus className="mr-1.5 h-4 w-4" />Aggiungi paziente</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
