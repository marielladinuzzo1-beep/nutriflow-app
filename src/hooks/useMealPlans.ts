import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MealPlan, MealPlanDay, MealPlanItem, Food } from '@/types'

// ─── Feature 2: distinct meal types already used by this nutritionist ─────────
export function useDistinctMealTypes() {
  return useQuery({
    queryKey: ['distinct_meal_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_plan_items')
        .select('meal_type')
        .order('meal_type')
      if (error) return [] as string[]
      const types = [...new Set((data ?? []).map(r => r.meal_type).filter(Boolean))]
      return types as string[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

// ─── Feature 3: update recipe field of a meal plan item ──────────────────────
export function useUpdateMealPlanItemRecipe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ itemId, planId, recipe }: { itemId: string; planId: string; recipe: string }) => {
      const { error } = await supabase
        .from('meal_plan_items')
        .update({ recipe: recipe || null })
        .eq('id', itemId)
      if (error) throw new Error(error.message ?? String(error))
      return { itemId, planId, recipe }
    },
    onSuccess: ({ itemId, planId, recipe }) => {
      qc.setQueryData(['meal_plans', 'detail', planId], (old: MealPlan | undefined) => {
        if (!old) return old
        return {
          ...old,
          days: old.days?.map(day => ({
            ...day,
            items: day.items?.map(item => item.id === itemId ? { ...item, recipe } : item),
          })),
        }
      })
    },
  })
}
import type { MealPlanFormData } from '@/lib/validations'
import { calcNutrients, calcKcalFromMacros } from '@/lib/utils'
import { generateMealPlan } from '@/lib/meal-plan-generator'

export function useMealPlans(patientId?: string) {
  return useQuery({
    queryKey: ['meal_plans', patientId],
    queryFn: async () => {
      let query = supabase
        .from('meal_plans')
        .select('*, days:meal_plan_days(id)')
        .order('created_at', { ascending: false })
      if (patientId) query = query.eq('patient_id', patientId)
      const { data, error } = await query
      if (error) throw new Error(error.message ?? String(error))
      return data as MealPlan[]
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useMealPlan(id: string) {
  return useQuery({
    queryKey: ['meal_plans', 'detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*, days:meal_plan_days(*, items:meal_plan_items(*, food:foods(*)))')
        .eq('id', id)
        .single()
      if (error) throw new Error(error.message ?? String(error))
      // Sort items within each day by sort_order
      if (data?.days) {
        for (const day of data.days) {
          if (day.items) {
            day.items.sort((a, b) => ((a as MealPlanItem).sort_order ?? 0) - ((b as MealPlanItem).sort_order ?? 0))
          }
        }
      }
      return data as MealPlan
    },
    enabled: !!id,
  })
}

export function useCreateMealPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (formData: MealPlanFormData) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non autenticato')
      const { data, error } = await supabase
        .from('meal_plans')
        .insert({
          nutritionist_id: user.id,
          patient_id: formData.patient_id,
          name: formData.name,
          description: formData.description || null,
          status: formData.status ?? 'draft',
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          notes: formData.notes || null,
          considerations: formData.considerations || null,
          practical_advice: formData.practical_advice || null,
          daily_extras: formData.daily_extras || null,
          target_kcal: formData.target_kcal === '' ? null : (formData.target_kcal ?? null),
          target_protein_g: formData.target_protein_g === '' ? null : (formData.target_protein_g ?? null),
          target_carbs_g: formData.target_carbs_g === '' ? null : (formData.target_carbs_g ?? null),
          target_fat_g: formData.target_fat_g === '' ? null : (formData.target_fat_g ?? null),
        })
        .select()
        .single()
      if (error) throw new Error(error.message ?? String(error))
      return data as MealPlan
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meal_plans'] })
    },
  })
}

export function useUpdateMealPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...formData }: MealPlanFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('meal_plans')
        .update({
          name: formData.name,
          description: formData.description || null,
          status: formData.status ?? 'draft',
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          notes: formData.notes || null,
          considerations: formData.considerations || null,
          practical_advice: formData.practical_advice || null,
          daily_extras: formData.daily_extras || null,
          target_kcal: formData.target_kcal === '' ? null : (formData.target_kcal ?? null),
          target_protein_g: formData.target_protein_g === '' ? null : (formData.target_protein_g ?? null),
          target_carbs_g: formData.target_carbs_g === '' ? null : (formData.target_carbs_g ?? null),
          target_fat_g: formData.target_fat_g === '' ? null : (formData.target_fat_g ?? null),
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw new Error(error.message ?? String(error))
      return data as MealPlan
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['meal_plans'] })
      qc.invalidateQueries({ queryKey: ['meal_plans', 'detail', data.id] })
    },
  })
}

export function useDeleteMealPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase.from('meal_plans').delete().eq('id', planId)
      if (error) throw new Error(error.message ?? String(error))
      return planId
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meal_plans'] })
    },
  })
}

