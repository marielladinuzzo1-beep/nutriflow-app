import { useState } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Activity, UtensilsCrossed, BarChart2, Brain,
  Loader2, Pencil, Trash2, AlertTriangle,
  CheckSquare, Plus, X, Calendar, ClipboardList,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { usePatient, useUpdatePatient, useDeletePatient } from '@/hooks/usePatients'
import { useMeasurements, useUpdateMeasurement, useDeleteMeasurement } from '@/hooks/useMeasurements'
import { useMealPlans } from '@/hooks/useMealPlans'
import { useTodos, useCreateTodo, useToggleTodo, useDeleteTodo } from '@/hooks/useTodos'
import { usePatientFeedbackByProfile } from '@/hooks/usePatientFeedback'
import { supabase } from '@/lib/supabase'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { patientSchema, measurementSchema, type PatientFormData, type MeasurementFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/toast'
import {
  formatDate, calculateAge, calculateBMI, getBMICategory, formatWeight, cn,
} from '@/lib/utils'
import {
  generateMacroSuggestion, ACTIVITY_OPTIONS, GOAL_OPTIONS,
  type ActivityLevel, type Goal,
} from '@/lib/ai-suggestions'
import type { Patient, Measurement, TodoType } from '@/types'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, ReferenceLine, BarChart, Bar, Legend,
} from 'recharts'

// ─── Weekly calorie stacked bar chart ────────────────────────────────────────

function WeeklyCalorieChart({ patientId }: { patientId: string }) {
  const [xMode, setXMode] = useState<XMode>('giorni')
  const { data: plan } = useQuery({
    queryKey: ['patient_active_plan_calories', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('id, name, days:meal_plan_days(day_number, day_label, items:meal_plan_items(kcal, protein_g, carbs_g, fat_g))')
        .eq('patient_id', patientId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
    staleTime: 2 * 60 * 1000,
  })

  if (!plan) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nessun piano alimentare attivo. Attiva un piano per vedere il grafico calorie settimanali.
        </CardContent>
      </Card>
    )
  }

  const days = [...(plan.days ?? [])].sort((a, b) => a.day_number - b.day_number)
  const rawChartData = days.map(day => {
    const items = day.items ?? []
    const proteine = Math.round(items.reduce((s, i) => s + (i.protein_g ?? 0) * 4, 0))
    const carboidrati = Math.round(items.reduce((s, i) => s + (i.carbs_g ?? 0) * 4, 0))
    const grassi = Math.round(items.reduce((s, i) => s + (i.fat_g ?? 0) * 9, 0))
    return {
      date: day.day_label ?? `G${day.day_number}`,
      giorno: day.day_label ?? `G${day.day_number}`,
      proteine,
      carboidrati,
      grassi,
      totale: proteine + carboidrati + grassi,
    }
  })

  const chartData = xMode === 'giorni' ? rawChartData : aggregateByMode(
    rawChartData,
    xMode,
    items => ({
      giorno: items[0].giorno,
      proteine: Math.round(items.reduce((s, i) => s + i.proteine, 0) / items.length),
      carboidrati: Math.round(items.reduce((s, i) => s + i.carboidrati, 0) / items.length),
      grassi: Math.round(items.reduce((s, i) => s + i.grassi, 0) / items.length),
      totale: Math.round(items.reduce((s, i) => s + i.totale, 0) / items.length),
    })
  )

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Il piano attivo non ha ancora alimenti inseriti.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm">Calorie — {plan.name}</CardTitle>
            <p className="text-xs text-muted-foreground">Ripartizione per macronutrienti (kcal)</p>
          </div>
          <XAxisToggle value={xMode} onChange={setXMode} />
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit=" kcal" width={72} />
            <Tooltip
              formatter={(value, name) => {
                const labels: Record<string, string> = { proteine: 'Proteine', carboidrati: 'Carboidrati', grassi: 'Grassi' }
                return [`${value} kcal`, labels[String(name)] ?? String(name)]
              }}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Legend
              formatter={(v: string) => ({ proteine: 'Proteine', carboidrati: 'Carboidrati', grassi: 'Grassi' }[v] ?? v)}
              iconType="square"
              iconSize={10}
            />
            <Bar dataKey="proteine" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
            <Bar dataKey="carboidrati" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
            <Bar dataKey="grassi" stackId="a" fill="#f87171" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ─── Utility: aggregazione per asse X ────────────────────────────────────────

type XMode = 'giorni' | 'settimane' | 'mesi'

function XAxisToggle({ value, onChange }: { value: XMode; onChange: (v: XMode) => void }) {
  return (
    <div className="flex rounded-md border text-xs overflow-hidden">
      {(['giorni', 'settimane', 'mesi'] as XMode[]).map(m => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            'px-2.5 py-1 capitalize transition-colors',
            value === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          )}
        >
          {m}
        </button>
      ))}
    </div>
  )
}

