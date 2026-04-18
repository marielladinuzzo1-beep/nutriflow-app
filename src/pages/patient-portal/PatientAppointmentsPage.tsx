import { useQuery } from '@tanstack/react-query'
import { Calendar, Clock, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Appointment } from '@/types'

function useMyAppointments() {
  return useQuery({
    queryKey: ['patient_appointments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
      if (error) throw error
      return data as Appointment[]
    },
    staleTime: 60 * 1000,
  })
}

export function PatientAppointmentsPage() {
  const { data: appointments, isLoading } = useMyAppointments()

  const today = new Date().toISOString().split('T')[0]
  const upcoming = appointments?.filter(a => a.date >= today) ?? []
  const past = appointments?.filter(a => a.date < today) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">I miei appuntamenti</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Visualizza i tuoi appuntamenti col nutrizionista</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : appointments?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 rounded-xl border border-dashed border-border text-center">
          <Calendar className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-[13px] text-muted-foreground">Nessun appuntamento ancora</p>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Prossimi</h2>
              {upcoming.map(a => (
                <AppointmentCard key={a.id} appointment={a} upcoming />
              ))}
            </section>
          )}
          {past.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Passati</h2>
              {past.reverse().map(a => (
                <AppointmentCard key={a.id} appointment={a} />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function AppointmentCard({ appointment: a, upcoming }: { appointment: Appointment; upcoming?: boolean }) {
  const dateObj = new Date(a.date + 'T12:00:00')
  const dateStr = dateObj.toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <Card className={upcoming ? 'border-primary/20 bg-primary/5' : 'opacity-70'}>
      <CardContent className="flex items-start gap-4 p-4">
        <div className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg text-xs font-bold ${upcoming ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          <span className="text-[10px] uppercase leading-none">
            {dateObj.toLocaleDateString('it-IT', { month: 'short' })}
          </span>
          <span className="text-lg leading-tight">{dateObj.getDate()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{a.title}</p>
          <p className="text-[12px] text-muted-foreground capitalize">{dateStr}</p>
          <div className="flex items-center gap-1 mt-1 text-[12px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {a.start_time.slice(0, 5)}{a.end_time ? ` – ${a.end_time.slice(0, 5)}` : ''}
          </div>
          {a.notes && <p className="text-[12px] text-muted-foreground mt-1 italic">{a.notes}</p>}
        </div>
        {upcoming && <Badge variant="success">In arrivo</Badge>}
      </CardContent>
    </Card>
  )
}
