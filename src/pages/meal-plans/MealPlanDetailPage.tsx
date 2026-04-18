import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, FileText, Loader2, Trash2, Search, X, Pencil,
  AlertTriangle, Sparkles, Coffee, Sun, Moon, Apple, Zap, Ban,
  StickyNote, ChevronDown, ChevronUp, GripVertical,
} from 'lucide-react'
import {
  useMealPlan, useAddMealPlanDay, useDeleteMealPlanDay,
  useAddMealPlanItem, useDeleteMealPlanItem, useUpdateMealPlan,
  useDeleteMealPlan, useUpdateMealPlanItem, useGenerateMealPlanContent,
  useUpdateMealPlanDay, useDistinctMealTypes, useUpdateMealPlanItemRecipe,
} from '@/hooks/useMealPlans'
import { useMealTemplates, useSaveMealTemplate } from '@/hooks/useMealTemplates'
import { useFoods, searchOpenFoodFacts } from '@/hooks/useFoods'
import { useDebounce } from '@/hooks/useDebounce'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { mealPlanSchema, type MealPlanFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { formatDate, calcNutrients, calcKcalFromMacros, cn } from '@/lib/utils'
import type { MealPlan, MealPlanItem, Food } from '@/types'

// ─── Meal type helpers ────────────────────────────────────────────────────────

// Suggestions shown in the combobox when adding food
const MEAL_SUGGESTIONS = [
  'Pranzo', 'Cena', 'Colazione', 'Spuntino', 'Spuntino mattina',
  'Spuntino pomeriggio', 'Da consumare in giornata', 'Pre-allenamento', 'Post-allenamento',
]

// Predefined sort order for known meal types (Italian names and legacy slugs)
const MEAL_SORT_ORDER: Record<string, number> = {
  'colazione': 0, 'Colazione': 0,
  'spuntino_mattina': 1, 'Spuntino mattina': 1, 'Spuntino': 1,
  'pranzo': 2, 'Pranzo': 2,
  'spuntino_pomeriggio': 3, 'Spuntino pomeriggio': 3,
  'cena': 4, 'Cena': 4,
  'Da consumare in giornata': 5,
  'Spuntino serale': 6,
  'Pre-allenamento': 7,
  'Post-allenamento': 8,
}

// Human-readable labels for legacy snake_case meal types
const MEAL_LEGACY_LABELS: Record<string, string> = {
  colazione: 'Colazione',
  spuntino_mattina: 'Spuntino mattina',
  pranzo: 'Pranzo',
  spuntino_pomeriggio: 'Spuntino pomeriggio',
  cena: 'Cena',
}

function getMealLabel(mealType: string): string {
  return MEAL_LEGACY_LABELS[mealType] ?? mealType
}

// Icon per tipo di pasto
function getMealIcon(mealType: string) {
  const t = mealType.toLowerCase()
  if (t.includes('colazione')) return Coffee
  if (t.includes('pranzo')) return Sun
  if (t.includes('cena')) return Moon
  if (t.includes('pre-')) return Zap
  if (t.includes('post-')) return Zap
  return Apple
}

// Sort meal groups within a day
function sortMealTypes(mealTypes: string[]): string[] {
  return [...mealTypes].sort((a, b) => {
    const oa = MEAL_SORT_ORDER[a] ?? 99
    const ob = MEAL_SORT_ORDER[b] ?? 99
    if (oa !== ob) return oa - ob
    return a.localeCompare(b, 'it')
  })
}

// Get unique meal types in a day's items, respecting saved order if present
function getDayMealTypes(items: MealPlanItem[], savedOrder?: string[] | null): string[] {
  const types = [...new Set(items.map(i => i.meal_type))]
  if (savedOrder && savedOrder.length > 0) {
    const orderMap = new Map(savedOrder.map((t, i) => [t, i]))
    return [...types].sort((a, b) => {
      const oa = orderMap.get(a) ?? 999
      const ob = orderMap.get(b) ?? 999
      if (oa !== ob) return oa - ob
      return a.localeCompare(b, 'it')
    })
  }
  return sortMealTypes(types)
}

// ─── Macro target editor (% ↔ g bidirezionale) ───────────────────────────────

type MacroFormValues = {
  target_kcal: number | ''
  target_protein_g: number | ''
  target_carbs_g: number | ''
  target_fat_g: number | ''
}

const MACRO_CONFIG = [
  { key: 'p' as const, label: 'Proteine', color: 'text-blue-600', gKey: 'target_protein_g' as const, kcalPer: 4 },
  { key: 'c' as const, label: 'Carboidrati', color: 'text-amber-600', gKey: 'target_carbs_g' as const, kcalPer: 4 },
  { key: 'f' as const, label: 'Grassi', color: 'text-rose-600', gKey: 'target_fat_g' as const, kcalPer: 9 },
]

function MacroTargetEditor({ values, onChange }: { values: MacroFormValues; onChange: (v: MacroFormValues) => void }) {
  const [mode, setMode] = useState<'g' | 'pct'>('g')
  const [pctDraft, setPctDraft] = useState({ p: '', c: '', f: '' })

  const kcal = typeof values.target_kcal === 'number' && values.target_kcal > 0 ? values.target_kcal : null
  const p_g = typeof values.target_protein_g === 'number' ? values.target_protein_g : 0
  const c_g = typeof values.target_carbs_g === 'number' ? values.target_carbs_g : 0
  const f_g = typeof values.target_fat_g === 'number' ? values.target_fat_g : 0
  const kcalFromMacros = calcKcalFromMacros(p_g, c_g, f_g)
  const pctFromG = kcalFromMacros > 0
    ? {
        p: Math.round((p_g * 4 / kcalFromMacros) * 100),
        c: Math.round((c_g * 4 / kcalFromMacros) * 100),
        f: Math.round((f_g * 9 / kcalFromMacros) * 100),
      }
    : null

  const pctNums = [pctDraft.p, pctDraft.c, pctDraft.f].map(parseFloat).filter(isFinite)
  const pctSum = pctNums.reduce((a, b) => a + b, 0)
  const pctSumOk = pctNums.length === 3 && Math.abs(pctSum - 100) < 0.5

  function switchMode(newMode: 'g' | 'pct') {
    if (newMode === 'pct' && mode === 'g') {
      setPctDraft(pctFromG ? { p: String(pctFromG.p), c: String(pctFromG.c), f: String(pctFromG.f) } : { p: '', c: '', f: '' })
    }
    setMode(newMode)
  }

  function handleKcalChange(raw: string) {
    const n = parseFloat(raw)
    const newKcal = isFinite(n) && n > 0 ? n : ('' as const)
    if (mode === 'pct' && typeof newKcal === 'number' && pctSumOk) {
      const pp = parseFloat(pctDraft.p)
      const cc = parseFloat(pctDraft.c)
      const ff = parseFloat(pctDraft.f)
      onChange({
        target_kcal: newKcal,
        target_protein_g: Math.round((newKcal * pp / 100) / 4 * 10) / 10,
        target_carbs_g: Math.round((newKcal * cc / 100) / 4 * 10) / 10,
        target_fat_g: Math.round((newKcal * ff / 100) / 9 * 10) / 10,
      })
      return
    }
    onChange({ ...values, target_kcal: newKcal })
  }

  function handleGChange(macro: 'p' | 'c' | 'f', raw: string) {
    const n = parseFloat(raw)
    const val = isFinite(n) && n >= 0 ? n : ('' as const)
    const updated = {
      ...values,
      ...(macro === 'p' ? { target_protein_g: val } : {}),
      ...(macro === 'c' ? { target_carbs_g: val } : {}),
      ...(macro === 'f' ? { target_fat_g: val } : {}),
    }
    const pp = typeof updated.target_protein_g === 'number' ? updated.target_protein_g : 0
    const cc = typeof updated.target_carbs_g === 'number' ? updated.target_carbs_g : 0
    const ff = typeof updated.target_fat_g === 'number' ? updated.target_fat_g : 0
    updated.target_kcal = calcKcalFromMacros(pp, cc, ff) || ('' as const)
    onChange(updated)
  }

  function handlePctChange(macro: 'p' | 'c' | 'f', raw: string) {
    const newPct = { ...pctDraft, [macro]: raw }
    setPctDraft(newPct)
    const pp = parseFloat(newPct.p)
    const cc = parseFloat(newPct.c)
    const ff = parseFloat(newPct.f)
    if (!isFinite(pp) || !isFinite(cc) || !isFinite(ff) || pp < 0 || cc < 0 || ff < 0) return
    if (Math.abs(pp + cc + ff - 100) >= 0.5 || !kcal) return
    onChange({
      target_kcal: values.target_kcal,
      target_protein_g: Math.round((kcal * pp / 100) / 4 * 10) / 10,
      target_carbs_g: Math.round((kcal * cc / 100) / 4 * 10) / 10,
      target_fat_g: Math.round((kcal * ff / 100) / 9 * 10) / 10,
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Target macro</Label>
        <div className="flex rounded-md border text-xs overflow-hidden">
          <button type="button" onClick={() => switchMode('g')}
            className={`px-2.5 py-1 transition-colors ${mode === 'g' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
            Grammi
          </button>
          <button type="button" onClick={() => switchMode('pct')}
            className={`px-2.5 py-1 transition-colors ${mode === 'pct' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
            %
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Calorie target (kcal/die)</Label>
        <Input
          type="number" min="0" placeholder="1400"
          value={values.target_kcal === '' ? '' : String(values.target_kcal)}
          onChange={e => handleKcalChange(e.target.value)}
        />
        {mode === 'g' && kcalFromMacros > 0 && (
          <p className="text-[11px] text-muted-foreground">
            Da macro: <span className="font-semibold text-foreground">{kcalFromMacros} kcal</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {MACRO_CONFIG.map(({ key, label, color, gKey, kcalPer }) => {
          const gVal = values[gKey]
          const gNum = typeof gVal === 'number' ? gVal : 0
          const kcalContrib = Math.round(gNum * kcalPer)
          return (
            <div key={key} className="space-y-1.5">
              <Label className={`text-xs font-semibold ${color}`}>{label}</Label>
              {mode === 'g' ? (
                <Input type="number" min="0" placeholder="0"
                  value={gVal === '' ? '' : String(gVal)}
                  onChange={e => handleGChange(key, e.target.value)}
                />
              ) : (
                <div className="relative">
                  <Input type="number" min="0" max="100" placeholder="0"
                    value={pctDraft[key]}
                    onChange={e => handlePctChange(key, e.target.value)}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                {mode === 'g' ? (
                  <>{kcalContrib} kcal{pctFromG ? <span className="text-muted-foreground/60"> · {pctFromG[key]}%</span> : null}</>
                ) : (
                  kcal && isFinite(parseFloat(pctDraft[key])) ? (() => {
                    const pct = parseFloat(pctDraft[key])
                    const g = Math.round((kcal * pct / 100) / kcalPer * 10) / 10
                    return <>{g}g · {Math.round(g * kcalPer)} kcal</>
                  })() : null
                )}
              </p>
            </div>
          )
        })}
      </div>

      {mode === 'pct' && (
        <p className={`text-xs rounded px-2 py-1 ${
          pctNums.length === 3 && !pctSumOk ? 'bg-destructive/10 text-destructive'
          : pctSumOk ? 'bg-green-50 text-green-700'
          : 'text-muted-foreground'
        }`}>
          {pctNums.length < 3 ? 'Inserisci tutte e tre le percentuali (somma = 100%)'
          : pctSumOk ? 'Totale: 100% ✓'
          : `Totale: ${Math.round(pctSum * 10) / 10}% — deve essere 100%`}
        </p>
      )}
      {mode === 'pct' && !kcal && (
        <p className="text-xs text-amber-600">Imposta prima le calorie target per calcolare i grammi.</p>
      )}
    </div>
  )
}

// ─── Edit meal plan dialog ────────────────────────────────────────────────────

function EditMealPlanDialog({ plan, open, onClose }: { plan: MealPlan; open: boolean; onClose: () => void }) {
  const updatePlan = useUpdateMealPlan()
  const [showNarrative, setShowNarrative] = useState(!!(plan.considerations || plan.practical_advice || plan.daily_extras))

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<MealPlanFormData>({
    resolver: zodResolver(mealPlanSchema),
    defaultValues: {
      patient_id: plan.patient_id,
      name: plan.name,
      description: plan.description ?? '',
      status: plan.status as MealPlanFormData['status'],
      start_date: plan.start_date ?? '',
      end_date: plan.end_date ?? '',
      target_kcal: plan.target_kcal ?? '',
      target_protein_g: plan.target_protein_g ?? '',
      target_carbs_g: plan.target_carbs_g ?? '',
      target_fat_g: plan.target_fat_g ?? '',
      notes: plan.notes ?? '',
      considerations: plan.considerations ?? '',
      practical_advice: plan.practical_advice ?? '',
      daily_extras: plan.daily_extras ?? '',
    },
  })

  async function onSubmit(data: MealPlanFormData) {
    try {
      await updatePlan.mutateAsync({ id: plan.id, ...data })
      toast.success('Piano aggiornato')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante il salvataggio')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Modifica piano</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome piano *</Label>
            <Input placeholder="Es: Piano dimagrimento luglio 2025" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Stato</Label>
            <Select defaultValue={plan.status} onValueChange={(v) => setValue('status', v as MealPlanFormData['status'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Bozza</SelectItem>
                <SelectItem value="active">Attivo</SelectItem>
                <SelectItem value="completed">Completato</SelectItem>
                <SelectItem value="archived">Archiviato</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Data inizio</Label><Input type="date" {...register('start_date')} /></div>
            <div className="space-y-2"><Label>Data fine</Label><Input type="date" {...register('end_date')} /></div>
          </div>

          <MacroTargetEditor
            values={{
              target_kcal: watch('target_kcal') ?? '',
              target_protein_g: watch('target_protein_g') ?? '',
              target_carbs_g: watch('target_carbs_g') ?? '',
              target_fat_g: watch('target_fat_g') ?? '',
            }}
            onChange={v => {
              setValue('target_kcal', v.target_kcal)
              setValue('target_protein_g', v.target_protein_g)
              setValue('target_carbs_g', v.target_carbs_g)
              setValue('target_fat_g', v.target_fat_g)
            }}
          />

          {/* Sezione testi narrativi */}
          <div>
            <button
              type="button"
              onClick={() => setShowNarrative(v => !v)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {showNarrative ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Testi per il paziente (considerazioni, consigli, note quotidiane)
            </button>

            {showNarrative && (
              <div className="mt-3 space-y-3 border-l-2 border-primary/20 pl-4">
                <div className="space-y-2">
                  <Label className="text-sm">
                    Considerazioni e caratteristiche della dieta
                    <span className="ml-1 text-xs text-muted-foreground font-normal">(visibili al paziente nel portale e nel PDF)</span>
                  </Label>
                  <Textarea
                    placeholder="Es: Il tuo BMR è 1390 kcal. Ho applicato un deficit di 250 kcal dal lunedì al venerdì. Sabato e domenica sei libera..."
                    {...register('considerations')}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">
                    Da consumare in giornata
                    <span className="ml-1 text-xs text-muted-foreground font-normal">(alimenti liberi, non legati a un pasto specifico)</span>
                  </Label>
                  <Textarea
                    placeholder="Es: Mix di frutta secca ed essiccata 40g + 1 yogurt greco 0% o 1 frutto (fragole, ciliegie → 200g)"
                    {...register('daily_extras')}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">
                    Consigli pratici
                    <span className="ml-1 text-xs text-muted-foreground font-normal">(delucidazioni, note di preparazione)</span>
                  </Label>
                  <Textarea
                    placeholder="Es: Il peso degli alimenti si riferisce al crudo e al netto degli scarti. I legumi in barattolo vanno sciacquati..."
                    {...register('practical_advice')}
                    rows={4}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Note interne (non visibili al paziente)</Label>
            <Textarea placeholder="Note di lavoro, memo..." {...register('notes')} rows={2} />
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

// ─── Add food dialog ──────────────────────────────────────────────────────────

function AddFoodDialog({
  open,
  onClose,
  onAdd,
  defaultMealType,
  existingMealTypes,
}: {
  open: boolean
  onClose: () => void
  onAdd: (food: Food, mealType: string, quantityG: number, quantityMaxG?: number) => Promise<void>
  defaultMealType: string
  existingMealTypes: string[]
}) {
  // Feature 2: pull distinct meal types used across all plans
  const { data: dbMealTypes } = useDistinctMealTypes()
  const [search, setSearch] = useState('')
  const [offSearch, setOffSearch] = useState('')
  const [offResults, setOffResults] = useState<Food[]>([])
  const [offLoading, setOffLoading] = useState(false)
  const [selectedFood, setSelectedFood] = useState<Food | null>(null)
  const [mealType, setMealType] = useState(defaultMealType)
  const [quantity, setQuantity] = useState('100')
  const [quantityMax, setQuantityMax] = useState('')
  const [adding, setAdding] = useState(false)
  const [tab, setTab] = useState<'locale' | 'off'>('locale')

  const debouncedSearch = useDebounce(search, 300)
  const { data: foods } = useFoods(debouncedSearch)

  // Feature 2: Combine existing, DB-fetched, and hardcoded suggestions (no duplicates)
  const mealTypeOptions = [
    ...existingMealTypes,
    ...(dbMealTypes ?? []).filter(s => !existingMealTypes.some(e => e.toLowerCase() === s.toLowerCase())),
    ...MEAL_SUGGESTIONS.filter(s =>
      !existingMealTypes.some(e => e.toLowerCase() === s.toLowerCase()) &&
      !(dbMealTypes ?? []).some(d => d.toLowerCase() === s.toLowerCase())
    ),
  ]

  async function searchOFF() {
    if (!offSearch.trim()) return
    setOffLoading(true)
    const results = await searchOpenFoodFacts(offSearch)
    setOffResults(results)
    setOffLoading(false)
  }

  async function handleAdd() {
    const qty = Number(quantity)
    if (!selectedFood || !quantity || isNaN(qty) || qty <= 0 || !mealType.trim()) return
    const maxQty = quantityMax ? Number(quantityMax) : undefined
    setAdding(true)
    try {
      await onAdd(selectedFood, mealType.trim(), qty, maxQty && maxQty > qty ? maxQty : undefined)
      onClose()
      setSelectedFood(null)
      setSearch('')
      setQuantity('100')
      setQuantityMax('')
    } finally {
      setAdding(false)
    }
  }

  function FoodRow({ food }: { food: Food }) {
    const isSelected = selectedFood?.id === food.id
    return (
      <button
        type="button"
        onClick={() => setSelectedFood(isSelected ? null : food)}
        className={`w-full text-left flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors border ${
          isSelected ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/50'
        }`}
      >
        <div>
          <p className="font-medium">{food.name}</p>
          {food.category && <p className="text-xs text-muted-foreground">{food.category}</p>}
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">{Math.round(food.kcal_100g)} kcal</p>
          <p>P:{food.protein_100g}g C:{food.carbs_100g}g G:{food.fat_100g}g</p>
        </div>
      </button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Aggiungi alimento</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 text-sm">
          <button
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${tab === 'locale' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            onClick={() => setTab('locale')}
          >
            Database locale
          </button>
          <button
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${tab === 'off' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            onClick={() => setTab('off')}
          >
            Open Food Facts 🌍
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {tab === 'locale' ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Cerca alimento..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                {foods?.map(food => <FoodRow key={food.id} food={food} />)}
                {!foods?.length && search.length > 1 && (
                  <p className="text-center text-sm text-muted-foreground py-4">Nessun risultato</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex gap-2">
                <Input
                  placeholder="Es: pasta barilla, riso integrale..."
                  value={offSearch}
                  onChange={e => setOffSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchOFF()}
                />
                <Button variant="outline" onClick={searchOFF} disabled={offLoading}>
                  {offLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              <div className="space-y-1">
                {offResults.map((food, i) => <FoodRow key={`off-${i}`} food={food} />)}
                {!offResults.length && (
                  <p className="text-center text-sm text-muted-foreground py-4">Cerca un alimento su Open Food Facts</p>
                )}
              </div>
            </>
          )}
        </div>

        {selectedFood && (
          <>
            <Separator />
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <span>Selezionato: {selectedFood.name}</span>
                <button onClick={() => setSelectedFood(null)}><X className="h-3.5 w-3.5" /></button>
              </div>

              {/* Meal type: combobox with datalist */}
              <div className="space-y-1.5">
                <Label>Pasto</Label>
                <div className="relative">
                  <input
                    list="meal-types-datalist"
                    value={mealType}
                    onChange={e => setMealType(e.target.value)}
                    placeholder="Es: Pranzo, Cena, Spuntino..."
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <datalist id="meal-types-datalist">
                    {mealTypeOptions.map(mt => (
                      <option key={mt} value={mt} />
                    ))}
                  </datalist>
                </div>
                {!mealType.trim() && <p className="text-xs text-destructive">Specifica un nome per il pasto</p>}
              </div>

              {/* Quantities */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Quantità min (g)</Label>
                  <Input
                    type="number" min="1"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    placeholder="100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground">
                    Quantità max (g)
                    <span className="ml-1 text-xs font-normal">opzionale — per range</span>
                  </Label>
                  <Input
                    type="number" min="1"
                    value={quantityMax}
                    onChange={e => setQuantityMax(e.target.value)}
                    placeholder="es: 150"
                  />
                </div>
              </div>

              {quantity && Number(quantity) > 0 && (
                <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground flex gap-4">
                  <span>{Math.round(selectedFood.kcal_100g * Number(quantity) / 100)} kcal</span>
                  <span>P: {(selectedFood.protein_100g * Number(quantity) / 100).toFixed(1)}g</span>
                  <span>C: {(selectedFood.carbs_100g * Number(quantity) / 100).toFixed(1)}g</span>
                  <span>G: {(selectedFood.fat_100g * Number(quantity) / 100).toFixed(1)}g</span>
                  {quantityMax && Number(quantityMax) > Number(quantity) && (
                    <span className="text-amber-600">fino a {Number(quantityMax)}g</span>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={handleAdd} disabled={!selectedFood || !quantity || adding || !mealType.trim()}>
            {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Aggiungi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Meal item row (inline quantity editing) ─────────────────────────────────

function MealItemRow({
  item,
  planId,
  canEdit,
  onDelete,
}: {
  item: MealPlanItem
  planId: string
  canEdit: boolean
  onDelete: (id: string) => void
}) {
  const [qty, setQty] = useState(String(item.quantity_g))
  const [qtyMax, setQtyMax] = useState(item.quantity_max_g ? String(item.quantity_max_g) : '')
  const [macros, setMacros] = useState({
    kcal: calcKcalFromMacros(item.protein_g, item.carbs_g, item.fat_g),
    protein_g: item.protein_g,
    carbs_g: item.carbs_g,
    fat_g: item.fat_g,
  })
  const [recipeOpen, setRecipeOpen] = useState(false)
  const [recipeDraft, setRecipeDraft] = useState(item.recipe ?? '')
  const updateItem = useUpdateMealPlanItem()
  const updateRecipe = useUpdateMealPlanItemRecipe()

  function handleQtyChange(val: string) {
    setQty(val)
    const n = parseFloat(val)
    if (!isFinite(n) || n <= 0 || !item.food) return
    const { kcal_100g, protein_100g, carbs_100g, fat_100g } = item.food
    const computed = calcNutrients(kcal_100g ?? 0, protein_100g ?? 0, carbs_100g ?? 0, fat_100g ?? 0, n)
    const p = isNaN(computed.protein_g) ? 0 : Math.max(0, computed.protein_g)
    const c = isNaN(computed.carbs_g) ? 0 : Math.max(0, computed.carbs_g)
    const f = isNaN(computed.fat_g) ? 0 : Math.max(0, computed.fat_g)
    setMacros({ kcal: calcKcalFromMacros(p, c, f), protein_g: p, carbs_g: c, fat_g: f })
  }

  async function handleQtyBlur() {
    const n = parseFloat(qty)
    const maxN = qtyMax ? parseFloat(qtyMax) : undefined
    if (!isFinite(n) || n <= 0 || !item.food) {
      if (!isFinite(n) || n <= 0) setQty(String(item.quantity_g))
      return
    }
    if (n === item.quantity_g && maxN === item.quantity_max_g) return
    try {
      await updateItem.mutateAsync({
        itemId: item.id, planId, quantityG: n,
        quantityMaxG: maxN && maxN > n ? maxN : null,
        food: item.food,
      })
    } catch {
      setQty(String(item.quantity_g))
      setQtyMax(item.quantity_max_g ? String(item.quantity_max_g) : '')
      setMacros({ kcal: calcKcalFromMacros(item.protein_g, item.carbs_g, item.fat_g), protein_g: item.protein_g, carbs_g: item.carbs_g, fat_g: item.fat_g })
      toast.error('Errore durante il salvataggio della quantità')
    }
  }

  async function handleRecipeSave() {
    try {
      await updateRecipe.mutateAsync({ itemId: item.id, planId, recipe: recipeDraft })
      setRecipeOpen(false)
    } catch {
      toast.error('Errore nel salvataggio della ricetta')
    }
  }

  // Display quantity: "90g" or "50–60g"
  const qtyDisplay = item.quantity_max_g
    ? `${item.quantity_g}–${item.quantity_max_g}g`
    : `${item.quantity_g}g`

  return (
    <div className="rounded-lg bg-muted/50 border border-border/30 px-3 py-2.5 text-sm group">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0 mr-3">
          <span className="font-medium truncate block">{item.food?.name ?? 'Alimento'}</span>
          {item.notes && <span className="text-xs text-muted-foreground">{item.notes}</span>}
          {item.recipe && !recipeOpen && (
            <button
              className="text-xs text-primary/70 hover:text-primary mt-0.5 block truncate max-w-xs text-left"
              onClick={() => setRecipeOpen(true)}
            >
              📋 {item.recipe.length > 60 ? item.recipe.slice(0, 60) + '…' : item.recipe}
            </button>
          )}
        </div>
      <div className="flex items-center gap-2 shrink-0">
        {canEdit ? (
          <div className="flex items-center gap-1">
            <input
              type="number" min="1" max="9999" step="5"
              value={qty}
              onChange={(e) => handleQtyChange(e.target.value)}
              onBlur={handleQtyBlur}
              className="w-14 text-right text-xs border border-input rounded px-1.5 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {item.quantity_max_g && (
              <>
                <span className="text-muted-foreground text-xs">–</span>
                <input
                  type="number" min="1" max="9999" step="5"
                  value={qtyMax}
                  onChange={(e) => setQtyMax(e.target.value)}
                  onBlur={handleQtyBlur}
                  className="w-14 text-right text-xs border border-input rounded px-1.5 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </>
            )}
            <span className="text-muted-foreground text-xs">g</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">{qtyDisplay}</span>
        )}
        <div className="flex items-center gap-2 text-xs shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-blue-600">P:{macros.protein_g.toFixed(1)}g</span>
            <span className="text-amber-600">C:{macros.carbs_g.toFixed(1)}g</span>
            <span className="text-rose-600">G:{macros.fat_g.toFixed(1)}g</span>
          </div>
          <span className="font-medium">{macros.kcal} kcal</span>
          {canEdit && (
            <>
              <button
                title="Ricetta/Preparazione"
                onClick={() => { setRecipeOpen(v => !v); setRecipeDraft(item.recipe ?? '') }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
              >
                <StickyNote className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
      </div>
      {/* Feature 3: recipe inline editor */}
      {recipeOpen && canEdit && (
        <div className="mt-2 flex gap-2 items-end">
          <textarea
            className="flex-1 text-xs border border-input rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            rows={3}
            placeholder="Preparazione / Ricetta..."
            value={recipeDraft}
            onChange={e => setRecipeDraft(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <button
              onClick={handleRecipeSave}
              disabled={updateRecipe.isPending}
              className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Salva
            </button>
            <button
              onClick={() => setRecipeOpen(false)}
              className="px-2 py-1 text-xs border rounded-md text-muted-foreground hover:bg-muted"
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Meal group (free-text meal type) ─────────────────────────────────────────

function MealGroup({
  items,
  mealTypeName,
  planId,
  canEdit,
  onDrop,
  isDragging,
  onGroupDragStart,
  onGroupDragEnd,
}: {
  items: MealPlanItem[]
  mealTypeName: string
  planId: string
  canEdit: boolean
  onDrop?: () => void
  isDragging?: boolean
  onGroupDragStart?: (e: React.DragEvent) => void
  onGroupDragEnd?: () => void
}) {
  const deleteItem = useDeleteMealPlanItem()
  const saveTemplate = useSaveMealTemplate()
  const [isOver, setIsOver] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')

  const grouped = items.filter(i => i.meal_type === mealTypeName)
  if (!grouped.length && !canEdit) return null

  const Icon = getMealIcon(mealTypeName)
  const label = getMealLabel(mealTypeName)

  const macroTotals = grouped.reduce(
    (acc, i) => ({ protein_g: acc.protein_g + i.protein_g, carbs_g: acc.carbs_g + i.carbs_g, fat_g: acc.fat_g + i.fat_g }),
    { protein_g: 0, carbs_g: 0, fat_g: 0 }
  )
  const totals = { ...macroTotals, kcal: calcKcalFromMacros(macroTotals.protein_g, macroTotals.carbs_g, macroTotals.fat_g) }

  async function handleDelete(itemId: string) {
    try {
      await deleteItem.mutateAsync({ itemId, planId })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante la rimozione')
    }
  }

  async function handleSaveTemplate() {
    if (!templateName.trim()) return
    try {
      await saveTemplate.mutateAsync({
        name: templateName.trim(),
        mealType: mealTypeName,
        items: grouped.map((i, idx) => ({
          food_id: i.food_id,
          food_name: i.food?.name ?? 'Alimento',
          quantity_g: i.quantity_g,
          quantity_max_g: i.quantity_max_g,
          notes: i.notes,
          sort_order: idx,
        })),
      })
      toast.success(`Template "${templateName}" salvato`)
      setSavingTemplate(false)
      setTemplateName('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore salvataggio template')
    }
  }

  return (
    <div
      className={cn(
        'space-y-2 rounded-xl border p-4 transition-colors shadow-sm',
        isDragging && onDrop
          ? isOver
            ? 'bg-primary/10 ring-2 ring-primary/40 border-primary/40'
            : 'ring-1 ring-dashed ring-primary/30 border-transparent'
          : 'bg-card border-border',
      )}
      onDragOver={onDrop ? (e) => { e.preventDefault(); setIsOver(true) } : undefined}
      onDragLeave={onDrop ? () => setIsOver(false) : undefined}
      onDrop={onDrop ? (e) => { e.preventDefault(); setIsOver(false); onDrop() } : undefined}
    >
      <div className="flex items-center justify-between pb-2 border-b border-border/50">
        <h4 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
          {canEdit && onGroupDragStart && (
            <div
              draggable
              onDragStart={onGroupDragStart}
              onDragEnd={onGroupDragEnd}
              className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground p-0.5 -ml-0.5 touch-none"
              title="Trascina per riordinare il pasto"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </div>
          )}
          <Icon className="h-4 w-4 text-primary" />
          <span>{label}</span>
        </h4>
        <div className="flex items-center gap-2">
          {grouped.length > 0 && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {totals.kcal} kcal · P:{totals.protein_g.toFixed(0)}g C:{totals.carbs_g.toFixed(0)}g G:{totals.fat_g.toFixed(0)}g
            </span>
          )}
          {isDragging && onDrop && (
            <span className="text-[10px] text-primary font-medium">Trascina qui</span>
          )}
        </div>
      </div>
      {grouped.map(item => (
        <MealItemRow
          key={item.id}
          item={item}
          planId={planId}
          canEdit={canEdit}
          onDelete={handleDelete}
        />
      ))}
      {!grouped.length && canEdit && (
        <p className="text-xs text-muted-foreground/60 px-3 italic">
          {isDragging ? 'Rilascia qui per aggiungere' : 'Nessun alimento — aggiungi tramite il pulsante sopra'}
        </p>
      )}
      {/* Feature 7: save as template */}
      {canEdit && grouped.length > 0 && (
        savingTemplate ? (
          <div className="flex items-center gap-2 pt-1">
            <input
              className="flex-1 text-xs border border-input rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Nome template (es. Colazione standard)"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()}
              autoFocus
            />
            <button onClick={handleSaveTemplate} disabled={saveTemplate.isPending || !templateName.trim()}
              className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50">
              Salva
            </button>
            <button onClick={() => { setSavingTemplate(false); setTemplateName('') }}
              className="text-xs px-2 py-1 border rounded-md text-muted-foreground hover:bg-muted">
              Annulla
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSavingTemplate(true)}
            className="text-[11px] text-muted-foreground hover:text-primary transition-colors self-start mt-1 flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />Salva come template
          </button>
        )
      )}
    </div>
  )
}

// ─── Food sidebar (drag & drop) ───────────────────────────────────────────────

function FoodSidebar({ onDragStart }: { onDragStart: (food: Food) => void }) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const { data: foods } = useFoods(debouncedSearch)

  return (
    <div className="flex flex-col gap-3 h-full">
      <div>
        <p className="text-sm font-semibold mb-2">Alimenti</p>
        <p className="text-xs text-muted-foreground mb-2">Trascina un alimento su un pasto</p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Cerca alimento..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1 min-h-0 pr-0.5">
        {foods?.map(food => (
          <div
            key={food.id}
            draggable
            onDragStart={() => onDragStart(food)}
            className="rounded-md border border-transparent bg-muted/40 px-2.5 py-2 cursor-grab active:cursor-grabbing hover:border-primary/40 hover:bg-primary/5 transition-colors select-none"
            title={`Trascina ${food.name} su un pasto`}
          >
            <p className="text-xs font-medium truncate">{food.name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {Math.round(food.kcal_100g)} kcal • P:{food.protein_100g}g C:{food.carbs_100g}g G:{food.fat_100g}g
            </p>
          </div>
        ))}
        {!foods?.length && search.length > 1 && (
          <p className="text-xs text-muted-foreground text-center py-4">Nessun risultato</p>
        )}
        {!foods?.length && search.length <= 1 && (
          <p className="text-xs text-muted-foreground text-center py-4">Cerca un alimento per iniziare</p>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function MealPlanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: plan, isLoading } = useMealPlan(id!)
  const addDay = useAddMealPlanDay()
  const deleteDay = useDeleteMealPlanDay()
  const updateDay = useUpdateMealPlanDay()
  const deletePlan = useDeleteMealPlan()
  const addItem = useAddMealPlanItem()
  const generateContent = useGenerateMealPlanContent()

  const [addFoodDialogOpen, setAddFoodDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [confirmDeletePlan, setConfirmDeletePlan] = useState(false)
  const [confirmDeleteDayId, setConfirmDeleteDayId] = useState<string | null>(null)
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null)
  const [defaultMealType, setDefaultMealType] = useState('Pranzo')
  const [activeTab, setActiveTab] = useState<string>('day-0')
  const [draggedFood, setDraggedFood] = useState<Food | null>(null)
  const [draggedMealGroup, setDraggedMealGroup] = useState<string | null>(null)
  const [insertTemplateDialogDayId, setInsertTemplateDialogDayId] = useState<string | null>(null)
  const [insertingTemplate, setInsertingTemplate] = useState(false)
  const { data: templates } = useMealTemplates()

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
  if (!plan) return <div className="text-center py-20 text-muted-foreground">Piano non trovato</div>

  const statusVariant: Record<string, 'warning' | 'success' | 'secondary'> = {
    draft: 'warning', active: 'success', completed: 'secondary',
  }
  const statusLabel: Record<string, string> = {
    draft: 'Bozza', active: 'Attivo', completed: 'Completato', archived: 'Archiviato',
  }

  async function handleGeneratePlan() {
    if (!plan?.target_kcal) {
      toast.error('Imposta prima un target calorico nel piano (modifica → Target kcal/die)')
      return
    }
    if ((plan.days?.length ?? 0) > 0) {
      toast.error('Il piano ha già dei giorni. Eliminali prima di rigenerare.')
      return
    }
    try {
      await generateContent.mutateAsync({ planId: id!, targetKcal: plan.target_kcal })
      toast.success('Piano generato con successo!')
      setActiveTab('day-0')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante la generazione del piano')
    }
  }

  async function handleAddDay() {
    const dayNumber = (plan?.days?.length ?? 0) + 1
    const currentCount = plan?.days?.length ?? 0
    const dayLabels = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
    try {
      await addDay.mutateAsync({
        planId: id!,
        dayNumber,
        dayLabel: dayLabels[dayNumber - 1] ?? `Giorno ${dayNumber}`,
      })
      setActiveTab(`day-${currentCount}`)
      toast.success(`Giorno ${dayNumber} aggiunto`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante l\'aggiunta del giorno')
    }
  }

  async function handleDeleteDay(dayId: string) {
    try {
      await deleteDay.mutateAsync({ dayId, planId: id! })
      setConfirmDeleteDayId(null)
      const remainingCount = (plan?.days?.length ?? 1) - 1
      setActiveTab(remainingCount > 0 ? 'day-0' : '')
      toast.success('Giorno rimosso')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante la rimozione del giorno')
    }
  }

  async function handleToggleFreeDay(dayId: string, currentValue: boolean) {
    try {
      await updateDay.mutateAsync({ dayId, planId: id!, isFreeDay: !currentValue })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante l\'aggiornamento del giorno')
    }
  }

  async function handleInsertTemplate(dayId: string, templateId: string) {
    const tpl = templates?.find(t => t.id === templateId)
    if (!tpl?.items?.length) { setInsertTemplateDialogDayId(null); return }
    const day = plan?.days?.find(d => d.id === dayId)

    // Ensure a NEW meal section by making the name unique within this day
    const existingTypes = new Set(day?.items?.map(it => it.meal_type) ?? [])
    let newMealType = tpl.name
    let counter = 2
    while (existingTypes.has(newMealType)) {
      newMealType = `${tpl.name} (${counter++})`
    }

    let sortBase = day?.items?.reduce((m, it) => Math.max(m, it.sort_order ?? 0), 0) ?? 0
    const sortedTemplateItems = [...tpl.items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    setInsertingTemplate(true)
    try {
      for (const ti of sortedTemplateItems) {
        if (!ti.food_id || !ti.food) continue
        sortBase += 1
        await addItem.mutateAsync({
          dayId,
          planId: id!,
          foodId: ti.food_id,
          mealType: newMealType,
          quantityG: ti.quantity_g,
          quantityMaxG: ti.quantity_max_g,
          sortOrder: sortBase,
          food: {
            kcal_100g: ti.food.kcal_100g,
            protein_100g: ti.food.protein_100g,
            carbs_100g: ti.food.carbs_100g,
            fat_100g: ti.food.fat_100g,
          },
          notes: ti.notes,
        })
      }
      toast.success(`Pasto "${newMealType}" aggiunto`)
      setInsertTemplateDialogDayId(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore inserimento template')
    } finally {
      setInsertingTemplate(false)
    }
  }

  function openAddFood(dayId: string, mealType = 'Pranzo') {
    setSelectedDayId(dayId)
    setDefaultMealType(mealType)
    setAddFoodDialogOpen(true)
  }

  // Get existing meal types for the currently active day
  function getActiveDayMealTypes(): string[] {
    const activeDayIndex = parseInt(activeTab.replace('day-', ''))
    const activeDay = plan?.days?.[activeDayIndex]
    if (!activeDay?.items?.length) return []
    return getDayMealTypes(activeDay.items, activeDay.meal_group_order)
  }

  async function handleAddItem(food: Food, mealType: string, quantityG: number, quantityMaxG?: number) {
    if (!selectedDayId) return
    // Calculate next sort_order for this day
    const activeDayIndex = parseInt(activeTab.replace('day-', ''))
    const activeDay = plan?.days?.[activeDayIndex]
    const maxSort = activeDay?.items?.reduce((m, i) => Math.max(m, i.sort_order ?? 0), 0) ?? 0
    try {
      await addItem.mutateAsync({
        dayId: selectedDayId,
        planId: id!,
        foodId: food.id,
        mealType,
        quantityG,
        quantityMaxG,
        sortOrder: maxSort + 1,
        food: {
          kcal_100g: food.kcal_100g,
          protein_100g: food.protein_100g,
          carbs_100g: food.carbs_100g,
          fat_100g: food.fat_100g,
        },
      })
      toast.success(`${food.name} aggiunto a ${getMealLabel(mealType)}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante l\'aggiunta dell\'alimento')
    }
  }

  async function handleDrop(mealType: string, dayId: string) {
    if (!draggedFood) return
    const food = draggedFood
    setDraggedFood(null)
    const activeDayIndex = parseInt(activeTab.replace('day-', ''))
    const activeDay = plan?.days?.[activeDayIndex]
    const maxSort = activeDay?.items?.reduce((m, i) => Math.max(m, i.sort_order ?? 0), 0) ?? 0
    try {
      await addItem.mutateAsync({
        dayId,
        planId: id!,
        foodId: food.id,
        mealType,
        quantityG: 100,
        sortOrder: maxSort + 1,
        food: {
          kcal_100g: food.kcal_100g,
          protein_100g: food.protein_100g,
          carbs_100g: food.carbs_100g,
          fat_100g: food.fat_100g,
        },
      })
      toast.success(`${food.name} aggiunto (100 g) — modifica la quantità se necessario`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante l\'aggiunta dell\'alimento')
    }
  }

  function handleReorderMealGroups(
    dayId: string,
    currentOrder: string[],
    fromType: string,
    toType: string,
  ) {
    const newOrder = [...currentOrder]
    const fromIndex = newOrder.indexOf(fromType)
    const toIndex = newOrder.indexOf(toType)
    if (fromIndex === -1 || toIndex === -1) return
    newOrder.splice(fromIndex, 1)
    newOrder.splice(toIndex, 0, fromType)
    updateDay.mutateAsync({ dayId, planId: id!, mealGroupOrder: newOrder }).catch(() => {
      toast.error('Errore durante il riordino dei pasti')
    })
  }

  async function handleDeletePlan() {
    try {
      await deletePlan.mutateAsync(id!)
      toast.success('Piano eliminato')
      navigate('/piani')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante l\'eliminazione')
    }
  }

  const canEdit = plan.status === 'draft' || plan.status === 'active'
  const hasDays = (plan.days?.length ?? 0) > 0

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
    {/* ── Main content ── */}
    <div className="flex-1 min-w-0 space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="shrink-0 text-muted-foreground">
          <Link to="/piani"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[22px] font-semibold tracking-tight truncate">{plan.name}</h1>
          {plan.start_date && (
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Dal {formatDate(plan.start_date)}{plan.end_date ? ` al ${formatDate(plan.end_date)}` : ''}
            </p>
          )}
        </div>
        <Badge variant={statusVariant[plan.status] ?? 'secondary'}>{statusLabel[plan.status] ?? plan.status}</Badge>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />Modifica
          </Button>
        )}
        <Button
          variant="ghost" size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setConfirmDeletePlan(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/pdf?piano=${id}`}>
            <FileText className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Genera PDF</span>
          </Link>
        </Button>
      </div>

      {/* Target macro */}
      {plan.target_kcal && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(() => {
            const tk = plan.target_kcal
            const macroKcal = calcKcalFromMacros(plan.target_protein_g ?? 0, plan.target_carbs_g ?? 0, plan.target_fat_g ?? 0)
            const pct = (g: number | null | undefined, kcalPer: number) =>
              macroKcal > 0 && g ? Math.round((g * kcalPer / macroKcal) * 100) : null
            const cards = [
              { label: 'Target kcal', value: `${tk}`, unit: 'kcal', color: 'text-primary', sub: null },
              { label: 'Proteine', value: plan.target_protein_g ? `${plan.target_protein_g}` : '—', unit: 'g', color: 'text-blue-600', sub: pct(plan.target_protein_g, 4) },
              { label: 'Carboidrati', value: plan.target_carbs_g ? `${plan.target_carbs_g}` : '—', unit: 'g', color: 'text-amber-600', sub: pct(plan.target_carbs_g, 4) },
              { label: 'Grassi', value: plan.target_fat_g ? `${plan.target_fat_g}` : '—', unit: 'g', color: 'text-rose-600', sub: pct(plan.target_fat_g, 9) },
            ]
            return cards.map(({ label, value, unit, color, sub }) => (
              <div key={label} className="rounded-xl border border-border/70 bg-card px-4 py-3.5 shadow-card">
                <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground mb-2">{label}</p>
                <p className={`text-[1.6rem] font-bold leading-none tracking-tight ${color}`}>
                  {value}
                  {value !== '—' && <span className="text-[13px] font-medium ml-1 text-muted-foreground">{unit}</span>}
                </p>
                {sub !== null && <p className="text-[11px] text-muted-foreground mt-1">{sub}%</p>}
              </div>
            ))
          })()}
        </div>
      )}

      {/* Da consumare in giornata */}
      {plan.daily_extras && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex gap-3">
            <Apple className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1">Da consumare in giornata</p>
              <p className="text-sm text-amber-900 whitespace-pre-wrap">{plan.daily_extras}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Considerazioni */}
      {plan.considerations && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-primary" />
              Considerazioni e caratteristiche della dieta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{plan.considerations}</p>
          </CardContent>
        </Card>
      )}

      {/* Days builder */}
      {hasDays ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center gap-2">
            <TabsList className="flex-wrap h-auto gap-1 flex-1">
              {plan.days?.map((day, i) => {
                const dayItems = day.items ?? []
                const dayKcal = calcKcalFromMacros(
                  dayItems.reduce((s, it) => s + it.protein_g, 0),
                  dayItems.reduce((s, it) => s + it.carbs_g, 0),
                  dayItems.reduce((s, it) => s + it.fat_g, 0),
                )
                const pct = plan.target_kcal && dayKcal > 0 ? dayKcal / plan.target_kcal : null
                const dot = !day.is_free_day && pct !== null
                  ? pct >= 0.9 && pct <= 1.1 ? 'bg-green-500'
                  : pct >= 0.75 && pct <= 1.25 ? 'bg-yellow-400'
                  : 'bg-red-500'
                  : null
                return (
                  <TabsTrigger key={day.id} value={`day-${i}`} className={day.is_free_day ? 'opacity-60' : ''}>
                    {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot} mr-1 inline-block shrink-0`} />}
                    {day.is_free_day && <Ban className="h-3 w-3 mr-1 text-muted-foreground" />}
                    {day.day_label ?? `Giorno ${day.day_number}`}
                  </TabsTrigger>
                )
              })}
            </TabsList>
            {canEdit && (
              <Button size="sm" variant="outline" onClick={handleAddDay} disabled={addDay.isPending}>
                {addDay.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                <span className="ml-1 hidden sm:inline">Giorno</span>
              </Button>
            )}
          </div>

          {plan.days?.map((day, i) => {
            const allItems = day.items ?? []
            const totalProtein = allItems.reduce((s, item) => s + item.protein_g, 0)
            const totalCarbs = allItems.reduce((s, item) => s + item.carbs_g, 0)
            const totalFat = allItems.reduce((s, item) => s + item.fat_g, 0)
            const totalKcal = calcKcalFromMacros(totalProtein, totalCarbs, totalFat)
            const mealTypesInDay = getDayMealTypes(allItems, day.meal_group_order)

            return (
              <TabsContent key={day.id} value={`day-${i}`} className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold flex items-center gap-2">
                      {day.is_free_day && <Ban className="h-4 w-4 text-muted-foreground" />}
                      {day.day_label ?? `Giorno ${day.day_number}`}
                      {day.is_free_day && <Badge variant="secondary" className="text-xs">Giorno libero</Badge>}
                    </h3>
                    {!day.is_free_day && allItems.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {totalKcal} kcal totali • P:{totalProtein.toFixed(0)}g C:{totalCarbs.toFixed(0)}g G:{totalFat.toFixed(0)}g
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {canEdit && (
                      <>
                        {!day.is_free_day && (
                          <Button size="sm" onClick={() => openAddFood(day.id, getActiveDayMealTypes()[0] ?? 'Pranzo')}>
                            <Plus className="mr-1.5 h-4 w-4" />Aggiungi alimento
                          </Button>
                        )}
                        {!day.is_free_day && !!templates?.length && (
                          <Button size="sm" variant="outline" onClick={() => setInsertTemplateDialogDayId(day.id)}>
                            <Sparkles className="mr-1.5 h-4 w-4" />Template
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className={day.is_free_day ? 'text-muted-foreground' : 'text-amber-600 border-amber-300 hover:bg-amber-50'}
                          onClick={() => handleToggleFreeDay(day.id, !!day.is_free_day)}
                          disabled={updateDay.isPending}
                          title={day.is_free_day ? 'Rimuovi flag giorno libero' : 'Segna come giorno libero (sabato/domenica)'}
                        >
                          <Ban className="h-3.5 w-3.5 mr-1" />
                          {day.is_free_day ? 'Ripristina' : 'Libero'}
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setConfirmDeleteDayId(day.id)}
                          disabled={deleteDay.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* % vs target per macro */}
                {!day.is_free_day && allItems.length > 0 && (plan.target_kcal || plan.target_protein_g || plan.target_carbs_g || plan.target_fat_g) && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { label: 'Kcal', actual: totalKcal, target: plan.target_kcal, color: 'text-primary' },
                      { label: 'Proteine', actual: totalProtein, target: plan.target_protein_g, color: 'text-blue-600', unit: 'g' },
                      { label: 'Carb.', actual: totalCarbs, target: plan.target_carbs_g, color: 'text-amber-600', unit: 'g' },
                      { label: 'Grassi', actual: totalFat, target: plan.target_fat_g, color: 'text-rose-600', unit: 'g' },
                    ].map(({ label, actual, target, color, unit }) => {
                      if (!target) return null
                      const rounded = Math.round(actual)
                      const pct = Math.round((actual / target) * 100)
                      const diff = Math.round(target - actual)
                      const isOver = actual > target
                      const isOk = pct >= 90 && pct <= 110
                      const isClose = pct >= 75 && pct <= 125
                      const statusColor = isOk ? 'text-green-600' : isClose ? 'text-amber-500' : 'text-red-500'
                      const barColor = isOk ? 'bg-green-500' : isClose ? 'bg-amber-400' : 'bg-red-400'
                      const barWidth = Math.min(pct, 100)
                      return (
                        <div key={label} className="rounded-lg border border-border/50 bg-card p-2.5 space-y-1.5">
                          <p className={`text-[11px] font-semibold uppercase tracking-wide ${color}`}>{label}</p>
                          <p className="text-sm font-bold leading-none">
                            {rounded}{unit ?? ' kcal'}
                            <span className="text-xs text-muted-foreground font-normal ml-1">/ {target}{unit ?? ' kcal'}</span>
                          </p>
                          <div className="h-1 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${barWidth}%` }} />
                          </div>
                          <p className={`text-[11px] font-medium ${statusColor}`}>
                            {isOver
                              ? `+${Math.abs(diff)}${unit ?? ' kcal'} eccedenza`
                              : `${diff}${unit ?? ' kcal'} mancanti`}
                            <span className="text-muted-foreground/60 ml-1">({pct}%)</span>
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}

                {day.is_free_day ? (
                  <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 flex flex-col items-center justify-center py-10 gap-2">
                    <Ban className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Giorno libero — nessun piano prestabilito</p>
                    {plan.daily_extras && (
                      <p className="text-xs text-muted-foreground/70 max-w-sm text-center">
                        Ricorda: {plan.daily_extras}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Meal groups - dynamic based on items */}
                    {mealTypesInDay.length > 0 ? (
                      <div className="space-y-4">
                        {mealTypesInDay.map(mealTypeName => (
                          <div
                            key={mealTypeName}
                            className={cn('transition-opacity duration-150', draggedMealGroup === mealTypeName && 'opacity-40')}
                            onDragOver={(e) => {
                              if (draggedMealGroup && draggedMealGroup !== mealTypeName) e.preventDefault()
                            }}
                            onDrop={(e) => {
                              if (draggedMealGroup && draggedMealGroup !== mealTypeName) {
                                e.preventDefault()
                                handleReorderMealGroups(day.id, mealTypesInDay, draggedMealGroup, mealTypeName)
                                setDraggedMealGroup(null)
                              }
                            }}
                            onDragEnd={() => setDraggedMealGroup(null)}
                          >
                            <MealGroup
                              items={allItems}
                              mealTypeName={mealTypeName}
                              planId={id!}
                              canEdit={canEdit}
                              onDrop={canEdit && !draggedMealGroup ? () => handleDrop(mealTypeName, day.id) : undefined}
                              isDragging={!!draggedFood && !draggedMealGroup}
                              onGroupDragStart={canEdit ? (e) => {
                                e.stopPropagation()
                                setDraggedMealGroup(mealTypeName)
                                setDraggedFood(null)
                              } : undefined}
                              onGroupDragEnd={() => setDraggedMealGroup(null)}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      canEdit && (
                        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 flex flex-col items-center justify-center py-8 gap-2">
                          <p className="text-sm text-muted-foreground">Nessun alimento — inizia aggiungendo il primo pasto</p>
                        </div>
                      )
                    )}

                    {canEdit && allItems.length > 0 && (
                      <Button
                        variant="outline" size="sm" className="w-full"
                        onClick={() => openAddFood(day.id, mealTypesInDay[mealTypesInDay.length - 1] ?? 'Cena')}
                      >
                        <Plus className="mr-2 h-4 w-4" />Aggiungi altro alimento
                      </Button>
                    )}
                  </>
                )}

                {/* Per-day note */}
                {day.daily_note && (
                  <p className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                    <StickyNote className="h-3 w-3" />{day.daily_note}
                  </p>
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="text-5xl">📋</div>
            <div className="text-center">
              <p className="font-medium">Nessun giorno nel piano</p>
              <p className="text-sm text-muted-foreground mt-1">
                Genera il piano automaticamente (7 giorni) oppure aggiungi i giorni manualmente
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              {canEdit && (
                <Button
                  onClick={handleGeneratePlan}
                  disabled={generateContent.isPending || !plan.target_kcal}
                  title={!plan.target_kcal ? 'Imposta il target kcal/die nel piano per usare la generazione automatica' : undefined}
                >
                  {generateContent.isPending
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generazione in corso...</>
                    : <><Sparkles className="mr-2 h-4 w-4" />Genera piano AI</>
                  }
                </Button>
              )}
              <Button
                variant={canEdit && !!plan.target_kcal ? 'outline' : 'default'}
                onClick={handleAddDay}
                disabled={addDay.isPending}
              >
                {addDay.isPending
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Aggiunta...</>
                  : <><Plus className="mr-2 h-4 w-4" />Aggiungi giorno manualmente</>
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {hasDays && canEdit && (
        <div className="flex justify-center">
          <Button variant="ghost" size="sm" onClick={handleAddDay} disabled={addDay.isPending}>
            <Plus className="mr-2 h-4 w-4" />Aggiungi giorno
          </Button>
        </div>
      )}

      {/* Consigli pratici */}
      {plan.practical_advice && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-primary" />
              Consigli pratici
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{plan.practical_advice}</p>
          </CardContent>
        </Card>
      )}

      {plan.notes && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Note interne</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{plan.notes}</p></CardContent>
        </Card>
      )}

      <AddFoodDialog
        open={addFoodDialogOpen}
        onClose={() => setAddFoodDialogOpen(false)}
        onAdd={handleAddItem}
        defaultMealType={defaultMealType}
        existingMealTypes={getActiveDayMealTypes()}
      />

      {/* Confirm delete plan */}
      <Dialog open={confirmDeletePlan} onOpenChange={(v) => { if (!v) setConfirmDeletePlan(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />Elimina piano alimentare
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Sei sicuro di voler eliminare <strong>"{plan.name}"</strong>? L'operazione non è reversibile.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDeletePlan(false)}>Annulla</Button>
            <Button variant="destructive" disabled={deletePlan.isPending} onClick={handleDeletePlan}>
              {deletePlan.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Elimina definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete day */}
      <Dialog open={!!confirmDeleteDayId} onOpenChange={(v) => { if (!v) setConfirmDeleteDayId(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Elimina giorno</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Sei sicuro? Tutti gli alimenti inseriti verranno rimossi.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDeleteDayId(null)}>Annulla</Button>
            <Button
              variant="destructive" disabled={deleteDay.isPending}
              onClick={() => confirmDeleteDayId && handleDeleteDay(confirmDeleteDayId)}
            >
              {deleteDay.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Insert template dialog */}
      <Dialog open={!!insertTemplateDialogDayId} onOpenChange={(v) => { if (!v) setInsertTemplateDialogDayId(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />Inserisci template
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mb-1">
            Seleziona un template salvato da aggiungere al giorno corrente.
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {templates?.map(tpl => (
              <button
                key={tpl.id}
                disabled={insertingTemplate}
                onClick={() => insertTemplateDialogDayId && handleInsertTemplate(insertTemplateDialogDayId, tpl.id)}
                className="w-full text-left rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5 hover:bg-muted/60 transition-colors disabled:opacity-50"
              >
                <p className="text-sm font-medium">{tpl.name}</p>
                {tpl.meal_type && <p className="text-xs text-muted-foreground">{getMealLabel(tpl.meal_type)} • {tpl.items?.length ?? 0} alimenti</p>}
              </button>
            ))}
            {!templates?.length && (
              <p className="text-sm text-muted-foreground text-center py-4">Nessun template salvato</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInsertTemplateDialogDayId(null)}>Annulla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editDialogOpen && (
        <EditMealPlanDialog plan={plan} open={editDialogOpen} onClose={() => setEditDialogOpen(false)} />
      )}
    </div>

    {/* Food sidebar — drag & drop, hidden on mobile */}
    {canEdit && hasDays && (
      <div
        className="hidden lg:flex w-64 shrink-0 sticky top-6 self-start border rounded-xl bg-card p-3 h-[calc(100vh-8rem)] flex-col"
        onDragEnd={() => setDraggedFood(null)}
      >
        <FoodSidebar onDragStart={setDraggedFood} />
      </div>
    )}
    </div>
  )
}
