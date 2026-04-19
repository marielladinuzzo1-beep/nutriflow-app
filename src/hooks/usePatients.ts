import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Patient } from '@/types'
import type { PatientFormData } from '@/lib/validations'

export function usePatients() {
  return useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('last_name', { ascending: true })
      if (error) throw new Error(error.message ?? String(error))
      return data as Patient[]
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ['patients', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw new Error(error.message ?? String(error))
      return data as Patient
    },
    enabled: !!id,
  })
}

export function useCreatePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (formData: PatientFormData) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non autenticato')
      const { data, error } = await supabase
        .from('patients')
        .insert({ ...formData, nutritionist_id: user.id })
        .select()
        .single()
      if (error) throw new Error(error.message ?? String(error))
      return data as Patient
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  })
}

export function useUpdatePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...formData }: PatientFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('patients')
        .update(formData)
        .eq('id', id)
        .select()
        .single()
      if (error) throw new Error(error.message ?? String(error))
      return data as Patient
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] })
    },
  })
}

export function useDeletePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('patients').delete().eq('id', id)
      if (error) throw new Error(error.message ?? String(error))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  })
}

/**
 * Invia un magic link via Supabase Auth (email gratuita built-in).
 * Se il paziente non ha ancora un account, ne crea uno con role=patient
 * tramite il trigger handle_new_user.
 */
export function useInvitePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ patientId, email }: { patientId: string; email: string }) => {
      const appUrl = import.meta.env.VITE_APP_URL?.replace(/\/$/, '') || window.location.origin
      const redirectTo = `${appUrl}/portale/onboarding`

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectTo,
        },
      })
      if (error) throw new Error(error.message ?? String(error))

      // Salva il timestamp dell'invito
      const { error: updErr } = await supabase
        .from('patients')
        .update({ invite_sent_at: new Date().toISOString() })
        .eq('id', patientId)
      if (updErr) throw updErr
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  })
}

/** Registra l'apertura del link WhatsApp (opzionale, best-effort). */
export function useTrackWhatsApp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patientId: string) => {
      await supabase
        .from('patients')
        .update({ invite_whatsapp_at: new Date().toISOString() })
        .eq('id', patientId)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  })
}
