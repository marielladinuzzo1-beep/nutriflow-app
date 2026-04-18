import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Loader2, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { usePatients } from '@/hooks/usePatients'
import { useMeasurements, useCreateMeasurement, useUpdateMeasurement, useDeleteMeasurement } from '@/hooks/useMeasurements'
import { measurementSchema, type MeasurementFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate, formatWeight, getBMICategory } from '@/lib/utils'
import { toast } from '@/components/ui/toast'
import type { Measurement } from '@/types'

// ─── Shared measurement form fields ──────────────────────────────────────────

function MeasurementFormFields({
  register,
  errors,
  selectedPatientId,
}: {
  register: ReturnType<typeof useForm<MeasurementFormData>>['register']
  errors: ReturnType<typeof useForm<MeasurementFormData>>['formState']['errors']
  selectedPatientId: string
}) {
  return (
    <>
      <input type="hidden" {...register('patient_id')} value={selectedPatientId} />

      <div className="space-y-2">
        <Label>Data misurazione *</Label>
        <Input type="date" {...register('measured_at')} />
        {errors.measured_at && <p className="text-xs text-destructive">{errors.measured_at.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Peso (kg)</Label><Input type="number" step="0.1" placeholder="70.5" {...register('weight_kg')} /></div>
        <div className="space-y-2"><Label>Altezza (cm)</Label><Input type="number" placeholder="175" {...register('height_cm')} /></div>
        <div className="space-y-2"><Label>% Massa grassa</Label><Input type="number" step="0.1" placeholder="18.5" {...register('body_fat_pct')} /></div>
        <div className="space-y-2"><Label>Massa magra (kg)</Label><Input type="number" step="0.1" placeholder="55.0" {...register('muscle_mass_kg')} /></div>
        <div className="space-y-2"><Label>Circonf. vita (cm)</Label><Input type="number" step="0.1" placeholder="80" {...register('waist_cm')} /></div>
        <div className="space-y-2"><Label>Circonf. fianchi (cm)</Label><Input type="number" step="0.1" placeholder="95" {...register('hip_cm')} /></div>
        <div className="space-y-2"><Label>Circonf. braccio (cm)</Label><Input type="number" step="0.1" placeholder="32" {...register('arm_cm')} /></div>
      </div>

      <div className="space-y-2">
        <Label>Note</Label>
        <Textarea placeholder="Note sulla misurazione..." {...register('notes')} rows={2} />
      </div>
    </>
  )
}

// ─── Edit measurement dialog ──────────────────────────────────────────────────

function EditMeasurementDialog({ measurement, onClose }: { measurement: Measurement; onClose: () => void }) {
  const updateMeasurement = useUpdateMeasurement()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<MeasurementFormData>({
    resolver: zodResolver(measurementSchema),
    defaultValues: {
      patient_id: measurement.patient_id,
      measured_at: measurement.measured_at,
      weight_kg: measurement.weight_kg ?? undefined,
      height_cm: measurement.height_cm ?? undefined,
      body_fat_pct: measurement.body_fat_pct ?? undefined,
      muscle_mass_kg: measurement.muscle_mass_kg ?? undefined,
      waist_cm: measurement.waist_cm ?? undefined,
      hip_cm: measurement.hip_cm ?? undefined,
      arm_cm: measurement.arm_cm ?? undefined,
      notes: measurement.notes ?? '',
    },
  })

  async function onSubmit(data: MeasurementFormData) {
    try {
      await updateMeasurement.mutateAsync({ id: measurement.id, ...data })
      toast.success('Misurazione aggiornata')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante il salvataggio')
    }
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Modifica misurazione</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <MeasurementFormFields register={register} errors={errors} selectedPatientId={measurement.patient_id} />
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

function ConfirmDeleteDialog({ measurement, onClose }: { measurement: Measurement; onClose: () => void }) {
  const deleteMeasurement = useDeleteMeasurement()

  async function handleDelete() {
    try {
      await deleteMeasurement.mutateAsync({ id: measurement.id, patientId: measurement.patient_id })
      toast.success('Misurazione eliminata')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore durante l'eliminazione")
    }
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />Elimina misurazione
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Sei sicuro di voler eliminare la misurazione del <strong>{formatDate(measurement.measured_at)}</strong>?
          L'operazione non è reversibile.
        </p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button variant="destructive" disabled={deleteMeasurement.isPending} onClick={handleDelete}>
            {deleteMeasurement.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Eliminazione...</> : <><Trash2 className="mr-2 h-4 w-4" />Elimina</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function MeasurementsPage() {
  const [searchParams] = useSearchParams()
  const defaultPatientId = searchParams.get('paziente') ?? ''
  const [selectedPatientId, setSelectedPatientId] = useState(defaultPatientId)
  const [createOpen, setCreateOpen] = useState(false)
  const [editMeasurement, setEditMeasurement] = useState<Measurement | null>(null)
  const [deleteMeasurement, setDeleteMeasurement] = useState<Measurement | null>(null)

  const { data: patients } = usePatients()
  const { data: measurements, isLoading } = useMeasurements(selectedPatientId)
  const createMeasurement = useCreateMeasurement()

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<MeasurementFormData>({
    resolver: zodResolver(measurementSchema),
    defaultValues: {
      patient_id: defaultPatientId,
      measured_at: new Date().toISOString().split('T')[0],
    },
  })

  async function onSubmit(data: MeasurementFormData) {
    try {
      await createMeasurement.mutateAsync(data)
      toast.success('Misurazione salvata')
      reset({ patient_id: selectedPatientId, measured_at: new Date().toISOString().split('T')[0] })
      setCreateOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante il salvataggio')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Misurazioni</h1>
        <Button onClick={() => setCreateOpen(true)} disabled={!selectedPatientId}>
          <Plus className="mr-2 h-4 w-4" />Nuova misurazione
        </Button>
      </div>

      {/* Seleziona paziente */}
      <Card>
        <CardContent className="pt-4">
          <Label>Seleziona paziente</Label>
          <div className="mt-2 max-w-xs">
            <Select value={selectedPatientId} onValueChange={(v) => { setSelectedPatientId(v); setValue('patient_id', v) }}>
              <SelectTrigger><SelectValue placeholder="Scegli un paziente..." /></SelectTrigger>
              <SelectContent>
                {patients?.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista misurazioni */}
      {!selectedPatientId ? (
        <p className="text-center text-muted-foreground py-12">Seleziona un paziente per vedere le misurazioni</p>
      ) : isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {measurements?.map(m => (
            <div key={m.id} className="relative group">
              <Card>
                <CardContent className="p-4 pr-20">
                  <div className="flex items-start justify-between">
                    <p className="font-medium">{formatDate(m.measured_at)}</p>
                    {m.bmi && (
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        <span className="text-primary">BMI {m.bmi}</span>
                        <span className={`text-xs font-normal ${getBMICategory(m.bmi).color}`}>{getBMICategory(m.bmi).label}</span>
                      </span>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                    {m.weight_kg && <div><span className="text-muted-foreground">Peso:</span> {formatWeight(m.weight_kg)}</div>}
                    {m.height_cm && <div><span className="text-muted-foreground">Altezza:</span> {m.height_cm} cm</div>}
                    {m.body_fat_pct && <div><span className="text-muted-foreground">Grasso:</span> {m.body_fat_pct}%</div>}
                    {m.muscle_mass_kg && <div><span className="text-muted-foreground">Muscolo:</span> {m.muscle_mass_kg} kg</div>}
                    {m.waist_cm && <div><span className="text-muted-foreground">Vita:</span> {m.waist_cm} cm</div>}
                    {m.hip_cm && <div><span className="text-muted-foreground">Fianchi:</span> {m.hip_cm} cm</div>}
                    {m.arm_cm && <div><span className="text-muted-foreground">Braccio:</span> {m.arm_cm} cm</div>}
                  </div>
                  {m.notes && <p className="text-sm text-muted-foreground mt-2">{m.notes}</p>}
                </CardContent>
              </Card>
              {/* Edit / delete hover buttons */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  title="Modifica"
                  onClick={() => setEditMeasurement(m)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  title="Elimina"
                  onClick={() => setDeleteMeasurement(m)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          {measurements?.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nessuna misurazione per questo paziente</p>
          )}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuova misurazione</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <MeasurementFormFields register={register} errors={errors} selectedPatientId={selectedPatientId} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Annulla</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvataggio...</> : 'Salva'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      {editMeasurement && <EditMeasurementDialog measurement={editMeasurement} onClose={() => setEditMeasurement(null)} />}

      {/* Delete confirm */}
      {deleteMeasurement && <ConfirmDeleteDialog measurement={deleteMeasurement} onClose={() => setDeleteMeasurement(null)} />}
    </div>
  )
}