const DAY_LABELS_IT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

function parseLocalDate(s: string): Date | null {
  const parts = s.split('/')
  if (parts.length !== 3) return null
  const [dd, mm, yyyy] = parts.map(Number)
  if (isNaN(dd) || isNaN(mm) || isNaN(yyyy)) return null
  return new Date(yyyy, mm - 1, dd)
}

function aggregateByMode<T extends { date: string }>(
  data: T[],
  mode: XMode,
  aggregate: (items: T[]) => Omit<T, 'date'>
): (Omit<T, 'date'> & { date: string })[] {
  if (mode === 'giorni') return data as (Omit<T, 'date'> & { date: string })[]

  if (mode === 'settimane') {
    // Show individual days (last 7 days of available data) with "Lun 14" labels
    const parsed = data
      .map(item => ({ item, d: parseLocalDate(item.date) }))
      .filter((x): x is { item: T; d: Date } => x.d !== null)
      .sort((a, b) => a.d.getTime() - b.d.getTime())
    // If dates are not in DD/MM/YYYY format (e.g. day names from meal plan chart), return as-is
    if (parsed.length === 0) return data as (Omit<T, 'date'> & { date: string })[]
    const lastDate = parsed[parsed.length - 1].d
    const cutoff = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate() - 6)
    return parsed
      .filter(x => x.d >= cutoff)
      .map(({ item, d }) => ({
        date: `${DAY_LABELS_IT[d.getDay()]} ${d.getDate()}`,
        ...aggregate([item]),
      }))
  }

  // mesi: group by month, average values
  const grouped = new Map<string, T[]>()
  for (const item of data) {
    const d = parseLocalDate(item.date)
    if (!d) continue
    const key = d.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(item)
  }
  return Array.from(grouped.entries()).map(([key, items]) => ({
    date: key,
    ...aggregate(items),
  }))
}

// ─── Weekly weight chart ──────────────────────────────────────────────────────

