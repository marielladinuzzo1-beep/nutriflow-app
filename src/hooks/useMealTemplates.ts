import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MealTemplate } from '@/types'

export function useMealTemplates() {
  return useQuery({
    queryKey: ['meal_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_templates')
        .select('*, items:meal_template_items(*, food:foods(*))')
        .order('name')
      if (error) throw new Error(error.message ?? String(error))
      return (data ?? []) as MealTemplate[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useSaveMealTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      name,
      mealType,
      items,
    }: {
      name: string
      mealType: string
      items: Array<{ food_id: string; food_name: string; quantity_g: number; quantity_max_g?: number; notes?: string; sort_order: number }>
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non autenticato')
      const { data: tpl, error: tplErr } = await supabase
        .from('meal_templates')
        .insert({ nutritionist_id: user.id, name, meal_type: mealType })
        .select()
        .single()
      if (tplErr) throw new Error(tplErr.message ?? String(tplErr))
      if (items.length > 0) {
        const { error: itemsErr } = await supabase
          .from('meal_template_items')
          .insert(items.map(i => ({ ...i, template_id: tpl.id })))
        if (itemsErr) throw new Error(itemsErr.message ?? String(itemsErr))
      }
      return tpl
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal_templates'] }),
  })
}

export function useDeleteMealTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase.from('meal_templates').delete().eq('id', templateId)
      if (error) throw new Error(error.message ?? String(error))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal_templates'] }),
  })
}

export function useUpdateMealTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name, mealType }: { id: string; name: string; mealType: string }) => {
      const { error } = await supabase
        .from('meal_templates')
        .update({ name, meal_type: mealType })
        .eq('id', id)
      if (error) throw new Error(error.message ?? String(error))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal_templates'] }),
  })
}

export function useAddMealTemplateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      templateId,
      foodId,
      foodName,
      quantityG,
      quantityMaxG,
      notes,
      sortOrder,
    }: {
      templateId: string
      foodId: string
      foodName: string
      quantityG: number
      quantityMaxG?: number
      notes?: string
      sortOrder: number
    }) => {
      const { error } = await supabase.from('meal_template_items').insert({
        template_id: templateId,
        food_id: foodId,
        food_name: foodName,
        quantity_g: quantityG,
        quantity_max_g: quantityMaxG ?? null,
        notes: notes ?? null,
        sort_order: sortOrder,
      })
      if (error) throw new Error(error.message ?? String(error))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal_templates'] }),
  })
}

export function useDeleteMealTemplateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from('meal_template_items').delete().eq('id', itemId)
      if (error) throw new Error(error.message ?? String(error))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal_templates'] }),
  })
}
