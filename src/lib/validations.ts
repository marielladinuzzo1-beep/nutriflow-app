import { z } from 'zod'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(8, 'La password deve avere almeno 8 caratteri'),
})

export const registerSchema = loginSchema
  .extend({
    full_name: z.string().min(2, 'Inserisci il tuo nome completo'),
    confirmPassword: z.string(),
    gdpr_consent: z.literal(true, {
      errorMap: () => ({ message: 'Devi accettare il trattamento dei dati' }),
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Le password non coincidono',
    path: ['confirmPassword'],
  })

// ─── Patient ─────────────────────────────────────────────────────────────────

export const patientSchema = z.object({
  first_name: z.string().min(1, 'Il nome è obbligatorio'),
  last_name: z.string().min(1, 'Il cognome è obbligatorio'),
  email: z.string().email('Email non valida').optional().or(z.literal('')),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.enum(['M', 'F', 'altro']).optional(),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
  gdpr_consent: z.boolean().default(false),
  gdpr_consent_date: z.string().optional(),
})

// ─── Measurement ─────────────────────────────────────────────────────────────

export const measurementSchema = z.object({
  patient_id: z.string().uuid(),
  measured_at: z.string().min(1, 'La data è obbligatoria'),
  weight_kg: z.coerce.number().positive('Peso non valido').optional().or(z.literal('')),
  height_cm: z.coerce.number().positive('Altezza non valida').optional().or(z.literal('')),
  body_fat_pct: z.coerce
    .number()
    .min(0)
    .max(100, 'Percentuale non valida')
    .optional()
    .or(z.literal('')),
  muscle_mass_kg: z.coerce.number().positive().optional().or(z.literal('')),
  waist_cm: z.coerce.number().positive().optional().or(z.literal('')),
  hip_cm: z.coerce.number().positive().optional().or(z.literal('')),
  arm_cm: z.coerce.number().positive().optional().or(z.literal('')),
  notes: z.string().optional(),
})

// ─── Meal Plan ────────────────────────────────────────────────────────────────

export const mealPlanSchema = z.object({
  patient_id: z.string().uuid('Paziente obbligatorio'),
  name: z.string().min(1, 'Il nome del piano è obbligatorio'),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'completed', 'archived']).default('draft'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  target_kcal: z.coerce.number().positive().optional().or(z.literal('')),
  target_protein_g: z.coerce.number().positive().optional().or(z.literal('')),
  target_carbs_g: z.coerce.number().positive().optional().or(z.literal('')),
  target_fat_g: z.coerce.number().positive().optional().or(z.literal('')),
  notes: z.string().optional(),
  considerations: z.string().optional(),
  practical_advice: z.string().optional(),
  daily_extras: z.string().optional(),
})

export const mealPlanItemSchema = z.object({
  food_id: z.string().uuid('Seleziona un alimento'),
  meal_type: z.string().min(1, 'Specifica il pasto'),
  quantity_g: z.coerce.number().positive('Quantità non valida'),
  quantity_max_g: z.coerce.number().positive().optional().or(z.literal('')),
  notes: z.string().optional(),
})

// ─── Food ─────────────────────────────────────────────────────────────────────

export const foodSchema = z.object({
  name: z.string().min(1, 'Il nome è obbligatorio'),
  category: z.string().optional(),
  kcal_100g: z.coerce.number().min(0, 'Valore non valido'),
  protein_100g: z.coerce.number().min(0, 'Valore non valido'),
  carbs_100g: z.coerce.number().min(0, 'Valore non valido'),
  fat_100g: z.coerce.number().min(0, 'Valore non valido'),
  fiber_100g: z.coerce.number().min(0).optional().or(z.literal('')),
  sodium_100g: z.coerce.number().min(0).optional().or(z.literal('')),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type PatientFormData = z.infer<typeof patientSchema>
export type MeasurementFormData = z.infer<typeof measurementSchema>
export type MealPlanFormData = z.infer<typeof mealPlanSchema>
export type MealPlanItemFormData = z.infer<typeof mealPlanItemSchema>
export type FoodFormData = z.infer<typeof foodSchema>
