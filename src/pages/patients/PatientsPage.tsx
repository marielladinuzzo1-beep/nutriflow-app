import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, Search, UserCheck, UserX, ChevronRight,
  Pencil, Trash2, Loader2, AlertTriangle, Mail,
  MessageCircle, CheckCircle2, Clock,
} from 'lucide-react'
import { usePatients, useCreatePatient, useUpdatePatient, useDeletePatient, useInvitePatient, useTrackWhatsApp } from '@/hooks/usePatients'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { patientSchema, type PatientFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate } from '@/lib/utils'
import { toast } from '@/components/ui/toast'
import type { Patient } from '@/types'

// ─── Shared patient form fields ───────────────────────────────────────────────

function PatientFormFields({
  register,
  errors,
  setValue,
  defaultGender,
  defaultStatus,
}: {
  register: ReturnType<typeof useForm<PatientFormData>>['register']
  errors: ReturnType<typeof useForm<PatientFormData>>['formState']['errors']
  setValue: ReturnType<typeof useForm<PatientFormData>>['setValue']
  defaultGender?: string
  defaultStatus?: boolean
}) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nome *</Label>
          <Input placeholder="Mario" {...register('first_name')} />
          {errors.first_name && <p className="text-xs text-destructive">{errors.first_name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Cognome *</Label>
          <Input placeholder="Rossi" {...register('last_name')} />
          {errors.last_name && <p className="text-xs text-destructive">{errors.last_name.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" placeholder="mario@esempio.it" {...register('email')} />
        </div>
        <div className="space-y-2">
          <Label>Telefono</Label>
          <Input placeholder="+39 333 1234567" {...register('phone')} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Data di nascita</Label>
          <Input type="date" {...register('date_of_birth')} />
        </div>
        <div className="space-y-2">
          <Label>Genere</Label>
          <Select defaultValue={defaultGender} onValueChange={(v) => setValue('gender', v as 'M' | 'F' | 'altro')}>
            <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="M">Maschile</SelectItem>
              <SelectItem value="F">Femminile</SelectItem>
              <SelectItem value="altro">Altro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Stato</Label>
        <Select defaultValue={defaultStatus === false ? 'false' : 'true'} onValueChange={(v) => setValue('is_active', v === 'true')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Attivo</SelectItem>
            <SelectItem value="false">Inattivo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Note</Label>
        <Textarea placeholder="Allergie, patologie, note anamnestiche..." {...register('notes')} rows={3} />
      </div>

      <div className="flex items-start gap-2">
        <input type="checkbox" id="gdpr_field" {...register('gdpr_consent')} className="mt-1" />
        <Label htmlFor="gdpr_field" className="text-sm font-normal">
          Il paziente ha fornito consenso al trattamento dei dati (GDPR)
        </Label>
      </div>
    </>
  )
}

// ─── E.164 phone helper ───────────────────────────────────────────────────────

function toE164(raw: string): string {
  // Rimuove tutto tranne le cifre
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  // Già internazionale (es. 39333...)
  if (digits.length >= 11) return digits
  // Numero italiano senza prefisso (10 cifre o meno)
  return '39' + digits
}

function buildWhatsAppUrl(phone: string, text: string): string {
  const e164 = toE164(phone)
  if (!e164) return ''
  return `https://wa.me/${e164}?text=${encodeURIComponent(text)}`
}

// ─── Invite dialog ────────────────────────────────────────────────────────────

function InviteDialog({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const invitePatient = useInvitePatient()
  const trackWhatsApp = useTrackWhatsApp()

  const appUrl = window.location.origin
  const waText = `Ciao ${patient.first_name}, ti invito ad accedere al tuo portale nutrizionale NutriFlow.\n\nRegistrati o accedi qui: ${appUrl}/portale\n\nUsa questa email: ${patient.email ?? ''}`
  const waUrl = patient.phone ? buildWhatsAppUrl(patient.phone, waText) : ''

  async function handleEmailInvite() {
    if (!patient.email) return
    try {
      await invitePatient.mutateAsync({ patientId: patient.id, email: patient.email })
      toast.success(`Magic link inviato a ${patient.email}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore invio email')
    }
  }

  function handleWhatsApp() {
    if (!waUrl) return
    trackWhatsApp.mutate(patient.id)
    window.open(waUrl, '_blank', 'noopener,noreferrer')
  }

  const emailAlreadySent = !!patient.invite_sent_at
  const waAlreadyOpened = !!patient.invite_whatsapp_at

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" />Invita paziente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Invia al paziente un link per accedere al portale.
            Una volta registrato con <strong>{patient.email ?? 'la sua email'}</strong> avrà accesso solo
            ai propri appuntamenti, piani alimentari e messaggi.
          </p>

          {/* Email */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Email</span>
              </div>
              {emailAlreadySent && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Inviata {new Date(patient.invite_sent_at!).toLocaleDateString('it-IT')}
                </span>
              )}
            </div>
            {!patient.email ? (
              <p className="text-xs text-muted-foreground">Nessuna email associata — aggiungila nella scheda paziente.</p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Supabase invierà un magic link a <strong>{patient.email}</strong>.
                  Il paziente clicca il link e accede direttamente, senza password.
                </p>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleEmailInvite}
                  disabled={invitePatient.isPending}
                >
                  {invitePatient.isPending
                    ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Invio...</>
                    : emailAlreadySent
                      ? <><Clock className="mr-2 h-3.5 w-3.5" />Invia di nuovo</>
                      : <><Mail className="mr-2 h-3.5 w-3.5" />Invia magic link</>}
                </Button>
              </>
            )}
          </div>

          {/* WhatsApp */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">WhatsApp</span>
              </div>
              {waAlreadyOpened && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Aperto {new Date(patient.invite_whatsapp_at!).toLocaleDateString('it-IT')}
                </span>
              )}
            </div>
            {!patient.phone ? (
              <p className="text-xs text-muted-foreground">Nessun numero associato — aggiungilo nella scheda paziente.</p>
            ) : !waUrl ? (
              <p className="text-xs text-muted-foreground">Numero non valido per WhatsApp.</p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Apre WhatsApp Web/App con testo precompilato a {patient.phone}.
                  Nessun invio automatico — dovrai premere Invia tu.
                </p>
                <div className="rounded bg-muted/50 p-2 text-xs text-muted-foreground whitespace-pre-wrap">
                  {waText}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-green-500 text-green-700 hover:bg-green-50"
                  onClick={handleWhatsApp}
                >
                  <MessageCircle className="mr-2 h-3.5 w-3.5" />
                  Apri WhatsApp
                </Button>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Chiudi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit patient dialog ──────────────────────────────────────────────────────

function EditPatientDialog({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const updatePatient = useUpdatePatient()
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      first_name: patient.first_name,
      last_name: patient.last_name,
      email: patient.email ?? '',
      phone: patient.phone ?? '',
      date_of_birth: patient.date_of_birth ?? '',
      gender: patient.gender,
      notes: patient.notes ?? '',
      is_active: patient.is_active,
      gdpr_consent: patient.gdpr_consent,
    },
  })

  async function onSubmit(data: PatientFormData) {
    try {
      await updatePatient.mutateAsync({ id: patient.id, ...data })
      toast.success('Paziente aggiornato')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante il salvataggio')
    }
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Modifica paziente</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <PatientFormFields
            register={register}
            errors={errors}
            setValue={setValue}
            defaultGender={patient.gender}
            defaultStatus={patient.is_active}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvataggio...</> : 'Salva modifiche'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Confirm delete dialog ────────────────────────────────────────────────────

function ConfirmDeleteDialog({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const deletePatient = useDeletePatient()

  async function handleDelete() {
    try {
      await deletePatient.mutateAsync(patient.id)
      toast.success(`${patient.first_name} ${patient.last_name} eliminato`)
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
            <AlertTriangle className="h-4 w-4" />Elimina paziente
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Sei sicuro di voler eliminare <strong>{patient.first_name} {patient.last_name}</strong>?
          Verranno eliminati anche tutte le misurazioni, i piani alimentari e i messaggi associati.
          L'operazione non è reversibile.
        </p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button variant="destructive" disabled={deletePatient.isPending} onClick={handleDelete}>
            {deletePatient.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Eliminazione...</> : <><Trash2 className="mr-2 h-4 w-4" />Elimina definitivamente</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function PatientsPage() {
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editPatient, setEditPatient] = useState<Patient | null>(null)
  const [deletePatient, setDeletePatient] = useState<Patient | null>(null)
  const [invitePatient, setInvitePatient] = useState<Patient | null>(null)

  const { data: patients, isLoading } = usePatients()
  const createPatient = useCreatePatient()

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: { is_active: true, gdpr_consent: false },
  })

  const filtered = patients?.filter(p =>
    `${p.first_name} ${p.last_name} ${p.email ?? ''}`.toLowerCase().includes(search.toLowerCase())
  ) ?? []

  async function onSubmit(data: PatientFormData) {
    try {
      await createPatient.mutateAsync(data)
      toast.success('Paziente registrato')
      reset()
      setCreateOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante il salvataggio')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Pazienti</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">{patients?.length ?? 0} pazienti registrati</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" />Nuovo paziente
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Cerca per nome o email..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 rounded-xl border border-dashed border-border text-center">
          <p className="text-[13px] text-muted-foreground">{search ? 'Nessun paziente trovato' : 'Nessun paziente ancora'}</p>
          {!search && <Button onClick={() => setCreateOpen(true)} variant="outline" size="sm"><Plus className="mr-2 h-3.5 w-3.5" />Aggiungi il primo paziente</Button>}
        </div>
      ) : (
        <Card>
          <div className="divide-y divide-border/60">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="group flex items-center gap-3 px-5 py-3.5 hover:bg-accent/50 transition-colors first:rounded-t-xl last:rounded-b-xl"
              >
                {/* Clickable area: avatar + name */}
                <Link to={`/pazienti/${p.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-[12px] font-semibold shrink-0">
                    {p.first_name[0]}{p.last_name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium leading-snug">{p.first_name} {p.last_name}</p>
                    <p className="text-[12px] text-muted-foreground truncate">
                      {p.email ?? 'Nessuna email'}{p.date_of_birth ? ` · ${formatDate(p.date_of_birth)}` : ''}
                    </p>
                  </div>
                </Link>

                {/* Right side: badge + actions + chevron */}
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={p.is_active ? 'success' : 'secondary'} className="shrink-0">
                    {p.is_active ? <><UserCheck className="mr-1 h-3 w-3" />Attivo</> : <><UserX className="mr-1 h-3 w-3" />Inattivo</>}
                  </Badge>

                  {/* Action buttons — visible on hover */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      title="Invita"
                      onClick={() => setInvitePatient(p)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </button>
                    <button
                      title="Modifica"
                      onClick={() => setEditPatient(p)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      title="Elimina"
                      onClick={() => setDeletePatient(p)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <Link to={`/pazienti/${p.id}`} tabIndex={-1} aria-hidden>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Nuovo paziente</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <PatientFormFields register={register} errors={errors} setValue={setValue} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Annulla</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvataggio...</> : 'Salva paziente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {invitePatient && <InviteDialog patient={invitePatient} onClose={() => setInvitePatient(null)} />}
      {editPatient && <EditPatientDialog patient={editPatient} onClose={() => setEditPatient(null)} />}
      {deletePatient && <ConfirmDeleteDialog patient={deletePatient} onClose={() => setDeletePatient(null)} />}
    </div>
  )
}
