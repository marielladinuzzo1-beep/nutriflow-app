import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Measurement } from '@/types'
import type { MeasurementFormData } from '@/lib/validations'
import { calculateBMI } from '@/lib/utils'

export function useMeasurements(patientId: string) {
  return useQuery({
    queryKey: ['measurements', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('measurements')
        .select('*')
        .eq('patient_id', patientId)
        .order('measured_at', { ascending: false })
      if (error) throw new Error(error.message ?? String(error))
      return data as Measurement[]
    },
    enabled: !!patientId,
  })
}

export function useCreateMeasurement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (formData: MeasurementFormData) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non autenticato')

      const bmi =
        formData.weight_kg && formData.height_cm
          ? calculateBMI(Number(formData.weight_kg), Number(formData.height_cm))
          : null

      const payload = {
        ...formData,
        nutritionist_id: user.id,
        bmi,
        weight_kg: formData.weight_kg ? Number(formData.weight_kg) : null,
        height_cm: formData.height_cm ? Number(formData.height_cm) : null,
        body_fat_pct: formData.body_fat_pct ? Number(formData.body_fat_pct) : null,
        muscle_mass_kg: formData.muscle_mass_kg ? Number(formData.muscle_mass_kg) : null,
        waist_cm: formData.waist_cm ? Number(formData.waist_cm) : null,
        hip_cm: formData.hip_cm ? Number(formData.hip_cm) : null,
        arm_cm: formData.arm_cm ? Number(formData.arm_cm) : null,
      }

      const { data, error } = await supabase
        .from('measurements')
        .insert(payload)
        .select()
        .single()
      if (error) throw new Error(error.message ?? String(error))
      return data as Measurement
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['measurements', data.patient_id] }),
  })
}

export function useUpdateMeasurement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...formData }: MeasurementFormData & { id: string }) => {
      const bmi =
        formData.weight_kg && formData.height_cm
          ? calculateBMI(Number(formData.weight_kg), Number(formData.height_cm))
          : null

      const payload = {
        patient_id: formData.patient_id,
        measured_at: formData.measured_at,
        bmi,
        weight_kg: formData.weight_kg ? Number(formData.weight_kg) : null,
        height_cm: formData.height_cm ? Number(formData.height_cm) : null,
        body_fat_pct: formData.body_fat_pct ? Number(formData.body_fat_pct) : null,
        muscle_mass_kg: formData.muscle_mass_kg ? Number(formData.muscle_mass_kg) : null,
        waist_cm: formData.waist_cm ? Number(formData.waist_cm) : null,
        hip_cm: formData.hip_cm ? Number(formData.hip_cm) : null,
        arm_cm: formData.arm_cm ? Number(formData.arm_cm) : null,
        notes: formData.notes ?? null,
      }

      const { data, error } = await supabase
        .from('measurements')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw new Error(error.message ?? String(error))
      return data as Measurement
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['measurements', data.patient_id] }),
  })
}

export function useDeleteMeasurement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patientId }: { id: string; patientId: string }) => {
      const { error } = await supabase.from('measurements').delete().eq('id', id)
      if (error) throw new Error(error.message ?? String(error))
      return patientId
    },
    onSuccess: (patientId) => qc.invalidateQueries({ queryKey: ['measurements', patientId] }),
  })
}
