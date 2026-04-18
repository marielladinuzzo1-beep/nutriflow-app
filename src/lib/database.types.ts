// Tipi database Supabase - compatibili con @supabase/supabase-js v2.103+
// Per tipi generati automaticamente: npx supabase gen types typescript --project-id YOUR_PROJECT_ID

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    PostgrestVersion: '12'
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: string
          nutritionist_id: string | null
          phone: string | null
          avatar_url: string | null
          gdpr_consent: boolean
          gdpr_consent_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: string
          nutritionist_id?: string | null
          phone?: string | null
          avatar_url?: string | null
          gdpr_consent?: boolean
          gdpr_consent_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: string
          nutritionist_id?: string | null
          phone?: string | null
          avatar_url?: string | null
          gdpr_consent?: boolean
          gdpr_consent_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          id: string
          nutritionist_id: string
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          date_of_birth: string | null
          gender: string | null
          notes: string | null
          is_active: boolean
          gdpr_consent: boolean
          gdpr_consent_date: string | null
          auth_user_id: string | null
          invite_sent_at: string | null
          invite_whatsapp_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nutritionist_id: string
          first_name: string
          last_name: string
          email?: string | null
          phone?: string | null
          date_of_birth?: string | null
          gender?: string | null
          notes?: string | null
          is_active?: boolean
          gdpr_consent?: boolean
          gdpr_consent_date?: string | null
          auth_user_id?: string | null
          invite_sent_at?: string | null
          invite_whatsapp_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nutritionist_id?: string
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string | null
          date_of_birth?: string | null
          gender?: string | null
          notes?: string | null
          is_active?: boolean
          gdpr_consent?: boolean
          gdpr_consent_date?: string | null
          auth_user_id?: string | null
          invite_sent_at?: string | null
          invite_whatsapp_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'patients_nutritionist_id_fkey'
            columns: ['nutritionist_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      measurements: {
        Row: {
          id: string
          patient_id: string
          nutritionist_id: string
          measured_at: string
          weight_kg: number | null
          height_cm: number | null
          bmi: number | null
          body_fat_pct: number | null
          muscle_mass_kg: number | null
          waist_cm: number | null
          hip_cm: number | null
          arm_cm: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          nutritionist_id: string
          measured_at: string
          weight_kg?: number | null
          height_cm?: number | null
          bmi?: number | null
          body_fat_pct?: number | null
          muscle_mass_kg?: number | null
          waist_cm?: number | null
          hip_cm?: number | null
          arm_cm?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          nutritionist_id?: string
          measured_at?: string
          weight_kg?: number | null
          height_cm?: number | null
          bmi?: number | null
          body_fat_pct?: number | null
          muscle_mass_kg?: number | null
          waist_cm?: number | null
          hip_cm?: number | null
          arm_cm?: number | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'measurements_patient_id_fkey'
            columns: ['patient_id']
            isOneToOne: false
            referencedRelation: 'patients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'measurements_nutritionist_id_fkey'
            columns: ['nutritionist_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      foods: {
        Row: {
          id: string
          name: string
          category: string | null
          source: string
          kcal_100g: number
          protein_100g: number
          carbs_100g: number
          fat_100g: number
          fiber_100g: number | null
          sodium_100g: number | null
          is_verified: boolean
          barcode: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          category?: string | null
          source?: string
          kcal_100g: number
          protein_100g: number
          carbs_100g: number
          fat_100g: number
          fiber_100g?: number | null
          sodium_100g?: number | null
          is_verified?: boolean
          barcode?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string | null
          source?: string
          kcal_100g?: number
          protein_100g?: number
          carbs_100g?: number
          fat_100g?: number
          fiber_100g?: number | null
          sodium_100g?: number | null
          is_verified?: boolean
          barcode?: string | null
          created_by?: string | null
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          id: string
          patient_id: string
          nutritionist_id: string
          name: string
          description: string | null
          status: string
          start_date: string | null
          end_date: string | null
          target_kcal: number | null
          target_protein_g: number | null
          target_carbs_g: number | null
          target_fat_g: number | null
          notes: string | null
          considerations: string | null
          practical_advice: string | null
          daily_extras: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          nutritionist_id: string
          name: string
          description?: string | null
          status?: string
          start_date?: string | null
          end_date?: string | null
          target_kcal?: number | null
          target_protein_g?: number | null
          target_carbs_g?: number | null
          target_fat_g?: number | null
          notes?: string | null
          considerations?: string | null
          practical_advice?: string | null
          daily_extras?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          nutritionist_id?: string
          name?: string
          description?: string | null
          status?: string
          start_date?: string | null
          end_date?: string | null
          target_kcal?: number | null
          target_protein_g?: number | null
          target_carbs_g?: number | null
          target_fat_g?: number | null
          notes?: string | null
          considerations?: string | null
          practical_advice?: string | null
          daily_extras?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'meal_plans_patient_id_fkey'
            columns: ['patient_id']
            isOneToOne: false
            referencedRelation: 'patients'
            referencedColumns: ['id']
          }
        ]
      }
      meal_plan_days: {
        Row: {
          id: string
          meal_plan_id: string
          day_number: number
          day_label: string | null
          is_free_day: boolean
          daily_note: string | null
        }
        Insert: {
          id?: string
          meal_plan_id: string
          day_number: number
          day_label?: string | null
          is_free_day?: boolean
          daily_note?: string | null
        }
        Update: {
          id?: string
          meal_plan_id?: string
          day_number?: number
          day_label?: string | null
          is_free_day?: boolean
          daily_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'meal_plan_days_meal_plan_id_fkey'
            columns: ['meal_plan_id']
            isOneToOne: false
            referencedRelation: 'meal_plans'
            referencedColumns: ['id']
          }
        ]
      }
      meal_plan_items: {
        Row: {
          id: string
          meal_plan_day_id: string
          meal_type: string
          food_id: string
          quantity_g: number
          quantity_max_g: number | null
          alternative_group: number | null
          sort_order: number
          kcal: number
          protein_g: number
          carbs_g: number
          fat_g: number
          notes: string | null
          recipe: string | null
        }
        Insert: {
          id?: string
          meal_plan_day_id: string
          meal_type: string
          food_id: string
          quantity_g: number
          quantity_max_g?: number | null
          alternative_group?: number | null
          sort_order?: number
          kcal: number
          protein_g: number
          carbs_g: number
          fat_g: number
          notes?: string | null
          recipe?: string | null
        }
        Update: {
          id?: string
          meal_plan_day_id?: string
          meal_type?: string
          food_id?: string
          quantity_g?: number
          quantity_max_g?: number | null
          alternative_group?: number | null
          sort_order?: number
          kcal?: number
          protein_g?: number
          carbs_g?: number
          fat_g?: number
          notes?: string | null
          recipe?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'meal_plan_items_meal_plan_day_id_fkey'
            columns: ['meal_plan_day_id']
            isOneToOne: false
            referencedRelation: 'meal_plan_days'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'meal_plan_items_food_id_fkey'
            columns: ['food_id']
            isOneToOne: false
            referencedRelation: 'foods'
            referencedColumns: ['id']
          }
        ]
      }
      conversations: {
        Row: {
          id: string
          nutritionist_id: string
          patient_id: string
          last_message_at: string | null
          last_message_preview: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nutritionist_id: string
          patient_id: string
          last_message_at?: string | null
          last_message_preview?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nutritionist_id?: string
          patient_id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'conversations_nutritionist_id_fkey'
            columns: ['nutritionist_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'conversations_patient_id_fkey'
            columns: ['patient_id']
            isOneToOne: false
            referencedRelation: 'patients'
            referencedColumns: ['id']
          }
        ]
      }
      appointments: {
        Row: {
          id: string
          nutritionist_id: string
          patient_id: string
          title: string
          date: string
          start_time: string
          end_time: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nutritionist_id: string
          patient_id: string
          title: string
          date: string
          start_time: string
          end_time?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nutritionist_id?: string
          patient_id?: string
          title?: string
          date?: string
          start_time?: string
          end_time?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'appointments_nutritionist_id_fkey'
            columns: ['nutritionist_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'appointments_patient_id_fkey'
            columns: ['patient_id']
            isOneToOne: false
            referencedRelation: 'patients'
            referencedColumns: ['id']
          }
        ]
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string
          is_read?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_sender_id_fkey'
            columns: ['sender_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      meal_templates: {
        Row: {
          id: string
          nutritionist_id: string
          name: string
          meal_type: string
          created_at: string
        }
        Insert: {
          id?: string
          nutritionist_id: string
          name: string
          meal_type?: string
          created_at?: string
        }
        Update: {
          id?: string
          nutritionist_id?: string
          name?: string
          meal_type?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'meal_templates_nutritionist_id_fkey'
            columns: ['nutritionist_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      meal_template_items: {
        Row: {
          id: string
          template_id: string
          food_id: string | null
          food_name: string
          quantity_g: number
          quantity_max_g: number | null
          sort_order: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          template_id: string
          food_id?: string | null
          food_name: string
          quantity_g: number
          quantity_max_g?: number | null
          sort_order?: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          food_id?: string | null
          food_name?: string
          quantity_g?: number
          quantity_max_g?: number | null
          sort_order?: number
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'meal_template_items_template_id_fkey'
            columns: ['template_id']
            isOneToOne: false
            referencedRelation: 'meal_templates'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
