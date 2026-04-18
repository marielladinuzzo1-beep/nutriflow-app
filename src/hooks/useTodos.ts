import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Todo, TodoType } from '@/types'

export interface TodoInput {
  title: string
  type: TodoType
  patient_id?: string
  deadline?: string
  notes?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const todosTable = () => (supabase as any).from('todos')

export function useTodos(patientId?: string) {
  return useQuery({
    queryKey: ['todos', patientId ?? 'all'],
    queryFn: async () => {
      let q = todosTable()
        .select('*')
        .order('completed', { ascending: true })
        .order('deadline', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
      if (patientId) q = q.eq('patient_id', patientId)
      const { data, error } = await q
      if (error) throw new Error(error.message ?? String(error))
      return data as Todo[]
    },
    staleTime: 60 * 1000,
  })
}

export function useCreateTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: TodoInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non autenticato')
      const { data, error } = await todosTable()
        .insert({
          nutritionist_id: user.id,
          patient_id: input.patient_id ?? null,
          title: input.title,
          type: input.type,
          deadline: input.deadline ?? null,
          notes: input.notes ?? null,
        })
        .select()
        .single()
      if (error) throw new Error(error.message ?? String(error))
      return data as Todo
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['todos'] })
    },
  })
}

export function useToggleTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await todosTable()
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq('id', id)
      if (error) throw new Error(error.message ?? String(error))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  })
}

export function useDeleteTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await todosTable().delete().eq('id', id)
      if (error) throw new Error(error.message ?? String(error))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  })
}

export function useUpdateTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: TodoInput & { id: string }) => {
      const { error } = await todosTable()
        .update({
          title: input.title,
          type: input.type,
          deadline: input.deadline ?? null,
          notes: input.notes ?? null,
        })
        .eq('id', id)
      if (error) throw new Error(error.message ?? String(error))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  })
}
