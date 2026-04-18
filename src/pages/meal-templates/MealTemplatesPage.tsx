import { useState } from 'react'
import {
  Plus, Trash2, Pencil, Search, X, Loader2, ChevronDown, ChevronUp, UtensilsCrossed,
} from 'lucide-react'
import {
  useMealTemplates, useSaveMealTemplate, useDeleteMealTemplate,
  useUpdateMealTemplate, useAddMealTemplateItem, useDeleteMealTemplateItem,
} from '@/hooks/useMealTemplates'
import { useFoods, searchOpenFoodFacts } from '@/hooks/useFoods'
import { useDebounce } from '@/hooks/useDebounce'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/toast'
import type { MealTemplate, MealTemplateItem, Food } from '@/types'

// ─── Food picker dialog ───────────────────────────────────────────────────────

function FoodPickerDialog({
  open,
  onClose,
  onPick,
}: {
  open: boolean
  onClose: () => void
  onPick: (food: Food, qty: number, qtyMax?: number) => void
}) {
  const [tab, setTab] = useState<'locale' | 'off'>('locale')
  const [search, setSearch] = useState('')
  const [offSearch, setOffSearch] = useState('')
  const [offResults, setOffResults] = useState<Food[]>([])
  const [offLoading, setOffLoading] = useState(false)
  const [selected, setSelected] = useState<Food | null>(null)
  const [qty, setQty] = useState('100')
  const [qtyMax, setQtyMax] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const { data: foods } = useFoods(debouncedSearch)

  async function searchOFF() {
    if (!offSearch.trim()) return
    setOffLoading(true)
    const results = await searchOpenFoodFacts(offSearch)
    setOffResults(results)
    setOffLoading(false)
  }

  function handlePick() {
    if (!selected || !qty || Number(qty) <= 0) return
    const max = qtyMax ? Number(qtyMax) : undefined
    onPick(selected, Number(qty), max && max > Number(qty) ? max : undefined)
    onClose()
    setSelected(null)
    setSearch('')
    setQty('100')
    setQtyMax('')
  }

  function FoodRow({ food }: { food: Food }) {
    const isSelected = selected?.id === food.id
    return (
      <button
        type="button"
        onClick={() => setSelected(isSelected ? null : food)}
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
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader><DialogTitle>Aggiungi alimento al template</DialogTitle></DialogHeader>
        <div className="flex gap-2 text-sm">
          {(['locale', 'off'] as const).map(t => (
            <button
              key={t}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              onClick={() => setTab(t)}
            >
              {t === 'locale' ? 'Database locale' : 'Open Food Facts 🌍'}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {tab === 'locale' ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Cerca alimento..." value={search}
                  onChange={e => setSearch(e.target.value)} autoFocus />
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
                <Input placeholder="Es: pasta barilla..." value={offSearch}
                  onChange={e => setOffSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchOFF()} />
                <Button variant="outline" onClick={searchOFF} disabled={offLoading}>
                  {offLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              <div className="space-y-1">
                {offResults.map((food, i) => <FoodRow key={`off-${i}`} food={food} />)}
                {!offResults.length && (
                  <p className="text-center text-sm text-muted-foreground py-4">Cerca un alimento</p>
                )}
              </div>
            </>
          )}
        </div>
        {selected && (
          <>
            <Separator />
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <span>{selected.name}</span>
                <button onClick={() => setSelected(null)}><X className="h-3.5 w-3.5" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Quantità min (g)</Label>
                  <Input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">Quantità max (g) — opzionale</Label>
                  <Input type="number" min="1" value={qtyMax} onChange={e => setQtyMax(e.target.value)} placeholder="range" />
                </div>
              </div>
            </div>
          </>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={handlePick} disabled={!selected || !qty || Number(qty) <= 0}>
            <Plus className="mr-2 h-4 w-4" />Aggiungi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Create template dialog ───────────────────────────────────────────────────

const MEAL_SUGGESTIONS = [
  'Colazione', 'Pranzo', 'Cena', 'Spuntino mattina', 'Spuntino pomeriggio',
  'Pre-allenamento', 'Post-allenamento', 'Da consumare in giornata',
]

function CreateTemplateDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const saveTemplate = useSaveMealTemplate()
  const [name, setName] = useState('')
  const [mealType, setMealType] = useState('')
  const [items, setItems] = useState<Array<{ food: Food; qty: number; qtyMax?: number }>>([])
  const [foodPickerOpen, setFoodPickerOpen] = useState(false)

  function handleAddFood(food: Food, qty: number, qtyMax?: number) {
    setItems(prev => [...prev, { food, qty, qtyMax }])
  }

  async function handleSave() {
    if (!name.trim()) return
    try {
      await saveTemplate.mutateAsync({
        name: name.trim(),
        mealType: mealType.trim(),
        items: items.map((it, idx) => ({
          food_id: it.food.id,
          food_name: it.food.name,
          quantity_g: it.qty,
          quantity_max_g: it.qtyMax,
          sort_order: idx,
        })),
      })
      toast.success(`Template "${name}" creato`)
      onClose()
      setName('')
      setMealType('')
      setItems([])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante la creazione')
    }
  }

  const totals = items.reduce(
    (acc, it) => {
      const kcal = Math.round(it.food.kcal_100g * it.qty / 100)
      const p = it.food.protein_100g * it.qty / 100
      const c = it.food.carbs_100g * it.qty / 100
      const f = it.food.fat_100g * it.qty / 100
      return { kcal: acc.kcal + kcal, p: acc.p + p, c: acc.c + c, f: acc.f + f }
    },
    { kcal: 0, p: 0, c: 0, f: 0 }
  )

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuovo template pasto</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome template *</Label>
              <Input placeholder="Es: Colazione standard, Pranzo proteico..." value={name}
                onChange={e => setName(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo di pasto</Label>
              <div className="relative">
                <input
                  list="meal-type-list"
                  value={mealType}
                  onChange={e => setMealType(e.target.value)}
                  placeholder="Es: Colazione, Pranzo..."
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <datalist id="meal-type-list">
                  {MEAL_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
            </div>

            {/* Items list */}
            {items.length > 0 && (
              <div className="space-y-1.5">
                <Label>Alimenti ({items.length})</Label>
                <div className="space-y-1">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                      <span className="flex-1 truncate">{it.food.name}</span>
                      <span className="text-muted-foreground text-xs mr-2">
                        {it.qty}{it.qtyMax ? `–${it.qtyMax}` : ''}g
                      </span>
                      <button onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                        className="text-destructive hover:text-destructive/80">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                {totals.kcal > 0 && (
                  <p className="text-xs text-muted-foreground px-1">
                    Totale: {totals.kcal} kcal · P:{totals.p.toFixed(0)}g C:{totals.c.toFixed(0)}g G:{totals.f.toFixed(0)}g
                  </p>
                )}
              </div>
            )}

            <Button variant="outline" size="sm" className="w-full" onClick={() => setFoodPickerOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />Aggiungi alimento
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Annulla</Button>
            <Button onClick={handleSave} disabled={!name.trim() || saveTemplate.isPending}>
              {saveTemplate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Crea template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <FoodPickerDialog open={foodPickerOpen} onClose={() => setFoodPickerOpen(false)} onPick={handleAddFood} />
    </>
  )
}

// ─── Template card ────────────────────────────────────────────────────────────

function TemplateCard({ template }: { template: MealTemplate }) {
  const deleteTemplate = useDeleteMealTemplate()
  const updateTemplate = useUpdateMealTemplate()
  const addItem = useAddMealTemplateItem()
  const deleteItem = useDeleteMealTemplateItem()

  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(template.name)
  const [editMealType, setEditMealType] = useState(template.meal_type ?? '')
  const [foodPickerOpen, setFoodPickerOpen] = useState(false)

  const items = template.items ?? []
  const totals = items.reduce(
    (acc, it) => {
      if (!it.food) return acc
      const kcal = Math.round(it.food.kcal_100g * it.quantity_g / 100)
      const p = it.food.protein_100g * it.quantity_g / 100
      const c = it.food.carbs_100g * it.quantity_g / 100
      const f = it.food.fat_100g * it.quantity_g / 100
      return { kcal: acc.kcal + kcal, p: acc.p + p, c: acc.c + c, f: acc.f + f }
    },
    { kcal: 0, p: 0, c: 0, f: 0 }
  )

  async function handleDelete() {
    try {
      await deleteTemplate.mutateAsync(template.id)
      toast.success('Template eliminato')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    }
  }

  async function handleSaveEdit() {
    if (!editName.trim()) return
    try {
      await updateTemplate.mutateAsync({ id: template.id, name: editName.trim(), mealType: editMealType.trim() })
      toast.success('Template aggiornato')
      setEditing(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    }
  }

  async function handleAddFood(food: Food, qty: number, qtyMax?: number) {
    try {
      await addItem.mutateAsync({
        templateId: template.id,
        foodId: food.id,
        foodName: food.name,
        quantityG: qty,
        quantityMaxG: qtyMax,
        sortOrder: items.length,
      })
      toast.success(`${food.name} aggiunto`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    }
  }

  async function handleDeleteItem(item: MealTemplateItem) {
    try {
      await deleteItem.mutateAsync(item.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    }
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-2">
                  <Input value={editName} onChange={e => setEditName(e.target.value)}
                    className="h-7 text-sm font-semibold" autoFocus />
                  <input
                    list="meal-type-edit-list"
                    value={editMealType}
                    onChange={e => setEditMealType(e.target.value)}
                    placeholder="Tipo di pasto"
                    className="flex h-7 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <datalist id="meal-type-edit-list">
                    {MEAL_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                  </datalist>
                  <div className="flex gap-1.5">
                    <Button size="sm" className="h-6 text-xs" onClick={handleSaveEdit} disabled={updateTemplate.isPending}>
                      {updateTemplate.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Salva'}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditing(false)}>Annulla</Button>
                  </div>
                </div>
              ) : (
                <>
                  <CardTitle className="text-base truncate">{template.name}</CardTitle>
                  {template.meal_type && (
                    <Badge variant="secondary" className="mt-1 text-xs">{template.meal_type}</Badge>
                  )}
                </>
              )}
            </div>
            {!editing && (
              <div className="flex items-center gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)} title="Modifica">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmDelete(true)} title="Elimina">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
          {totals.kcal > 0 && (
            <p className="text-[11px] text-muted-foreground mt-1">
              {totals.kcal} kcal · P:{totals.p.toFixed(0)}g C:{totals.c.toFixed(0)}g G:{totals.f.toFixed(0)}g
            </p>
          )}
        </CardHeader>

        <CardContent className="pt-0 pb-3 space-y-2">
          {/* Toggle items */}
          <button
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setExpanded(v => !v)}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {items.length} aliment{items.length === 1 ? 'o' : 'i'}
          </button>

          {expanded && (
            <div className="space-y-1.5 pt-1">
              {items.length === 0 && (
                <p className="text-xs text-muted-foreground/60 italic">Nessun alimento</p>
              )}
              {items.map(item => (
                <div key={item.id} className="flex items-center justify-between rounded-md bg-muted/40 px-2.5 py-1.5 text-xs group">
                  <span className="flex-1 truncate font-medium">{item.food_name}</span>
                  <span className="text-muted-foreground mr-2">
                    {item.quantity_g}{item.quantity_max_g ? `–${item.quantity_max_g}` : ''}g
                  </span>
                  {item.food && (
                    <span className="text-muted-foreground/70 mr-2">
                      {Math.round(item.food.kcal_100g * item.quantity_g / 100)} kcal
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteItem(item)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full h-7 text-xs mt-1"
                onClick={() => setFoodPickerOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />Aggiungi alimento
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm delete */}
      <Dialog open={confirmDelete} onOpenChange={(v) => { if (!v) setConfirmDelete(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Elimina template</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Elimina <strong>"{template.name}"</strong>? L'operazione non è reversibile.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Annulla</Button>
            <Button variant="destructive" disabled={deleteTemplate.isPending} onClick={handleDelete}>
              {deleteTemplate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FoodPickerDialog open={foodPickerOpen} onClose={() => setFoodPickerOpen(false)} onPick={handleAddFood} />
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function MealTemplatesPage() {
  const { data: templates, isLoading } = useMealTemplates()
  const [createOpen, setCreateOpen] = useState(false)
  const [filter, setFilter] = useState('')

  const filtered = (templates ?? []).filter(t =>
    !filter || t.name.toLowerCase().includes(filter.toLowerCase()) ||
    t.meal_type?.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Template pasti</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Crea e riutilizza combinazioni di alimenti nei piani
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />Nuovo template
        </Button>
      </div>

      {/* Search */}
      {(templates?.length ?? 0) > 3 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Filtra template..." value={filter} onChange={e => setFilter(e.target.value)} />
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <UtensilsCrossed className="h-10 w-10 text-muted-foreground/30" />
          <div className="text-center">
            <p className="font-medium text-muted-foreground">
              {filter ? 'Nessun template trovato' : 'Nessun template salvato'}
            </p>
            {!filter && (
              <p className="text-sm text-muted-foreground/70 mt-1">
                Crea un template oppure salvane uno da un piano alimentare esistente
              </p>
            )}
          </div>
          {!filter && (
            <Button variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />Crea il primo template
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(tpl => (
            <TemplateCard key={tpl.id} template={tpl} />
          ))}
        </div>
      )}

      <CreateTemplateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