// ─── Meal plan days ───────────────────────────────────────────────────────────

export function useAddMealPlanDay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      planId,
      dayNumber,
      dayLabel,
      isFreeDay,
      dailyNote,
    }: {
      planId: string
      dayNumber: number
      dayLabel?: string
      isFreeDay?: boolean
      dailyNote?: string
    }) => {
      const { data, error } = await supabase
        .from('meal_plan_days')
        .insert({
          meal_plan_id: planId,
          day_number: dayNumber,
          day_label: dayLabel ?? null,
          is_free_day: isFreeDay ?? false,
          daily_note: dailyNote ?? null,
        })
        .select()
        .single()
      if (error) throw new Error(error.message ?? String(error))
      return data as MealPlanDay
    },
    onSuccess: (_, { planId }) => {
      qc.invalidateQueries({ queryKey: ['meal_plans', 'detail', planId] })
    },
  })
}

export function useUpdateMealPlanDay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      dayId,
      planId,
      dayLabel,
      isFreeDay,
      dailyNote,
      mealGroupOrder,
    }: {
      dayId: string
      planId: string
      dayLabel?: string
      isFreeDay?: boolean
      dailyNote?: string
      mealGroupOrder?: string[] | null
    }) => {
      const { error } = await supabase
        .from('meal_plan_days')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({
          ...(dayLabel !== undefined && { day_label: dayLabel }),
          ...(isFreeDay !== undefined && { is_free_day: isFreeDay }),
          ...(dailyNote !== undefined && { daily_note: dailyNote || null }),
          ...(mealGroupOrder !== undefined && { meal_group_order: mealGroupOrder }),
        } as any)
        .eq('id', dayId)
      if (error) throw new Error(error.message ?? String(error))
      return { dayId, planId }
    },
    onSuccess: ({ planId }) => {
      qc.invalidateQueries({ queryKey: ['meal_plans', 'detail', planId] })
    },
  })
}

export function useDeleteMealPlanDay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ dayId, planId }: { dayId: string; planId: string }) => {
      const { error } = await supabase.from('meal_plan_days').delete().eq('id', dayId)
      if (error) throw new Error(error.message ?? String(error))
      return planId
    },
    onSuccess: (planId) => {
      qc.invalidateQueries({ queryKey: ['meal_plans', 'detail', planId] })
    },
  })
}

// ─── Meal plan items ──────────────────────────────────────────────────────────

export function useAddMealPlanItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      dayId,
      planId,
      foodId,
      mealType,
      quantityG,
      quantityMaxG,
      alternativeGroup,
      sortOrder,
      food,
      notes,
    }: {
      dayId: string
      planId: string
      foodId: string
      mealType: string
      quantityG: number
      quantityMaxG?: number
      alternativeGroup?: number
      sortOrder?: number
      food: { kcal_100g: number; protein_100g: number; carbs_100g: number; fat_100g: number }
      notes?: string
    }) => {
      const macros = calcNutrients(
        food.kcal_100g ?? 0, food.protein_100g ?? 0,
        food.carbs_100g ?? 0, food.fat_100g ?? 0, quantityG,
      )
      const safeKcal = (v: number) => (isNaN(v) || !isFinite(v) ? 0 : Math.max(0, v))
      const p = safeKcal(macros.protein_g)
      const c = safeKcal(macros.carbs_g)
      const f = safeKcal(macros.fat_g)
      const kcal = safeKcal(calcKcalFromMacros(p, c, f))
      const { data, error } = await supabase
        .from('meal_plan_items')
        .insert({
          meal_plan_day_id: dayId,
          food_id: foodId,
          meal_type: mealType,
          quantity_g: quantityG,
          quantity_max_g: quantityMaxG ?? null,
          alternative_group: alternativeGroup ?? null,
          sort_order: sortOrder ?? 0,
          kcal,
          protein_g: p,
          carbs_g: c,
          fat_g: f,
          notes: notes ?? null,
        })
        .select('*, food:foods(*)')
        .single()
      if (error) throw new Error(error.message ?? String(error))
      return { data: data as MealPlanItem, planId }
    },
    onSuccess: ({ planId }) => {
      qc.invalidateQueries({ queryKey: ['meal_plans', 'detail', planId] })
    },
  })
}

export function useDeleteMealPlanItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ itemId, planId }: { itemId: string; planId: string }) => {
      const { error } = await supabase.from('meal_plan_items').delete().eq('id', itemId)
      if (error) throw new Error(error.message ?? String(error))
      return planId
    },
    onSuccess: (planId) => {
      qc.invalidateQueries({ queryKey: ['meal_plans', 'detail', planId] })
    },
  })
}

// ─── Update item quantity (inline editing) ────────────────────────────────────

