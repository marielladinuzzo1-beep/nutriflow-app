import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Plus, Loader2, ChevronRight, Trash2 } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMealPlans, useCreateMealPlan, useDeleteMealPlan } from '@/hooks/useMealPlans'
import { usePatients } from '@/hooks/usePatients'
import { mealPlanSchema, type MealPlanFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate } from '@/lib/utils'
import { toast } from '@/components/ui/toast'

const statusLabel: Record<string, string> = {
  draft: 'Bozza', active: 'Attivo', completed: 'Completato', archived: 'Archiviato'
}
const statusVariant: Record<string, 'warning' | 'success' | 'secondary' | 'outline'> = {
  draft: 'warning', active: 'success', completed: 'secondary', archived: 'outline'
}

export function MealPlansPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const defaultPatientId = searchParams.get('paziente') ?? undefined
  const defaultKcal = searchParams.get('kcal') ?? undefined
  const defaultProtein = searchParams.get('proteine') ?? undefined
  const defaultCarbs = searchParams.get('carbs') ?? undefined
  const defaultFat = searchParams.get('grassi') ?? undefined
  const [open, setOpen] = useState(!!defaultPatientId)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const { data: plans, isLoading } = useMealPlans()
  const { data: patients } = usePatients()
  const createPlan = useCreateMealPlan()
  const deletePlan = useDeleteMealPlan()

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<MealPlanFormData>({
    resolver: zodResolver(mealPlanSchema),
    defaultValues: {
      patient_id: defaultPatientId ?? '',
      status: 'draft',
      target_kcal: defaultKcal ? Number(defaultKcal) : '',
      target_protein_g: defaultProtein ? Number(defaultProtein) : '',
      target_carbs_g: defaultCarbs ? Number(defaultCarbs) : '',
      target_fat_g: defaultFat ? Number(defaultFat) : '',
    },
  })

  async function handleDelete(planId: string) {
    try {
      await deletePlan.mutateAsync(planId)
      setConfirmDeleteId(null)
      toast.success('Piano eliminato')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante l\'eliminazione')
    }
  }

  async function onSubmit(data: MealPlanFormData) {
    try {
      const plan = await createPlan.mutateAsync(data)
      reset()
      setOpen(false)
      navigate(`/piani/${plan.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante la creazione del piano')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Piani alimentari</h1>
          <p className="text-muted-foreground">{plans?.length ?? 0} piani</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nuovo piano</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {plans?.map(plan => {
            const patient = patients?.find(p => p.id === plan.patient_id)
            return (
              <div key={plan.id} className="relative group">
                <Link to={`/piani/${plan.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">{plan.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {patient ? `${patient.first_name} ${patient.last_name}` : 'Paziente non trovato'}
                          {plan.target_kcal ? ` • ${plan.target_kcal} kcal/die` : ''}
                          {plan.start_date ? ` • dal ${formatDate(plan.start_date)}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pr-8">
                        <Badge variant={statusVariant[plan.status] ?? 'secondary'}>{statusLabel[plan.status] ?? plan.status}</Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => { e.preventDefault(); setConfirmDeleteId(plan.id) }}
                  title="Elimina piano"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}
          {!plans?.length && (
            <Card><CardContent className="flex justify-center py-16 text-muted-foreground">Nessun piano alimentare</CardContent></Card>
          )}
        </div>
      )}

      {/* Confirm delete plan */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(v) => { if (!v) setConfirmDeleteId(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Elimina piano alimentare</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Sei sicuro? Verranno eliminati anche tutti i giorni e gli alimenti del piano. L'operazione non è reversibile.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Annulla</Button>
            <Button
              variant="destructive"
              disabled={deletePlan.isPending}
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
            >
              {deletePlan.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nuovo piano alimentare</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Paziente *</Label>
              <Controller
                name="patient_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Seleziona paziente..." /></SelectTrigger>
                    <SelectContent>
                      {patients?.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.patient_id && <p className="text-xs text-destructive">{errors.patient_id.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Nome piano *</Label>
              <Input placeholder="Es: Piano dimagrimento estate 2025" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Data inizio</Label><Input type="date" {...register('start_date')} /></div>
              <div className="space-y-2"><Label>Data fine</Label><Input type="date" {...register('end_date')} /></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Target kcal/die</Label><Input type="number" placeholder="1800" {...register('target_kcal')} /></div>
              <div className="space-y-2"><Label>Proteine (g)</Label><Input type="number" placeholder="120" {...register('target_protein_g')} /></div>
              <div className="space-y-2"><Label>Carboidrati (g)</Label><Input type="number" placeholder="200" {...register('target_carbs_g')} /></div>
              <div className="space-y-2"><Label>Grassi (g)</Label><Input type="number" placeholder="60" {...register('target_fat_g')} /></div>
            </div>

            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea placeholder="Indicazioni, obiettivi, esclusioni alimentari..." {...register('notes')} rows={2} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creazione...</> : 'Crea piano'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
