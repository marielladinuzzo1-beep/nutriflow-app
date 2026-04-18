import { useQuery } from '@tanstack/react-query'
import { Loader2, UtensilsCrossed, Sun, Coffee, Apple, Moon, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { MealPlan } from '@/types'

interface PatientMealItem {
  id: string
  meal_type: string
  quantity_g: number
  quantity_max_g?: number | null
  sort_order?: number
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  notes?: string
  food: { name: string } | null
}

interface PatientMealDay {
  id: string
  day_number: number
  day_label?: string
  is_free_day?: boolean
  daily_note?: string
  items: PatientMealItem[]
}

interface ActivePlan extends Omit<MealPlan, 'days'> {
  days: PatientMealDay[]
}

// ─── Legacy slug → display label ─────────────────────────────────────────────
const MEAL_LEGACY_LABELS: Record<string, string> = {
  colazione: 'Colazione',
  spuntino_mattina: 'Spuntino mattina',
  pranzo: 'Pranzo',
  spuntino_pomeriggio: 'Spuntino pomeriggio',
  cena: 'Cena',
}

const MEAL_SORT_ORDER: Record<string, number> = {
  colazione: 0,
  breakfast: 0,
  'spuntino mattina': 10,
  spuntino_mattina: 10,
  pranzo: 20,
  lunch: 20,
  'spuntino pomeriggio': 30,
  spuntino_pomeriggio: 30,
  cena: 40,
  dinner: 40,
}

function getMealLabel(mealType: string): string {
  return MEAL_LEGACY_LABELS[mealType] ?? mealType
}

function getMealIcon(mealType: string) {
  const key = mealType.toLowerCase()
  if (key.includes('colazione') || key.includes('breakfast')) return <Coffee className="h-3 w-3" />
  if (key.includes('spuntino') || key.includes('snack') || key.includes('frutta')) return <Apple className="h-3 w-3" />
  if (key.includes('cena') || key.includes('dinner') || key.includes('sera')) return <Moon className="h-3 w-3" />
  return <Sun className="h-3 w-3" />
}

function sortMealTypes(types: string[]): string[] {
  return [...types].sort((a, b) => {
    const oa = MEAL_SORT_ORDER[a.toLowerCase()] ?? 50
    const ob = MEAL_SORT_ORDER[b.toLowerCase()] ?? 50
    return oa - ob
  })
}

function getDayMealTypes(items: PatientMealItem[]): string[] {
  const seen = new Set<string>()
  const order: string[] = []
  for (const item of [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))) {
    if (!seen.has(item.meal_type)) {
      seen.add(item.meal_type)
      order.push(item.meal_type)
    }
  }
  // If items already have natural sort_order, prefer that; otherwise sort by meal type priority
  return order.length > 0 ? sortMealTypes(order) : []
}