function WeightChart({ data }: { data: { date: string; peso: number | null | undefined }[] }) {
  const [xMode, setXMode] = useState<XMode>('giorni')

  const validData = data.filter(d => d.peso != null) as { date: string; peso: number }[]

  const displayed = aggregateByMode(validData, xMode, items => ({
    peso: Math.round(items.reduce((s, i) => s + i.peso, 0) / items.length * 10) / 10,
  }))

  if (validData.length < 2) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Servono almeno 2 misurazioni con peso per il grafico.
        </CardContent>
      </Card>
    )
  }
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm">Andamento peso ({displayed.length} punti)</CardTitle>
            <p className="text-xs text-muted-foreground">Valori in kg</p>
          </div>
          <XAxisToggle value={xMode} onChange={setXMode} />
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={displayed}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} unit=" kg" width={56} />
            <Tooltip
              formatter={v => [`${v} kg`, 'Peso']}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Line
              type="monotone"
              dataKey="peso"
              stroke="#16a34a"
              strokeWidth={2}
              dot={{ r: 4, fill: '#16a34a' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ─── BMI Zone chart ───────────────────────────────────────────────────────────

function BMIZoneChart({ data }: { data: { date: string; bmi: number }[] }) {
  const [xMode, setXMode] = useState<XMode>('giorni')

  const displayed = aggregateByMode(data, xMode, items => ({
    bmi: Math.round(items.reduce((s, i) => s + i.bmi, 0) / items.length * 10) / 10,
  }))

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <XAxisToggle value={xMode} onChange={setXMode} />
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={displayed}>
          <defs>
            <linearGradient id="bmiGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} domain={[14, 40]} />
          <Tooltip
            formatter={(v) => [`${v}`, 'BMI']}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <ReferenceLine y={18.5} stroke="#3b82f6" strokeDasharray="4 2" label={{ value: 'Sottopeso', position: 'right', fontSize: 9, fill: '#3b82f6' }} />
          <ReferenceLine y={25} stroke="#22c55e" strokeDasharray="4 2" label={{ value: 'Normopeso', position: 'right', fontSize: 9, fill: '#22c55e' }} />
          <ReferenceLine y={30} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: 'Sovrappeso', position: 'right', fontSize: 9, fill: '#f59e0b' }} />
          <Area type="monotone" dataKey="bmi" stroke="#16a34a" strokeWidth={2} fill="url(#bmiGrad)" dot={{ r: 4, fill: '#16a34a' }} activeDot={{ r: 6 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function BodyCompositionChart({ data }: { data: { date: string; fat: number; muscle: number }[] }) {
  const [xMode, setXMode] = useState<XMode>('giorni')

  const displayed = aggregateByMode(data, xMode, items => ({
    fat: Math.round(items.reduce((s, i) => s + i.fat, 0) / items.length * 10) / 10,
    muscle: Math.round(items.reduce((s, i) => s + i.muscle, 0) / items.length * 10) / 10,
  }))

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <XAxisToggle value={xMode} onChange={setXMode} />
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={displayed}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} unit=" kg" />
          <Tooltip
            formatter={(v, name) => [`${v} kg`, name === 'fat' ? 'Massa grassa' : 'Massa muscolare']}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Legend formatter={v => v === 'fat' ? 'Massa grassa' : 'Massa muscolare'} />
          <Bar dataKey="muscle" fill="#22c55e" radius={[3, 3, 0, 0]} name="muscle" />
          <Bar dataKey="fat" fill="#f87171" radius={[3, 3, 0, 0]} name="fat" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── AI Suggestion panel ──────────────────────────────────────────────────────

function AISuggestionsPanel({ patient, latestMeasurement }: {
  patient: Patient | undefined
  latestMeasurement: Measurement | undefined
}) {
  const [goal, setGoal] = useState<Goal>('maintain')
  const [activity, setActivity] = useState<ActivityLevel>('light')
  if (!patient) return null
  const suggestion = latestMeasurement ? generateMacroSuggestion(patient, latestMeasurement, goal, activity) : null

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Calcolo automatico dei macro target basato su dati antropometrici, livello di attività e obiettivo.
        Usa i valori come riferimento — personalizza in base alla valutazione clinica.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Obiettivo</Label>
          <Select value={goal} onValueChange={v => setGoal(v as Goal)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {GOAL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}><div><p>{o.label}</p><p className="text-xs text-muted-foreground">{o.description}</p></div></SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Livello attività</Label>
          <Select value={activity} onValueChange={v => setActivity(v as ActivityLevel)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACTIVITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}><div><p>{o.label}</p><p className="text-xs text-muted-foreground">{o.description}</p></div></SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      {!latestMeasurement ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Aggiungi almeno una misurazione (peso e altezza) per generare i suggerimenti macro.</CardContent></Card>
      ) : suggestion ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="border-primary/30 bg-primary/5"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Kcal suggerite</p><p className="text-2xl font-bold text-primary">{suggestion.kcal}</p></CardContent></Card>
            <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Proteine</p><p className="text-2xl font-bold text-blue-600">{suggestion.protein_g} g</p></CardContent></Card>
            <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Carboidrati</p><p className="text-2xl font-bold text-amber-600">{suggestion.carbs_g} g</p></CardContent></Card>
            <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Grassi</p><p className="text-2xl font-bold text-rose-600">{suggestion.fat_g} g</p></CardContent></Card>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border bg-muted/30 p-3 text-center"><p className="text-xs text-muted-foreground mb-1">BMR (Mifflin-St Jeor)</p><p className="font-semibold">{suggestion.bmr} kcal</p></div>
            <div className="rounded-lg border bg-muted/30 p-3 text-center"><p className="text-xs text-muted-foreground mb-1">TDEE</p><p className="font-semibold">{suggestion.tdee} kcal</p></div>
            <div className="rounded-lg border bg-muted/30 p-3 text-center"><p className="text-xs text-muted-foreground mb-1">BMI</p><p className={`font-semibold ${suggestion.bmi ? getBMICategory(suggestion.bmi).color : ''}`}>{suggestion.bmi ?? '—'} {suggestion.bmiLabel ? `(${suggestion.bmiLabel})` : ''}</p></div>
          </div>
          {suggestion.notes.length > 0 && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 space-y-1.5">
              <p className="text-xs font-semibold text-blue-700 mb-2">Note cliniche</p>
              {suggestion.notes.map((note, i) => (
                <p key={i} className="text-xs text-blue-700 flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />{note}
                </p>
              ))}
            </div>
          )}
          <Button asChild size="sm" variant="outline" className="w-full">
            <Link to={`/piani?paziente=${patient.id}&kcal=${suggestion.kcal}&proteine=${suggestion.protein_g}&carbs=${suggestion.carbs_g}&grassi=${suggestion.fat_g}`}>
              <UtensilsCrossed className="mr-2 h-4 w-4" />Crea piano alimentare con questi valori
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  )
}

// ─── Todos tab ────────────────────────────────────────────────────────────────

const TODO_TYPE_LABELS: Record<TodoType, string> = {
  task: 'Attività',
  reminder: 'Promemoria',
  followup: 'Follow-up',
  measurement: 'Misurazione',
  other: 'Altro',
}

const TODO_TYPE_COLORS: Record<TodoType, string> = {
  task: 'bg-blue-100 text-blue-700',
  reminder: 'bg-amber-100 text-amber-700',
  followup: 'bg-purple-100 text-purple-700',
  measurement: 'bg-green-100 text-green-700',
  other: 'bg-gray-100 text-gray-700',
}

function TodosTab({ patientId }: { patientId: string }) {
  const { data: todos, isLoading } = useTodos(patientId)
  const createTodo = useCreateTodo()
  const toggleTodo = useToggleTodo()
  const deleteTodo = useDeleteTodo()

  const [addOpen, setAddOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<TodoType>('task')
  const [deadline, setDeadline] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    try {
      await createTodo.mutateAsync({
        title: title.trim(),
        type,
        patient_id: patientId,
        deadline: deadline || undefined,
      })
      setTitle('')
      setType('task')
      setDeadline('')
      setAddOpen(false)
      toast.success('To-do aggiunto')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    }
  }

  const pending = todos?.filter(t => !t.completed) ?? []
  const done = todos?.filter(t => t.completed) ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">To-do paziente</h2>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />Aggiungi
        </Button>
      </div>

      {addOpen && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Titolo *</Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Es. Misurare peso ogni lunedì"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select value={type} onValueChange={v => setType(v as TodoType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TODO_TYPE_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Scadenza</Label>
                  <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setAddOpen(false)}>Annulla</Button>
                <Button type="submit" size="sm" disabled={createTodo.isPending || !title.trim()}>
                  {createTodo.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Salva'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : todos?.length === 0 ? (
        <p className="text-center text-muted-foreground py-8 text-sm">Nessun to-do ancora</p>
      ) : (
        <div className="space-y-1">
          {pending.map(todo => (
            <div key={todo.id} className="group flex items-start gap-3 rounded-lg border bg-card px-3 py-2.5 hover:bg-accent/30 transition-colors">
              <button
                onClick={() => toggleTodo.mutate({ id: todo.id, completed: true })}
                className="mt-0.5 h-4 w-4 rounded border-2 border-muted-foreground/40 hover:border-primary shrink-0 transition-colors"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug">{todo.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${TODO_TYPE_COLORS[todo.type]}`}>
                    {TODO_TYPE_LABELS[todo.type]}
                  </span>
                  {todo.deadline && (
                    <span className={`text-[11px] ${new Date(todo.deadline) < new Date() ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      Scade: {formatDate(todo.deadline)}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => deleteTodo.mutate(todo.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive transition-all"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {done.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground font-medium mt-4 mb-1 px-1">Completati ({done.length})</p>
              {done.map(todo => (
                <div key={todo.id} className="group flex items-start gap-3 rounded-lg border border-dashed px-3 py-2.5 opacity-60 hover:opacity-80 transition-opacity">
                  <button
                    onClick={() => toggleTodo.mutate({ id: todo.id, completed: false })}
                    className="mt-0.5 h-4 w-4 rounded bg-primary/20 border-2 border-primary/40 flex items-center justify-center shrink-0"
                  >
                    <CheckSquare className="h-2.5 w-2.5 text-primary" />
                  </button>
                  <p className="text-sm line-through text-muted-foreground flex-1">{todo.title}</p>
                  <button
                    onClick={() => deleteTodo.mutate(todo.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive transition-all"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Nome *</Label><Input {...register('first_name')} />{errors.first_name && <p className="text-xs text-destructive">{errors.first_name.message}</p>}</div>
            <div className="space-y-2"><Label>Cognome *</Label><Input {...register('last_name')} />{errors.last_name && <p className="text-xs text-destructive">{errors.last_name.message}</p>}</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Email</Label><Input type="email" {...register('email')} /></div>
            <div className="space-y-2"><Label>Telefono</Label><Input {...register('phone')} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Data di nascita</Label><Input type="date" {...register('date_of_birth')} /></div>
            <div className="space-y-2">
              <Label>Genere</Label>
              <Select defaultValue={patient.gender} onValueChange={(v) => setValue('gender', v as 'M' | 'F' | 'altro')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Select defaultValue={patient.is_active ? 'true' : 'false'} onValueChange={(v) => setValue('is_active', v === 'true')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Attivo</SelectItem>
                <SelectItem value="false">Inattivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Note</Label><Textarea {...register('notes')} rows={3} /></div>
          <div className="flex items-start gap-2">
            <input type="checkbox" id="gdpr_edit" {...register('gdpr_consent')} className="mt-1" />
            <Label htmlFor="gdpr_edit" className="text-sm font-normal">Il paziente ha fornito consenso al trattamento dei dati (GDPR)</Label>
          </div>
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Modifica misurazione</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register('patient_id')} />
          <div className="space-y-2"><Label>Data misurazione *</Label><Input type="date" {...register('measured_at')} />{errors.measured_at && <p className="text-xs text-destructive">{errors.measured_at.message}</p>}</div>
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Peso (kg)</Label><Input type="number" step="0.1" {...register('weight_kg')} /></div>
            <div className="space-y-2"><Label>Altezza (cm)</Label><Input type="number" {...register('height_cm')} /></div>
            <div className="space-y-2"><Label>% Massa grassa</Label><Input type="number" step="0.1" {...register('body_fat_pct')} /></div>
            <div className="space-y-2"><Label>Massa magra (kg)</Label><Input type="number" step="0.1" {...register('muscle_mass_kg')} /></div>
            <div className="space-y-2"><Label>Vita (cm)</Label><Input type="number" step="0.1" {...register('waist_cm')} /></div>
            <div className="space-y-2"><Label>Fianchi (cm)</Label><Input type="number" step="0.1" {...register('hip_cm')} /></div>
            <div className="space-y-2"><Label>Braccio (cm)</Label><Input type="number" step="0.1" {...register('arm_cm')} /></div>
          </div>
          <div className="space-y-2"><Label>Note</Label><Textarea {...register('notes')} rows={2} /></div>
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

// ─── Patient Feedback Tab (questionario anamnesi) ───────────────────────────

function PatientFeedbackTab({ authUserId }: { authUserId?: string | null }) {
  const { data: feedback, isLoading } = usePatientFeedbackByProfile(authUserId ?? undefined)

  if (!authUserId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Il paziente non è ancora registrato al portale: non può compilare il questionario finché non accede.
        </CardContent>
      </Card>
    )
  }
  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  }
  if (!feedback) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Il paziente non ha ancora inviato il questionario di anamnesi.
        </CardContent>
      </Card>
    )
  }

  const submitted = new Date(feedback.submitted_at).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const rows: Array<{ label: string; value?: string | number | boolean | string[] | null }> = [
    { label: 'Data di nascita', value: feedback.date_of_birth },
    { label: 'Codice Fiscale', value: feedback.fiscal_code },
    { label: 'Telefono', value: feedback.phone },
    { label: 'Email', value: feedback.email },
    { label: 'Sesso', value: feedback.gender },
    { label: 'Altezza (m)', value: feedback.height_m },
    { label: 'Peso (kg)', value: feedback.weight_kg },
    { label: 'Come ti ha conosciuto', value: feedback.referral_source },
    { label: 'Occupazione', value: feedback.occupation },
    { label: 'Motivo visita', value: feedback.visit_reason },
    { label: 'Diete precedenti', value: feedback.previous_diets },
    { label: 'Esito diete passate', value: feedback.previous_diets_result },
    { label: 'Regime alimentare', value: feedback.diet_type },
    { label: 'Qualità del sonno', value: feedback.sleep_quality },
    { label: 'Ore di sonno', value: feedback.sleep_hours },
    { label: 'Attività fisica', value: feedback.physical_activity },
    { label: 'Condizioni attuali', value: feedback.current_conditions?.join(', ') },
    { label: 'Altre condizioni', value: feedback.other_conditions },
    { label: 'Patologie diagnosticate', value: feedback.diagnosed_conditions?.join(', ') },
    { label: 'Assume farmaci', value: feedback.takes_medications === true ? 'Sì' : feedback.takes_medications === false ? 'No' : undefined },
    { label: 'Farmaci/integratori', value: feedback.medications_list },
    { label: 'Allergie', value: feedback.has_allergies },
    { label: 'Elenco allergie', value: feedback.allergies_list },
    { label: 'Fumo', value: feedback.smoking === true ? 'Sì' : feedback.smoking === false ? 'No' : undefined },
    { label: 'Abitudini colazione', value: feedback.breakfast_habits },
    { label: 'Abitudini pranzo', value: feedback.lunch_habits },
    { label: 'Abitudini cena', value: feedback.dinner_habits },
    { label: 'Alcol', value: feedback.alcohol_consumption },
    { label: 'Accumulo grasso', value: feedback.fat_distribution?.join(', ') },
    { label: 'Note aggiuntive', value: feedback.additional_notes },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
        <ClipboardList className="h-4 w-4 text-green-700 shrink-0" />
        <p className="text-sm text-green-800">
          Questionario inviato il <strong>{submitted}</strong>
        </p>
      </div>

      <Card>
        <CardContent className="p-4 divide-y divide-border/50">
          {rows.map(({ label, value }) => {
            if (value == null || value === '' || value === undefined) return null
            return (
              <div key={label} className="py-2 grid grid-cols-[160px_1fr] gap-3 text-sm">
                <span className="text-muted-foreground font-medium">{label}</span>
                <span className="break-words">{String(value)}</span>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') ?? 'misurazioni'
  const { data: patient, isLoading } = usePatient(id!)
  const { data: measurements } = useMeasurements(id!)
  const { data: plans } = useMealPlans(id!)

  const deletePatient = useDeletePatient()
  const deleteMeasurement = useDeleteMeasurement()

  const [editPatientOpen, setEditPatientOpen] = useState(false)
  const [confirmDeletePatient, setConfirmDeletePatient] = useState(false)
  const [editMeasurement, setEditMeasurement] = useState<Measurement | null>(null)
  const [confirmDeleteMeasId, setConfirmDeleteMeasId] = useState<string | null>(null)

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
  if (!patient) return <div className="text-center py-20 text-muted-foreground">Paziente non trovato</div>

  const latestM = measurements?.[0]
  const bmi = latestM?.weight_kg && latestM?.height_cm ? calculateBMI(latestM.weight_kg, latestM.height_cm) : null
  const bmiCat = bmi ? getBMICategory(bmi) : null

  const weightData = [...(measurements ?? [])].reverse().filter(m => m.weight_kg).map(m => ({
    date: formatDate(m.measured_at),
    peso: m.weight_kg,
  }))
  const bmiData = [...(measurements ?? [])].reverse().filter(m => m.bmi).map(m => ({
    date: formatDate(m.measured_at),
    bmi: m.bmi!,
  }))
  const bodyCompData = [...(measurements ?? [])].reverse()
    .filter(m => m.body_fat_pct != null || m.muscle_mass_kg != null)
    .map(m => ({
      date: formatDate(m.measured_at),
      fat: m.body_fat_pct != null && m.weight_kg != null ? Math.round(m.weight_kg * m.body_fat_pct / 100 * 10) / 10 : 0,
      muscle: m.muscle_mass_kg ?? 0,
    }))
    .filter(d => d.fat > 0 || d.muscle > 0)

  async function handleDeletePatient() {
    try {
      await deletePatient.mutateAsync(patient!.id)
      toast.success('Paziente eliminato')
      navigate('/pazienti')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante l\'eliminazione')
    }
  }

  async function handleDeleteMeasurement(measId: string) {
    try {
      await deleteMeasurement.mutateAsync({ id: measId, patientId: id! })
      setConfirmDeleteMeasId(null)
      toast.success('Misurazione eliminata')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante l\'eliminazione')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/pazienti"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{patient.first_name} {patient.last_name}</h1>
          <p className="text-muted-foreground text-sm">
            {patient.date_of_birth ? `${calculateAge(patient.date_of_birth)} anni` : 'Età non disponibile'}
            {patient.gender ? ` • ${patient.gender === 'M' ? 'Uomo' : patient.gender === 'F' ? 'Donna' : 'Altro'}` : ''}
          </p>
        </div>
        <Badge variant={patient.is_active ? 'success' : 'secondary'}>{patient.is_active ? 'Attivo' : 'Inattivo'}</Badge>
        {/* Storico appuntamenti */}
        <Button variant="outline" size="sm" asChild>
          <Link to={`/calendario?paziente=${id}`}>
            <Calendar className="mr-2 h-4 w-4" />Appuntamenti
          </Link>
        </Button>
        <Button variant="outline" size="sm" onClick={() => setEditPatientOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />Modifica
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setConfirmDeletePatient(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Peso attuale</p><p className="text-2xl font-bold">{formatWeight(latestM?.weight_kg)}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Altezza</p><p className="text-2xl font-bold">{latestM?.height_cm ? `${latestM.height_cm} cm` : '—'}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">BMI</p><p className={`text-2xl font-bold ${bmiCat?.color ?? ''}`}>{bmi ?? '—'}</p>{bmiCat && <p className="text-xs text-muted-foreground">{bmiCat.label}</p>}</CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">% massa grassa</p><p className="text-2xl font-bold">{latestM?.body_fat_pct ? `${latestM.body_fat_pct}%` : '—'}</p></CardContent></Card>
      </div>

      <Tabs defaultValue={tabParam}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="misurazioni"><Activity className="mr-2 h-4 w-4" />Misurazioni</TabsTrigger>
          <TabsTrigger value="grafici"><BarChart2 className="mr-2 h-4 w-4" />Grafici</TabsTrigger>
          <TabsTrigger value="ai"><Brain className="mr-2 h-4 w-4" />Suggerimenti AI</TabsTrigger>
          <TabsTrigger value="piani"><UtensilsCrossed className="mr-2 h-4 w-4" />Piani</TabsTrigger>
          <TabsTrigger value="todos"><CheckSquare className="mr-2 h-4 w-4" />To-do</TabsTrigger>
          <TabsTrigger value="questionario"><ClipboardList className="mr-2 h-4 w-4" />Questionario</TabsTrigger>
          <TabsTrigger value="info">Informazioni</TabsTrigger>
        </TabsList>

        {/* Misurazioni */}
        <TabsContent value="misurazioni" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">Storico misurazioni</h2>
            <Button size="sm" asChild>
              <Link to={`/misurazioni?paziente=${id}`}><Activity className="mr-2 h-4 w-4" />Aggiungi</Link>
            </Button>
          </div>
          {weightData.length > 1 && <WeightChart data={weightData} />}
          <div className="space-y-2">
            {(measurements ?? []).map(m => (
              <div key={m.id} className="relative group">
                <Card>
                  <CardContent className="flex items-start justify-between p-4 pr-20">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{formatDate(m.measured_at)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {m.weight_kg ? `${m.weight_kg} kg` : ''}
                        {m.bmi ? ` • BMI ${m.bmi} (${getBMICategory(m.bmi).label})` : ''}
                        {m.body_fat_pct ? ` • ${m.body_fat_pct}% grasso` : ''}
                        {m.muscle_mass_kg ? ` • ${m.muscle_mass_kg} kg muscolo` : ''}
                      </p>
                      {m.waist_cm && <p className="text-xs text-muted-foreground">Vita: {m.waist_cm} cm</p>}
                      {m.notes && <p className="text-xs text-muted-foreground mt-1 italic">{m.notes}</p>}
                    </div>
                  </CardContent>
                </Card>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    title="Modifica"
                    onClick={() => setEditMeasurement(m)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    title="Elimina"
                    onClick={() => setConfirmDeleteMeasId(m.id)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {!measurements?.length && <p className="text-center text-muted-foreground py-8">Nessuna misurazione ancora</p>}
          </div>
        </TabsContent>

        {/* Grafici */}
        <TabsContent value="grafici" className="space-y-6 mt-4">
          <h2 className="font-semibold">Grafici settimanali</h2>

          {/* Calorie settimanali dal piano attivo */}
          <WeeklyCalorieChart patientId={id!} />

          {/* Peso settimanale */}
          <WeightChart data={weightData} />

          <Separator />

          <h3 className="font-medium text-sm text-muted-foreground">Andamento storico</h3>

          {bmiData.length > 1 ? (
            <Card>
              <CardHeader><CardTitle className="text-sm">Andamento BMI</CardTitle><p className="text-xs text-muted-foreground">Sottopeso &lt;18.5 • Normopeso 18.5–25 • Sovrappeso 25–30</p></CardHeader>
              <CardContent><BMIZoneChart data={bmiData} /></CardContent>
            </Card>
          ) : (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Servono almeno 2 misurazioni con peso e altezza per il grafico BMI</CardContent></Card>
          )}
          {bodyCompData.length > 0 ? (
            <Card>
              <CardHeader><CardTitle className="text-sm">Composizione corporea</CardTitle><p className="text-xs text-muted-foreground">Massa grassa (kg) vs massa muscolare (kg)</p></CardHeader>
              <CardContent><BodyCompositionChart data={bodyCompData} /></CardContent>
            </Card>
          ) : (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Aggiungi misurazioni con % massa grassa e massa muscolare per questo grafico</CardContent></Card>
          )}
        </TabsContent>

        {/* AI */}
        <TabsContent value="ai" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Brain className="h-4 w-4" />Suggerimenti macro (rule-based)</CardTitle></CardHeader>
            <CardContent><AISuggestionsPanel patient={patient} latestMeasurement={latestM} /></CardContent>
          </Card>
        </TabsContent>

        {/* Piani */}
        <TabsContent value="piani" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">Piani alimentari</h2>
            <Button size="sm" asChild><Link to={`/piani?paziente=${id}`}><UtensilsCrossed className="mr-2 h-4 w-4" />Nuovo piano</Link></Button>
          </div>
          <div className="space-y-2">
            {(plans ?? []).map(plan => (
              <Link key={plan.id} to={`/piani/${plan.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{plan.name}</p>
                      <p className="text-xs text-muted-foreground">{plan.target_kcal ? `${plan.target_kcal} kcal` : ''}{plan.start_date ? ` • dal ${formatDate(plan.start_date)}` : ''}{` • ${plan.days?.length ?? 0} giorni`}</p>
                    </div>
                    <Badge variant={plan.status === 'active' ? 'success' : plan.status === 'draft' ? 'warning' : 'secondary'}>
                      {plan.status === 'active' ? 'Attivo' : plan.status === 'draft' ? 'Bozza' : plan.status}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {!plans?.length && <p className="text-center text-muted-foreground py-8">Nessun piano alimentare</p>}
          </div>
        </TabsContent>

        {/* To-do */}
        <TabsContent value="todos" className="mt-4">
          <TodosTab patientId={id!} />
        </TabsContent>

        {/* Questionario */}
        <TabsContent value="questionario" className="mt-4">
          <PatientFeedbackTab authUserId={patient.auth_user_id} />
        </TabsContent>

        {/* Info */}
        <TabsContent value="info" className="mt-4">
          <Card>
            <CardContent className="p-6 space-y-3">
              {patient.email && <div><span className="text-sm text-muted-foreground">Email: </span><span className="text-sm">{patient.email}</span></div>}
              {patient.phone && <div><span className="text-sm text-muted-foreground">Tel: </span><span className="text-sm">{patient.phone}</span></div>}
              {patient.date_of_birth && <div><span className="text-sm text-muted-foreground">Data di nascita: </span><span className="text-sm">{formatDate(patient.date_of_birth)}</span></div>}
              {patient.notes && <div><span className="text-sm text-muted-foreground">Note: </span><p className="text-sm mt-1 whitespace-pre-wrap">{patient.notes}</p></div>}
              <Separator />
              <div><span className="text-sm text-muted-foreground">Accesso portale: </span>
                <Badge variant={patient.auth_user_id ? 'success' : 'secondary'}>
                  {patient.auth_user_id ? 'Collegato' : 'Non registrato'}
                </Badge>
              </div>
              <div><span className="text-sm text-muted-foreground">Consenso GDPR: </span><Badge variant={patient.gdpr_consent ? 'success' : 'destructive'}>{patient.gdpr_consent ? 'Acquisito' : 'Non acquisito'}</Badge></div>
              <div><span className="text-sm text-muted-foreground">Registrato il: </span><span className="text-sm">{formatDate(patient.created_at)}</span></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit patient dialog */}
      {editPatientOpen && <EditPatientDialog patient={patient} onClose={() => setEditPatientOpen(false)} />}

      {/* Confirm delete patient */}
      <Dialog open={confirmDeletePatient} onOpenChange={(v) => { if (!v) setConfirmDeletePatient(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" />Elimina paziente</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Sei sicuro di voler eliminare <strong>{patient.first_name} {patient.last_name}</strong>?
            Verranno eliminati anche misurazioni, piani alimentari e messaggi. L'operazione non è reversibile.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDeletePatient(false)}>Annulla</Button>
            <Button variant="destructive" disabled={deletePatient.isPending} onClick={handleDeletePatient}>
              {deletePatient.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Eliminazione...</> : <><Trash2 className="mr-2 h-4 w-4" />Elimina definitivamente</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit measurement dialog */}
      {editMeasurement && <EditMeasurementDialog measurement={editMeasurement} onClose={() => setEditMeasurement(null)} />}

      {/* Confirm delete measurement */}
      <Dialog open={!!confirmDeleteMeasId} onOpenChange={(v) => { if (!v) setConfirmDeleteMeasId(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Elimina misurazione</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Sei sicuro di voler eliminare questa misurazione? I grafici si aggiorneranno automaticamente.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDeleteMeasId(null)}>Annulla</Button>
            <Button variant="destructive" disabled={deleteMeasurement.isPending} onClick={() => confirmDeleteMeasId && handleDeleteMeasurement(confirmDeleteMeasId)}>
              {deleteMeasurement.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Eliminazione...</> : <><Trash2 className="mr-2 h-4 w-4" />Elimina</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
