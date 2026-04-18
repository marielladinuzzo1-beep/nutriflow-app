// ─── Auth & Profile ───────────────────────────────────────────────────────────

export interface Profile {
  id: string
  email: string
  full_name: string
  role: 'nutritionist' | 'patient'
  nutritionist_id?: string
  phone?: string
  avatar_url?: string
  gdpr_consent: boolean
  gdpr_consent_date?: string
  created_at: string
  updated_at: string
}

// ─── Patients ─────────────────────────────────────────────────────────────────

export interface Patient {
  id: string
  nutritionist_id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  date_of_birth?: string
  gender?: 'M' | 'F' | 'altro'
  notes?: string
  is_active: boolean
  gdpr_consent: boolean
  gdpr_consent_date?: string
  auth_user_id?: string
  invite_sent_at?: string
  invite_whatsapp_at?: string
  created_at: string
  updated_at: string
}

export type PatientFormData = Omit<Patient, 'id' | 'nutritionist_id' | 'created_at' | 'updated_at'>

// ─── Measurements ─────────────────────────────────────────────────────────────

export interface Measurement {
  id: string
  patient_id: string
  nutritionist_id: string
  measured_at: string
  weight_kg?: number
  height_cm?: number
  bmi?: number
  body_fat_pct?: number
  muscle_mass_kg?: number
  waist_cm?: number
  hip_cm?: number
  arm_cm?: number
  notes?: string
  created_at: string
}

export type MeasurementFormData = Omit<Measurement, 'id' | 'nutritionist_id' | 'created_at' | 'bmi'>

// ─── Foods ────────────────────────────────────────────────────────────────────

export interface Food {
  id: string
  name: string
  category?: string
  source: 'crea' | 'openfoodfacts' | 'custom' | 'usda'
  kcal_100g: number
  protein_100g: number
  carbs_100g: number
  fat_100g: number
  fiber_100g?: number
  sodium_100g?: number
  is_verified: boolean
  barcode?: string
  created_by?: string
  created_at: string
}

// ─── Meal Plans ───────────────────────────────────────────────────────────────

export type MealPlanStatus = 'draft' | 'active' | 'completed' | 'archived'
// meal_type è ora testo libero (es. "Pranzo", "Cena", "Pre-allenamento")
export type MealType = string

export interface MealPlan {
  id: string
  patient_id: string
  nutritionist_id: string
  name: string
  description?: string
  status: MealPlanStatus
  start_date?: string
  end_date?: string
  target_kcal?: number
  target_protein_g?: number
  target_carbs_g?: number
  target_fat_g?: number
  notes?: string
  // Testi narrativi del piano (dalla migrazione 003)
  considerations?: string
  practical_advice?: string
  daily_extras?: string
  created_at: string
  updated_at: string
  days?: MealPlanDay[]
}

export interface MealPlanDay {
  id: string
  meal_plan_id: string
  day_number: number
  day_label?: string
  is_free_day?: boolean
  daily_note?: string
  meal_group_order?: string[] | null
  items?: MealPlanItem[]
}

export interface MealPlanItem {
  id: string
  meal_plan_day_id: string
  meal_type: MealType
  food_id: string
  food?: Food
  quantity_g: number
  quantity_max_g?: number
  alternative_group?: number
  sort_order?: number
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  notes?: string
  recipe?: string
}

export interface MealTemplate {
  id: string
  nutritionist_id: string
  name: string
  meal_type: string
  created_at: string
  items?: MealTemplateItem[]
}

export interface MealTemplateItem {
  id: string
  template_id: string
  food_id?: string
  food_name: string
  quantity_g: number
  quantity_max_g?: number
  sort_order: number
  notes?: string
  created_at: string
  food?: Food
}

// ─── Messaging ────────────────────────────────────────────────────────────────

export interface Conversation {
  id: string
  nutritionist_id: string
  patient_id: string
  last_message_at?: string
  last_message_preview?: string
  created_at: string
  updated_at: string
  patient?: {
    id: string
    first_name: string
    last_name: string
    email?: string
  }
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  is_read: boolean
  created_at: string
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export interface Appointment {
  id: string
  nutritionist_id: string
  patient_id: string
  title: string
  date: string        // 'YYYY-MM-DD'
  start_time: string  // 'HH:MM'
  end_time?: string   // 'HH:MM'
  notes?: string
  created_at: string
  updated_at: string
  patient?: {
    id: string
    first_name: string
    last_name: string
  }
}

// ─── Todos ────────────────────────────────────────────────────────────────────

export type TodoType = 'task' | 'reminder' | 'followup' | 'measurement' | 'other'

export interface Todo {
  id: string
  nutritionist_id: string
  patient_id?: string
  title: string
  type: TodoType
  deadline?: string
  completed: boolean
  completed_at?: string
  notes?: string
  created_at: string
  updated_at: string
}

// ─── Patient Feedback ─────────────────────────────────────────────────────────

export interface PatientFeedback {
  id: string
  profile_id: string
  patient_id?: string
  nutritionist_id?: string
  first_name?: string
  last_name?: string
  referral_source?: string
  date_of_birth?: string
  fiscal_code?: string
  phone?: string
  email?: string
  gender?: string
  height_m?: number
  weight_kg?: number
  occupation?: string
  visit_reason?: string
  previous_diets?: string
  previous_diets_result?: string
  diet_type?: string
  sleep_quality?: string
  sleep_hours?: number
  physical_activity?: string
  current_conditions?: string[]
  other_conditions?: string
  diagnosed_conditions?: string[]
  takes_medications?: boolean
  medications_list?: string
  has_allergies?: string
  allergies_list?: string
  smoking?: boolean
  breakfast_habits?: string
  lunch_habits?: string
  dinner_habits?: string
  alcohol_consumption?: string
  fat_distribution?: string[]
  additional_notes?: string
  nutritionist_notes?: string
  submitted_at: string
}

// ─── Utility Types ────────────────────────────────────────────────────────────

export interface NutritionalTotals {
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
}

export interface DashboardStats {
  total_patients: number
  active_patients: number
  active_plans: number
  measurements_this_month: number
}
