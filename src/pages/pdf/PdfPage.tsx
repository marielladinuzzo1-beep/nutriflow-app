import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileText, Download, Loader2, Eye } from 'lucide-react'
import { useMealPlan, useMealPlans } from '@/hooks/useMealPlans'
import { usePatients } from '@/hooks/usePatients'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast'

export function PdfPage() {
  const [searchParams] = useSearchParams()
  const [selectedPlanId, setSelectedPlanId] = useState(searchParams.get('piano') ?? '')
  const [generating, setGenerating] = useState(false)

  const { data: plans } = useMealPlans()
  const { data: patients } = usePatients()
  const { data: plan } = useMealPlan(selectedPlanId)
  const { profile } = useAuth()

  const patient = patients?.find(p => p.id === plan?.patient_id)

  async function generatePDF() {
    if (!plan) return
    setGenerating(true)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const { MealPlanPDF } = await import('@/components/pdf/MealPlanPDF')

      const blob = await pdf(
        <MealPlanPDF
          plan={plan}
          patient={patient}
          nutritionistName={profile?.full_name}
        />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `piano-${plan.name.toLowerCase().replace(/\s+/g, '-')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('PDF generato e scaricato con successo')
    } catch (err) {
      console.error(err)
      toast.error('Errore durante la generazione del PDF')
    } finally {
      setGenerating(false)
    }
  }

  const statusLabel: Record<string, string> = {
    draft: 'Bozza', active: 'Attivo', completed: 'Completato', archived: 'Archiviato',
  }
  const statusVariant: Record<string, 'warning' | 'success' | 'secondary' | 'outline'> = {
    draft: 'warning', active: 'success', completed: 'secondary', archived: 'outline',
  }

  const totalDays = plan?.days?.length ?? 0
  const totalItems = plan?.days?.reduce((s, d) => s + (d.items?.length ?? 0), 0) ?? 0

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Genera PDF</h1>
        <p className="text-muted-foreground">Esporta piani alimentari in formato PDF professionale</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seleziona piano alimentare</CardTitle>
          <CardDescription>Il PDF includerà tutti i giorni e gli alimenti del piano</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Piano</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="Scegli un piano..." />
              </SelectTrigger>
              <SelectContent>
                {plans?.map(p => {
                  const pat = patients?.find(pt => pt.id === p.patient_id)
                  return (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {pat ? `— ${pat.first_name} ${pat.last_name}` : ''}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {plan && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{plan.name}</p>
                  {patient && (
                    <p className="text-sm text-muted-foreground">
                      Paziente: {patient.first_name} {patient.last_name}
                    </p>
                  )}
                </div>
                <Badge variant={statusVariant[plan.status] ?? 'secondary'}>
                  {statusLabel[plan.status] ?? plan.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {plan.target_kcal && (
                  <div>
                    <span className="text-muted-foreground">Target: </span>
                    <span className="font-medium">{plan.target_kcal} kcal/die</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Giorni: </span>
                  <span className="font-medium">{totalDays}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Alimenti totali: </span>
                  <span className="font-medium">{totalItems}</span>
                </div>
                {plan.start_date && (
                  <div>
                    <span className="text-muted-foreground">Inizio: </span>
                    <span className="font-medium">
                      {new Date(plan.start_date).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                )}
              </div>

              {totalDays === 0 && (
                <p className="text-sm text-amber-600 bg-amber-50 rounded px-3 py-2">
                  Il piano non ha giorni. Aggiungi giorni e alimenti prima di generare il PDF.
                </p>
              )}
            </div>
          )}

          <Button
            onClick={generatePDF}
            disabled={!selectedPlanId || generating}
            className="w-full gap-2"
            size="lg"
          >
            {generating
              ? <><Loader2 className="h-4 w-4 animate-spin" />Generazione in corso...</>
              : <><Download className="h-4 w-4" />Genera e scarica PDF</>
            }
          </Button>
        </CardContent>
      </Card>

      {/* Info card */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            Cosa include il PDF
          </h3>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              Header con logo NutriFlow e dati del nutrizionista
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              Scheda paziente con dati anagrafici e obiettivi
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              Target macro giornalieri (kcal, P, C, G)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              Piano dettagliato per ogni giorno: colazione, spuntini, pranzo e cena
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              Per ogni alimento: nome, quantità, kcal e macronutrienti (P/C/G)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              Totali nutrizionali per ogni pasto e per il giorno intero
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              Footer con nota privacy GDPR e numerazione pagine
            </li>
          </ul>
        </CardContent>
      </Card>

      {!plans?.length && (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Nessun piano alimentare disponibile.<br />Creane uno dalla sezione Piani alimentari.</p>
        </div>
      )}
    </div>
  )
}
