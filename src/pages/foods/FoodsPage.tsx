import { useState } from 'react'
import { Search, Plus, Loader2, ExternalLink, Pencil } from 'lucide-react'
import { useFoods, searchOpenFoodFacts, useCreateFood, useUpdateFood } from '@/hooks/useFoods'
import { useDebounce } from '@/hooks/useDebounce'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { foodSchema, type FoodFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/toast'
import type { Food } from '@/types'

// ─── Form dialog riusabile (create + edit) ────────────────────────────────────

function FoodFormDialog({
  open,
  onClose,
  food,
}: {
  open: boolean
  onClose: () => void
  food?: Food
}) {
  const createFood = useCreateFood()
  const updateFood = useUpdateFood()
  const isEdit = !!food

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FoodFormData>({
    resolver: zodResolver(foodSchema),
    defaultValues: food
      ? {
          name: food.name,
          category: food.category ?? '',
          kcal_100g: food.kcal_100g,
          protein_100g: food.protein_100g,
          carbs_100g: food.carbs_100g,
          fat_100g: food.fat_100g,
          fiber_100g: food.fiber_100g ?? '',
          sodium_100g: food.sodium_100g ?? '',
        }
      : {},
  })

  async function onSubmit(data: FoodFormData) {
    try {
      if (isEdit && food) {
        await updateFood.mutateAsync({ id: food.id, ...data })
        toast.success('Alimento aggiornato')
      } else {
        await createFood.mutateAsync(data)
        toast.success('Alimento aggiunto')
      }
      reset()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante il salvataggio')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifica alimento' : 'Aggiungi alimento personalizzato'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input placeholder="Es: Riso integrale cotto" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Input placeholder="Es: Cereali, Verdure..." {...register('category')} />
          </div>
          <p className="text-xs text-muted-foreground font-medium">Valori per 100g:</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Energia (kcal) *</Label>
              <Input type="number" min="0" step="0.1" {...register('kcal_100g')} />
              {errors.kcal_100g && <p className="text-xs text-destructive">{errors.kcal_100g.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Proteine (g) *</Label>
              <Input type="number" min="0" step="0.1" {...register('protein_100g')} />
              {errors.protein_100g && <p className="text-xs text-destructive">{errors.protein_100g.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Carboidrati (g) *</Label>
              <Input type="number" min="0" step="0.1" {...register('carbs_100g')} />
              {errors.carbs_100g && <p className="text-xs text-destructive">{errors.carbs_100g.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Grassi (g) *</Label>
              <Input type="number" min="0" step="0.1" {...register('fat_100g')} />
              {errors.fat_100g && <p className="text-xs text-destructive">{errors.fat_100g.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Fibre (g)</Label>
              <Input type="number" min="0" step="0.1" {...register('fiber_100g')} />
            </div>
            <div className="space-y-2">
              <Label>Sodio (g)</Label>
              <Input type="number" min="0" step="0.01" {...register('sodium_100g')} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? 'Salvataggio...' : 'Creazione...'}</>
                : isEdit ? 'Salva modifiche' : 'Salva'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function FoodsPage() {
  const [dbSearch, setDbSearch] = useState('')
  const [offSearch, setOffSearch] = useState('')
  const [offResults, setOffResults] = useState<Food[]>([])
  const [offLoading, setOffLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editFood, setEditFood] = useState<Food | null>(null)

  const debouncedSearch = useDebounce(dbSearch, 300)
  const { data: foods, isLoading } = useFoods(debouncedSearch)
  const createFood = useCreateFood()

  async function searchOFF() {
    if (!offSearch.trim()) return
    setOffLoading(true)
    try {
      const results = await searchOpenFoodFacts(offSearch)
      setOffResults(results)
    } catch {
      toast.error('Errore durante la ricerca su Open Food Facts')
    } finally {
      setOffLoading(false)
    }
  }

  async function importFromOFF(food: Food) {
    try {
      await createFood.mutateAsync({
        name: food.name,
        category: food.category ?? undefined,
        kcal_100g: food.kcal_100g,
        protein_100g: food.protein_100g,
        carbs_100g: food.carbs_100g,
        fat_100g: food.fat_100g,
        fiber_100g: food.fiber_100g ?? undefined,
        sodium_100g: food.sodium_100g ?? undefined,
      })
      toast.success(`"${food.name}" importato nel database locale`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante l\'importazione')
    }
  }

  const sourceColor: Record<string, string> = {
    crea: 'bg-green-100 text-green-800',
    openfoodfacts: 'bg-blue-100 text-blue-800',
    custom: 'bg-purple-100 text-purple-800',
    usda: 'bg-orange-100 text-orange-800',
  }

  const sourceLabel: Record<string, string> = {
    crea: 'CREA',
    openfoodfacts: 'OFF',
    custom: 'Custom',
    usda: 'USDA',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Database alimenti</h1>
          <p className="text-muted-foreground">Alimenti locali + ricerca Open Food Facts</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Aggiungi alimento</Button>
      </div>

      <Tabs defaultValue="locale">
        <TabsList>
          <TabsTrigger value="locale">Database locale</TabsTrigger>
          <TabsTrigger value="off">Open Food Facts 🌍</TabsTrigger>
        </TabsList>

        {/* DB locale */}
        <TabsContent value="locale" className="space-y-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Cerca nel database locale..."
              value={dbSearch}
              onChange={e => setDbSearch(e.target.value)}
            />
          </div>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="space-y-1">
              {foods?.map(food => (
                <Card key={food.id}>
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{food.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${sourceColor[food.source] ?? ''}`}>
                          {sourceLabel[food.source] ?? food.source}
                        </span>
                      </div>
                      {food.category && <p className="text-xs text-muted-foreground">{food.category}</p>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right text-xs">
                        <p className="font-semibold">{food.kcal_100g} kcal</p>
                        <p className="text-muted-foreground">P:{food.protein_100g}g C:{food.carbs_100g}g G:{food.fat_100g}g</p>
                      </div>
                      {food.source === 'custom' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                          onClick={() => setEditFood(food)}
                          title="Modifica"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {!foods?.length && (
                <p className="text-center text-muted-foreground py-8">Nessun alimento trovato</p>
              )}
            </div>
          )}
        </TabsContent>

        {/* Open Food Facts */}
        <TabsContent value="off" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                Open Food Facts <ExternalLink className="h-3 w-3" />
              </CardTitle>
              <CardDescription>Cerca tra 4+ milioni di prodotti, gratuito e open source</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Es: pasta barilla, olio extravergine..."
                  value={offSearch}
                  onChange={e => setOffSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchOFF()}
                />
                <Button onClick={searchOFF} disabled={offLoading}>
                  {offLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-1">
            {offResults.map((food, i) => (
              <Card key={i}>
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{food.name}</p>
                    {food.category && <p className="text-xs text-muted-foreground">{food.category}</p>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right text-xs">
                      <p className="font-semibold">{Math.round(food.kcal_100g)} kcal</p>
                      <p className="text-muted-foreground">P:{food.protein_100g}g C:{food.carbs_100g}g G:{food.fat_100g}g</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => importFromOFF(food)}
                      disabled={createFood.isPending}
                      title="Importa nel database locale"
                    >
                      {createFood.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!offResults.length && (
              <p className="text-center text-sm text-muted-foreground py-6">
                Cerca un alimento per visualizzare i risultati
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create dialog */}
      <FoodFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      {/* Edit dialog — montato solo quando c'è un alimento selezionato */}
      {editFood && (
        <FoodFormDialog
          open={!!editFood}
          onClose={() => setEditFood(null)}
          food={editFood}
        />
      )}
    </div>
  )
}