export function useUpdateMealPlanItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      itemId,
      planId,
      quantityG,
      quantityMaxG,
      food,
    }: {
      itemId: string
      planId: string
      quantityG: number
      quantityMaxG?: number | null
      food: { kcal_100g: number; protein_100g: number; carbs_100g: number; fat_100g: number }
    }) => {
      const macros = calcNutrients(
        food.kcal_100g ?? 0,
        food.protein_100g ?? 0,
        food.carbs_100g ?? 0,
        food.fat_100g ?? 0,
        quantityG,
      )
      const kcal = calcKcalFromMacros(macros.protein_g, macros.carbs_g, macros.fat_g)
      const { error } = await supabase
        .from('meal_plan_items')
        .update({
          quantity_g: quantityG,
          ...(quantityMaxG !== undefined && { quantity_max_g: quantityMaxG }),
          kcal: isNaN(kcal) ? 0 : kcal,
          protein_g: isNaN(macros.protein_g) ? 0 : macros.protein_g,
          carbs_g: isNaN(macros.carbs_g) ? 0 : macros.carbs_g,
          fat_g: isNaN(macros.fat_g) ? 0 : macros.fat_g,
        })
        .eq('id', itemId)
      if (error) throw new Error(error.message ?? String(error))
      return { itemId, planId, quantityG, quantityMaxG, macros, kcal }
    },
    onSuccess: ({ itemId, planId, quantityG, quantityMaxG, macros, kcal }) => {
      qc.setQueryData(['meal_plans', 'detail', planId], (old: MealPlan | undefined) => {
        if (!old) return old
        return {
          ...old,
          days: old.days?.map((day) => ({
            ...day,
            items: day.items?.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    quantity_g: quantityG,
                    ...(quantityMaxG !== undefined && { quantity_max_g: quantityMaxG }),
                    kcal: isNaN(kcal) ? 0 : kcal,
                    protein_g: isNaN(macros.protein_g) ? 0 : macros.protein_g,
                    carbs_g: isNaN(macros.carbs_g) ? 0 : macros.carbs_g,
                    fat_g: isNaN(macros.fat_g) ? 0 : macros.fat_g,
                  }
                : item,
            ),
          })),
        }
      })
    },
  })
}

// ─── Bulk-generate 7 days + items from rule-based template ───────────────────

export function useGenerateMealPlanContent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ planId, targetKcal }: { planId: string; targetKcal: number }) => {
      let { data: foods, error: foodsError } = await supabase
        .from('foods')
        .select('*')
        .eq('is_verified', true)
      if (foodsError) throw new Error(foodsError.message ?? String(foodsError))

      if (!foods || foods.length === 0) {
        const fallback = await supabase.from('foods').select('*')
        if (fallback.error) throw fallback.error
        foods = fallback.data
      }
      if (!foods || foods.length === 0) throw new Error('Nessun alimento trovato nel database')

      const generatedDays = generateMealPlan(targetKcal, foods as Food[])

      const totalItems = generatedDays.reduce(
        (sum, d) => sum + d.meals.reduce((s, m) => s + m.items.length, 0),
        0,
      )
      if (totalItems === 0) throw new Error('Impossibile generare il piano: alimenti non trovati nel DB')

      const { data: daysData, error: daysError } = await supabase
        .from('meal_plan_days')
        .insert(
          generatedDays.map((d) => ({
            meal_plan_id: planId,
            day_number: d.day_number,
            day_label: d.day_label,
            is_free_day: false,
          })),
        )
        .select()
      if (daysError) throw new Error(daysError.message ?? String(daysError))
      if (!daysData || daysData.length === 0) throw new Error('Errore durante l\'inserimento dei giorni')

      const dayIdByNumber = new Map<number, string>()
      for (const row of daysData) {
        dayIdByNumber.set(row.day_number, row.id)
      }

      const allItems: {
        meal_plan_day_id: string
        food_id: string
        meal_type: string
        quantity_g: number
        kcal: number
        protein_g: number
        carbs_g: number
        fat_g: number
        sort_order: number
      }[] = []

      for (const genDay of generatedDays) {
        const dayId = dayIdByNumber.get(genDay.day_number)
        if (!dayId) continue
        let sortOrder = 0
        for (const meal of genDay.meals) {
          for (const item of meal.items) {
            allItems.push({
              meal_plan_day_id: dayId,
              food_id: item.food_id,
              meal_type: meal.meal_type,
              quantity_g: item.quantity_g,
              kcal: item.kcal,
              protein_g: item.protein_g,
              carbs_g: item.carbs_g,
              fat_g: item.fat_g,
              sort_order: sortOrder++,
            })
          }
        }
      }

      if (allItems.length > 0) {
        const { error: itemsError } = await supabase.from('meal_plan_items').insert(allItems)
        if (itemsError) throw new Error(itemsError.message ?? String(itemsError))
      }

      return planId
    },
    onSuccess: (planId) => {
      qc.invalidateQueries({ queryKey: ['meal_plans', 'detail', planId] })
    },
  })
}
