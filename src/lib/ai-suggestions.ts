import type { Patient, Measurement } from '@/types'
import { calculateBMR, calculateTDEE, calculateAge, calculateBMI, getBMICategory, suggestMacros } from './utils'

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type Goal = 'loss' | 'maintain' | 'gain'

const activityMultiplier: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

const activityLabel: Record<ActivityLevel, string> = {
  sedentary: 'Sedentario',
  light: 'Leggermente attivo',
  moderate: 'Moderatamente attivo',
  active: 'Molto attivo',
  very_active: 'Estremamente attivo',
}

export interface MacroSuggestion {
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  bmr: number
  tdee: number
  bmi: number | null
  bmiLabel: string | null
  goal: Goal
  activity: ActivityLevel
  notes: string[]
}

export function generateMacroSuggestion(
  patient: Patient,
  latestMeasurement: Measurement,
  goal: Goal,
  activity: ActivityLevel = 'light'
): MacroSuggestion {
  const notes: string[] = []

  const age = patient.date_of_birth ? calculateAge(patient.date_of_birth) : 35
  const gender = (patient.gender === 'M' || patient.gender === 'F') ? patient.gender : 'M'
  const weight = latestMeasurement.weight_kg ?? 70
  const height = latestMeasurement.height_cm ?? 170

  const bmr = calculateBMR(weight, height, age, gender)
  const multiplier = activityMultiplier[activity]
  const tdee = calculateTDEE(bmr, multiplier)
  const macros = suggestMacros(tdee, goal)

  const bmi = (latestMeasurement.weight_kg && latestMeasurement.height_cm)
    ? calculateBMI(latestMeasurement.weight_kg, latestMeasurement.height_cm)
    : null
  const bmiCat = bmi ? getBMICategory(bmi) : null

  // Generate rule-based notes
  if (!patient.date_of_birth) notes.push('Età stimata a 35 anni (data di nascita non disponibile)')
  if (!latestMeasurement.weight_kg) notes.push('Peso stimato a 70 kg (misurazione non disponibile)')
  if (!latestMeasurement.height_cm) notes.push('Altezza stimata a 170 cm (misurazione non disponibile)')

  if (bmi) {
    if (bmi < 18.5) notes.push(`BMI ${bmi} (sottopeso): valutare incremento calorico graduale`)
    else if (bmi >= 30) notes.push(`BMI ${bmi} (obesità): considerare approccio multidisciplinare`)
    else if (bmi >= 25) notes.push(`BMI ${bmi} (sovrappeso): deficit calorico moderato consigliato`)
  }

  if (goal === 'loss') {
    notes.push(`Deficit del 20% rispetto al TDEE (${tdee} kcal → ${macros.kcal} kcal)`)
    notes.push('Proteine elevate per preservare la massa muscolare durante il dimagrimento')
  } else if (goal === 'gain') {
    notes.push(`Surplus del 10% rispetto al TDEE (${tdee} kcal → ${macros.kcal} kcal)`)
    notes.push('Associare allenamento di resistenza per massimizzare la massa muscolare')
  } else {
    notes.push(`Apporto calorico uguale al TDEE (${tdee} kcal) per mantenimento del peso`)
  }

  notes.push(`Livello di attività: ${activityLabel[activity]}`)

  return {
    ...macros,
    bmr,
    tdee,
    bmi,
    bmiLabel: bmiCat?.label ?? null,
    goal,
    activity,
    notes,
  }
}

export const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; description: string }[] = [
  { value: 'sedentary', label: 'Sedentario', description: 'Lavoro da scrivania, poco o nessun esercizio' },
  { value: 'light', label: 'Leggermente attivo', description: 'Esercizio leggero 1-3 giorni/settimana' },
  { value: 'moderate', label: 'Moderatamente attivo', description: 'Esercizio moderato 3-5 giorni/settimana' },
  { value: 'active', label: 'Molto attivo', description: 'Esercizio intenso 6-7 giorni/settimana' },
  { value: 'very_active', label: 'Estremamente attivo', description: 'Lavoro fisico intenso + allenamento' },
]

export const GOAL_OPTIONS: { value: Goal; label: string; description: string }[] = [
  { value: 'loss', label: 'Dimagrimento', description: 'Riduzione del peso corporeo (-20% kcal)' },
  { value: 'maintain', label: 'Mantenimento', description: 'Mantenimento del peso attuale' },
  { value: 'gain', label: 'Aumento massa', description: 'Incremento massa muscolare (+10% kcal)' },
]
