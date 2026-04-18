import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface AppNotification {
  id: string
  nutritionist_id: string
  type: 'feedback_submitted' | 'new_message' | 'appointment' | 'other'
  title: string
  body?: string | null
  link?: string | null
  patient_id?: string | null
  related_id?: string | null
  is_read: boolean
  created_at: string
}

/** Lista notifiche (più recenti prime) */
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) return [] as AppNotification[]
      return (data ?? []) as AppNotification[]
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}
