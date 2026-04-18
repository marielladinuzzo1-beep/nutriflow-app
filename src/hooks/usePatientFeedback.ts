import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PatientFeedback } from '@/types'

/** Il paziente legge il proprio feedback più recente */
export function useMyPatientFeedback() {
  return useQuery({
    queryKey: ['patient_feedback', 'my'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('patient_feedback')
        .select('*')
        .eq('profile_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data as PatientFeedback | null
    },
    staleTime: 5 * 60 * 1000,
  })
}

/** Il nutrizionista legge il feedback di un paziente tramite il suo profile_id */
export function usePatientFeedbackByProfile(profileId?: string) {
  return useQuery({
    queryKey: ['patient_feedback', 'profile', profileId],
    queryFn: async () => {
      if (!profileId) return null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('patient_feedback')
        .select('*')
        .eq('profile_id', profileId)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data as PatientFeedback | null
    },
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSubmitPatientFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      feedback: Omit<PatientFeedback, 'id' | 'submitted_at'>
    ) => {
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('patient_feedback' as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(feedback as any)
        .select()
        .single()
      if (error) throw new Error(error.message ?? String(error))
      const fb = data as unknown as PatientFeedback

      // v0.2.0: notifica il nutrizionista (fire-and-forget, trigger DB + edge function)
      if (fb.nutritionist_id) {
        const patientName = [feedback.first_name, feedback.last_name].filter(Boolean).join(' ').trim() || 'Un paziente'
        supabase.functions.invoke('notify-feedback', {
          body: {
            nutritionist_id: fb.nutritionist_id,
            patient_name: patientName,
            feedback_id: fb.id,
          },
        }).catch(() => { /* trigger DB è il canale principale */ })
      }

      return fb
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient_feedback'] })
    },
  })
}

export function useUpdateNutritionistNotes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ feedbackId, notes }: { feedbackId: string; notes: string }) => {
      const { error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('patient_feedback' as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ nutritionist_notes: notes || null } as any)
        .eq('id', feedbackId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient_feedback'] })
    },
  })
}