function useMyActivePlan() {
  return useQuery({
    queryKey: ['patient_active_plan'],
    queryFn: async () => {
      // Bug fix (v0.2.0): il paziente deve vedere solo il piano ATTIVO
      // (in precedenza prendeva anche i draft, sovrascrivendo il piano attivato)
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*, days:meal_plan_days(*, items:meal_plan_items(id, meal_type, quantity_g, quantity_max_g, sort_order, kcal, protein_g, carbs_g, fat_g, notes, food:foods(name)))')
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      if (data?.days) {
        for (const day of data.days) {
          if (day.items) {
            day.items.sort((a, b) => ((a as PatientMealItem).sort_order ?? 0) - ((b as PatientMealItem).sort_order ?? 0))
          }
        }
      }
      return data as ActivePlan | null
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function PatientMealPlanPage() {
  const { data: plan, isLoading } = useMyActivePlan()

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">Piano alimentare</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Il tuo piano nutrizionale attuale</p>
      </div>

      {!plan ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 rounded-xl border border-dashed border-border text-center">
          <UtensilsCrossed className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-[13px] text-muted-foreground">Nessun piano alimentare assegnato dal nutrizionista</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Plan header */}
          <Card>
            <CardContent className="p-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">{plan.name}</p>
                {plan.description && <p className="text-sm text-muted-foreground mt-0.5">{plan.description}</p>}
                {plan.target_kcal && (
                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                    <span><strong>{plan.target_kcal}</strong> kcal/giorno</span>
                    {plan.target_protein_g && <span>P: <strong>{plan.target_protein_g}g</strong></span>}
                    {plan.target_carbs_g && <span>C: <strong>{plan.target_carbs_g}g</strong></span>}
                    {plan.target_fat_g && <span>G: <strong>{plan.target_fat_g}g</strong></span>}
                  </div>
                )}
              </div>
              <Badge variant={plan.status === 'active' ? 'success' : 'secondary'}>
                {plan.status === 'active' ? 'Attivo' : 'Bozza'}
              </Badge>
            </CardContent>
          </Card>

          {/* Da consumare in giornata */}
          {plan.daily_extras && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">Da consumare in giornata</p>
                <p className="text-sm text-amber-900 whitespace-pre-wrap">{plan.daily_extras}</p>
              </CardContent>
            </Card>
          )}

          {/* Considerazioni */}
          {plan.considerations && (
            <Card className="border-blue-100 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Info className="h-3.5 w-3.5 text-blue-600" />
                  <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Considerazioni</p>
                </div>
                <p className="text-sm text-blue-900 whitespace-pre-wrap">{plan.considerations}</p>
              </CardContent>
            </Card>
          )}

          {/* Days */}
          {[...(plan.days ?? [])].sort((a, b) => a.day_number - b.day_number).map(day => {
            if (day.is_free_day) {
              return (
                <Card key={day.id} className="border-dashed opacity-75">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{day.day_label ?? `Giorno ${day.day_number}`}</p>
                      <Badge variant="secondary">Giorno libero</Badge>
                    </div>
                    {day.daily_note && <p className="text-xs text-muted-foreground mt-1">{day.daily_note}</p>}
                    {plan.daily_extras && (
                      <p className="text-xs text-amber-700 mt-2">
                        Ricorda: {plan.daily_extras}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            }

            const allItems = day.items ?? []
            const mealTypes = getDayMealTypes(allItems)
            const dayKcal = allItems.reduce((sum, i) => sum + (i.kcal ?? 0), 0)

            return (
              <Card key={day.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      {day.day_label ?? `Giorno ${day.day_number}`}
                    </CardTitle>
                    {dayKcal > 0 && (
                      <span className="text-xs text-muted-foreground font-normal">
                        {Math.round(dayKcal)} kcal totali
                      </span>
                    )}
                  </div>
                  {day.daily_note && <p className="text-xs text-muted-foreground">{day.daily_note}</p>}
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {mealTypes.map(mt => {
                    const items = allItems.filter(i => i.meal_type === mt)
                    if (!items.length) return null
                    const mealKcal = items.reduce((s, i) => s + (i.kcal ?? 0), 0)
                    return (
                      <div key={mt}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">{getMealIcon(mt)}</span>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              {getMealLabel(mt)}
                            </p>
                          </div>
                          <span className="text-[11px] text-muted-foreground">{Math.round(mealKcal)} kcal</span>
                        </div>
                        <div className="space-y-1">
                          {items.map(item => (
                            <div key={item.id} className="flex items-center justify-between text-sm py-1 px-2 rounded-md hover:bg-muted/40 transition-colors">
                              <span>{item.food?.name ?? 'Alimento'}</span>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>
                                  {item.quantity_g}{item.quantity_max_g ? `–${item.quantity_max_g}` : ''} g
                                </span>
                                <span>{Math.round(item.kcal)} kcal</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  {!allItems.length && (
                    <p className="text-xs text-muted-foreground py-2">Nessun alimento in questo giorno</p>
                  )}
                </CardContent>
              </Card>
            )
          })}

          {!plan.days?.length && (
            <p className="text-center text-muted-foreground py-8 text-sm">
              Il piano non ha ancora giorni configurati dal nutrizionista.
            </p>
          )}

          {/* Consigli pratici */}
          {plan.practical_advice && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Consigli pratici</p>
                <p className="text-sm whitespace-pre-wrap">{plan.practical_advice}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
