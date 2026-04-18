import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Plus, Pencil, Trash2,
  Loader2, AlertTriangle, Calendar, Clock, User,
} from 'lucide-react'
import {
  useWeekAppointments,
  useCreateAppointment,
  useUpdateAppointment,
  useDeleteAppointment,
} from '@/hooks/useAppointments'
import { usePatients } from '@/hooks/usePatients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import type { Appointment } from '@/types'

// ─── Utilities ────────────────────────────────────────────────────────────────

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday=0 offset
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]
}

const DAY_LABELS_SHORT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const DAY_LABELS_FULL = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
const MONTHS_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]

function formatTimeRange(start: string, end?: string | null): string {
  return end ? `${start} – ${end}` : start
}

// ─── Appointment form ─────────────────────────────────────────────────────────

interface AppointmentFormState {
  patient_id: string
  title: string
  date: string
  start_time: string
  end_time: string
  notes: string
}

function AppointmentDialog({
  appointment,
  defaultDate,
  defaultPatientId,
  onClose,
}: {
  appointment?: Appointment | null
  defaultDate?: string
  defaultPatientId?: string
  onClose: () => void
}) {
  const { data: patients } = usePatients()
  const createAppt = useCreateAppointment()
  const updateAppt = useUpdateAppointment()

  const [form, setForm] = useState<AppointmentFormState>({
    patient_id: appointment?.patient_id ?? defaultPatientId ?? '',
    title: appointment?.title ?? '',
    date: appointment?.date ?? defaultDate ?? new Date().toISOString().split('T')[0],
    start_time: appointment?.start_time ?? '09:00',
    end_time: appointment?.end_time ?? '',
    notes: appointment?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)

  function set(k: keyof AppointmentFormState, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.patient_id || !form.title || !form.date || !form.start_time) {
      toast.error('Compila tutti i campi obbligatori')
      return
    }
    setSaving(true)
    try {
      if (appointment) {
        await updateAppt.mutateAsync({ id: appointment.id, ...form })
        toast.success('Appuntamento aggiornato')
      } else {
        await createAppt.mutateAsync(form)
        toast.success('Appuntamento creato')
      }
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{appointment ? 'Modifica appuntamento' : 'Nuovo appuntamento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Paziente *</Label>
            <Select value={form.patient_id} onValueChange={v => set('patient_id', v)}>
              <SelectTrigger><SelectValue placeholder="Seleziona paziente..." /></SelectTrigger>
              <SelectContent>
                {patients?.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Titolo *</Label>
            <Input
              placeholder="Es: Prima visita, Follow-up, Controllo peso..."
              value={form.title}
              onChange={e => set('title', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Data *</Label>
            <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Ora inizio *</Label>
              <Input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} className="text-base" />
            </div>
            <div className="space-y-2">
              <Label>Ora fine</Label>
              <Input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} className="text-base" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Note</Label>
            <Textarea
              placeholder="Note per l'appuntamento..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvataggio...</> : appointment ? 'Salva modifiche' : 'Crea appuntamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete confirm ───────────────────────────────────────────────────────────

function DeleteDialog({ appointment, onClose }: { appointment: Appointment; onClose: () => void }) {
  const deleteAppt = useDeleteAppointment()

  async function handleDelete() {
    try {
      await deleteAppt.mutateAsync(appointment.id)
      toast.success('Appuntamento eliminato')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante l\'eliminazione')
    }
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />Elimina appuntamento
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Sei sicuro di voler eliminare <strong>"{appointment.title}"</strong> del {appointment.date}?
        </p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button variant="destructive" disabled={deleteAppt.isPending} onClick={handleDelete}>
            {deleteAppt.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Elimina
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Appointment card ─────────────────────────────────────────────────────────

function ApptCard({
  appt,
  onEdit,
  onDelete,
}: {
  appt: Appointment
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="group rounded-lg border bg-card px-3 py-2.5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{appt.title}</p>
          {appt.patient && (
            <Link
              to={`/pazienti/${appt.patient.id}`}
              className="flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
              onClick={e => e.stopPropagation()}
            >
              <User className="h-3 w-3 shrink-0" />
              {appt.patient.first_name} {appt.patient.last_name}
            </Link>
          )}
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3 shrink-0" />
            {formatTimeRange(appt.start_time, appt.end_time)}
          </div>
          {appt.notes && (
            <p className="mt-1 text-xs text-muted-foreground/80 truncate">{appt.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={onEdit}
            title="Modifica"
            className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            title="Elimina"
            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function AppointmentsPage() {
  const [searchParams] = useSearchParams()
  const defaultPatientId = searchParams.get('paziente') ?? undefined

  // Week navigation
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOf(new Date()))
  const weekStartStr = toISODate(weekStart)

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false)
  const [createDate, setCreateDate] = useState<string>('')
  const [editAppt, setEditAppt] = useState<Appointment | null>(null)
  const [deleteAppt, setDeleteAppt] = useState<Appointment | null>(null)

  const { data: appointments, isLoading } = useWeekAppointments(weekStartStr)

  // If opened from patient calendar link, auto-open create dialog on that patient
  useEffect(() => {
    if (defaultPatientId) {
      setCreateDate(toISODate(weekStart))
      setCreateOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = toISODate(new Date())

  // Group appointments by date
  const apptsByDate: Record<string, Appointment[]> = {}
  for (const appt of appointments ?? []) {
    if (!apptsByDate[appt.date]) apptsByDate[appt.date] = []
    apptsByDate[appt.date].push(appt)
  }

  const monthLabel = (() => {
    const start = weekStart
    const end = addDays(weekStart, 6)
    if (start.getMonth() === end.getMonth()) {
      return `${MONTHS_IT[start.getMonth()]} ${start.getFullYear()}`
    }
    return `${MONTHS_IT[start.getMonth()]} – ${MONTHS_IT[end.getMonth()]} ${end.getFullYear()}`
  })()

  function prevWeek() { setWeekStart(d => addDays(d, -7)) }
  function nextWeek() { setWeekStart(d => addDays(d, 7)) }
  function goToday() { setWeekStart(getMondayOf(new Date())) }

  function openCreate(date: string) {
    setCreateDate(date)
    setCreateOpen(true)
  }

  const totalThisWeek = (appointments ?? []).length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Calendario</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">{totalThisWeek} appuntamenti questa settimana</p>
        </div>
        <Button size="sm" onClick={() => openCreate(today)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />Nuovo appuntamento
        </Button>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={prevWeek} className="h-9 w-9 p-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={nextWeek} className="h-9 w-9 p-0">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="font-semibold text-sm flex-1 truncate">{monthLabel}</span>
        <Button variant="ghost" size="sm" onClick={goToday} className="text-muted-foreground shrink-0">
          Oggi
        </Button>
      </div>

      {/* Week grid — desktop (≥ sm) */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Desktop: 7-column grid */}
          <div className="hidden sm:grid grid-cols-7 gap-2">
            {weekDays.map((day, i) => {
              const dateStr = toISODate(day)
              const isToday = dateStr === today
              const dayAppts = apptsByDate[dateStr] ?? []

              return (
                <div key={dateStr} className="min-w-0">
                  <div
                    className={cn(
                      'flex flex-col items-center py-2 rounded-lg mb-2 cursor-pointer transition-colors',
                      isToday ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    )}
                    onClick={() => openCreate(dateStr)}
                    title={`Aggiungi – ${DAY_LABELS_FULL[i]}`}
                  >
                    <span className={cn('text-[10px] font-medium uppercase tracking-wide', isToday ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                      {DAY_LABELS_SHORT[i]}
                    </span>
                    <span className={cn('text-lg font-bold leading-tight', isToday ? 'text-primary-foreground' : '')}>
                      {day.getDate()}
                    </span>
                  </div>
                  <div className="space-y-1.5 min-h-[40px]">
                    {dayAppts.map(appt => (
                      <ApptCard key={appt.id} appt={appt} onEdit={() => setEditAppt(appt)} onDelete={() => setDeleteAppt(appt)} />
                    ))}
                    {dayAppts.length === 0 && (
                      <button
                        onClick={() => openCreate(dateStr)}
                        className="w-full flex items-center justify-center py-3 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors rounded-lg border border-dashed border-muted-foreground/20 hover:border-muted-foreground/40"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Mobile: agenda list */}
          <div className="sm:hidden space-y-3">
            {weekDays.map((day, i) => {
              const dateStr = toISODate(day)
              const isToday = dateStr === today
              const dayAppts = apptsByDate[dateStr] ?? []

              return (
                <div key={dateStr} className={cn('rounded-xl border', isToday && 'border-primary/40 bg-primary/5')}>
                  {/* Day header row */}
                  <button
                    className="w-full flex items-center justify-between px-4 py-3"
                    onClick={() => openCreate(dateStr)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'flex h-9 w-9 flex-col items-center justify-center rounded-lg text-center',
                        isToday ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      )}>
                        <span className="text-[9px] uppercase font-semibold leading-none">{DAY_LABELS_SHORT[i]}</span>
                        <span className="text-base font-bold leading-tight">{day.getDate()}</span>
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">
                        {dayAppts.length > 0 ? `${dayAppts.length} appuntament${dayAppts.length === 1 ? 'o' : 'i'}` : 'Nessun appuntamento'}
                      </span>
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </button>

                  {dayAppts.length > 0 && (
                    <div className="px-3 pb-3 space-y-2">
                      {dayAppts.map(appt => (
                        <ApptCard key={appt.id} appt={appt} onEdit={() => setEditAppt(appt)} onDelete={() => setDeleteAppt(appt)} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Upcoming card below grid - full agenda for the week */}
      {(appointments?.length ?? 0) > 0 && (
        <Card>
          <CardContent className="pt-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Agenda settimana
            </h3>
            <div className="space-y-2">
              {appointments?.map(appt => (
                <div key={appt.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                  <div className="text-center min-w-[48px]">
                    <Badge variant="secondary" className="text-[10px] px-1.5">{appt.date}</Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{appt.title}</p>
                    {appt.patient && (
                      <Link to={`/pazienti/${appt.patient.id}`} className="text-xs text-primary hover:underline">
                        {appt.patient.first_name} {appt.patient.last_name}
                      </Link>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{formatTimeRange(appt.start_time, appt.end_time)}</span>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setEditAppt(appt)} className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeleteAppt(appt)} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      {createOpen && (
        <AppointmentDialog
          defaultDate={createDate}
          defaultPatientId={defaultPatientId}
          onClose={() => setCreateOpen(false)}
        />
      )}
      {editAppt && (
        <AppointmentDialog
          appointment={editAppt}
          onClose={() => setEditAppt(null)}
        />
      )}
      {deleteAppt && (
        <DeleteDialog
          appointment={deleteAppt}
          onClose={() => setDeleteAppt(null)}
        />
      )}
    </div>
  )
}
