import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Food } from '@/types'
import type { FoodFormData } from '@/lib/validations'

export function useFoods(search?: string) {
  return useQuery({
    queryKey: ['foods', search],
    queryFn: async () => {
      let query = supabase.from('foods').select('*').order('name')
      if (search && search.length > 1) {
        query = query.ilike('name', `%${search}%`)
      }
      const { data, error } = await query.limit(50)
      if (error) throw new Error(error.message ?? String(error))
      return data as Food[]
    },
    staleTime: 5 * 60 * 1000, // alimenti cambiano raramente — 5 min di cache
  })
}

/** Cerca su Open Food Facts (gratuito, no API key) */
export async function searchOpenFoodFacts(query: string): Promise<Food[]> {
  try {
    const url = `https://it.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&fields=product_name,nutriments,categories_tags`
    const res = await fetch(url)
    const json = await res.json()
    return (json.products ?? [])
      .filter((p: Record<string, unknown>) => p.product_name)
      .map((p: Record<string, unknown>) => {
        const n = (p.nutriments ?? {}) as Record<string, number>
        return {
          id: crypto.randomUUID(),
          name: p.product_name as string,
          source: 'openfoodfacts' as const,
          category: ((p.categories_tags as string[]) ?? [])[0]?.replace('en:', '') ?? undefined,
          kcal_100g: n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : 0),
          protein_100g: n.proteins_100g ?? 0,
          carbs_100g: n.carbohydrates_100g ?? 0,
          fat_100g: n.fat_100g ?? 0,
          fiber_100g: n.fiber_100g ?? undefined,
          sodium_100g: n.sodium_100g ?? undefined,
          is_verified: false,
          barcode: undefined,
          created_by: undefined,
          created_at: new Date().toISOString(),
        } satisfies Food
      })
  } catch {
    return []
  }
}

export function useUpdateFood() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...formData }: FoodFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('foods')
        .update({
          name: formData.name,
          category: formData.category || null,
          kcal_100g: formData.kcal_100g,
          protein_100g: formData.protein_100g,
          carbs_100g: formData.carbs_100g,
          fat_100g: formData.fat_100g,
          fiber_100g: formData.fiber_100g === '' ? null : (formData.fiber_100g ?? null),
          sodium_100g: formData.sodium_100g === '' ? null : (formData.sodium_100g ?? null),
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw new Error(error.message ?? String(error))
      return data as Food
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['foods'] }),
  })
}

export function useCreateFood() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (formData: FoodFormData) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('foods')
        .insert({
          name: formData.name,
          category: formData.category || null,
          source: 'custom',
          is_verified: false,
          created_by: user?.id ?? null,
          kcal_100g: formData.kcal_100g,
          protein_100g: formData.protein_100g,
          carbs_100g: formData.carbs_100g,
          fat_100g: formData.fat_100g,
          fiber_100g: formData.fiber_100g === '' ? null : (formData.fiber_100g ?? null),
          sodium_100g: formData.sodium_100g === '' ? null : (formData.sodium_100g ?? null),
        })
        .select()
        .single()
      if (error) throw new Error(error.message ?? String(error))
      return data as Food
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['foods'] }),
  })
}
