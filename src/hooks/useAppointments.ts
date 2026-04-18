import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Appointment } from '@/types'

interface AppointmentInput {
  patient_id: string
  title: string
  date: string
  start_time: string
  end_time?: string
  notes?: string
}

export function useAppointments(patientId?: string) {
  return useQuery({
    queryKey: ['appointments', patientId],
    queryFn: async () => {
      let query = supabase
        .from('appointments')
        .select('*, patient:patients(id, first_name, last_name)')
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
      if (patientId) query = query.eq('patient_id', patientId)
      const { data, error } = await query
      if (error) throw new Error(error.message ?? String(error))
      return data as Appointment[]
    },
    staleTime: 60 * 1000,
  })
}

/** Appointments for a given week (Mon–Sun). Returns all for the week. */
export function useWeekAppointments(weekStart: string) {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekEndStr = weekEnd.toISOString().split('T')[0]

  return useQuery({
    queryKey: ['appointments', 'week', weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*, patient:patients(id, first_name, last_name)')
        .gte('date', weekStart)
        .lte('date', weekEndStr)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
      if (error) throw new Error(error.message ?? String(error))
      return data as Appointment[]
    },
    staleTime: 60 * 1000,
  })
}

/** Upcoming appointments (today + 7 days) for dashboard. */
export function useUpcomingAppointments() {
  const today = new Date().toISOString().split('T')[0]
  const in7 = new Date()
  in7.setDate(in7.getDate() + 7)
  const in7Str = in7.toISOString().split('T')[0]

  return useQuery({
    queryKey: ['appointments', 'upcoming'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*, patient:patients(id, first_name, last_name)')
        .gte('date', today)
        .lte('date', in7Str)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(5)
      if (error) throw new Error(error.message ?? String(error))
      return data as Appointment[]
    },
    staleTime: 60 * 1000,
  })
}

export function useCreateAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AppointmentInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non autenticato')
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          nutritionist_id: user.id,
          patient_id: input.patient_id,
          title: input.title,
          date: input.date,
          start_time: input.start_time,
          end_time: input.end_time || null,
          notes: input.notes || null,
        })
        .select('*, patient:patients(id, first_name, last_name)')
        .single()
      if (error) throw new Error(error.message ?? String(error))
      return data as Appointment
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}

export function useUpdateAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: AppointmentInput & { id: string }) => {
      const { data, error } = await supabase
        .from('appointments')
        .update({
          patient_id: input.patient_id,
          title: input.title,
          date: input.date,
          start_time: input.start_time,
          end_time: input.end_time || null,
          notes: input.notes || null,
        })
        .eq('id', id)
        .select('*, patient:patients(id, first_name, last_name)')
        .single()
      if (error) throw new Error(error.message ?? String(error))
      return data as Appointment
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}

export function useDeleteAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('appointments').delete().eq('id', id)
      if (error) throw new Error(error.message ?? String(error))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}
