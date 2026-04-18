import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Calcoli nutrizionali ─────────────────────────────────────────────────────

export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10
}

export function getBMICategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Sottopeso', color: 'text-blue-600' }
  if (bmi < 25) return { label: 'Normopeso', color: 'text-green-600' }
  if (bmi < 30) return { label: 'Sovrappeso', color: 'text-yellow-600' }
  if (bmi < 35) return { label: 'Obesità I', color: 'text-orange-600' }
  if (bmi < 40) return { label: 'Obesità II', color: 'text-red-600' }
  return { label: 'Obesità III', color: 'text-red-800' }
}

/** Mifflin–St Jeor */
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  gender: 'M' | 'F'
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears
  return Math.round(gender === 'M' ? base + 5 : base - 161)
}

export function calculateTDEE(bmr: number, activityLevel: number): number {
  return Math.round(bmr * activityLevel)
}

export function calculateAge(dateOfBirth: string): number {
  const today = new Date()
  const birth = new Date(dateOfBirth)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

// ─── Calcolo macro da grammi ──────────────────────────────────────────────────

/** calorie = p*4 + c*4 + f*9 */
export function calcKcalFromMacros(protein_g: number, carbs_g: number, fat_g: number): number {
  return Math.round(protein_g * 4 + carbs_g * 4 + fat_g * 9)
}

export function calcNutrients(
  kcalPer100g: number,
  proteinPer100g: number,
  carbsPer100g: number,
  fatPer100g: number,
  quantityG: number
) {
  const factor = quantityG / 100
  return {
    kcal: Math.round(kcalPer100g * factor),
    protein_g: Math.round(proteinPer100g * factor * 10) / 10,
    carbs_g: Math.round(carbsPer100g * factor * 10) / 10,
    fat_g: Math.round(fatPer100g * factor * 10) / 10,
  }
}

// ─── Suggerimento macro rule-based (no API esterna) ──────────────────────────

export function suggestMacros(tdee: number, goal: 'loss' | 'maintain' | 'gain') {
  const kcal =
    goal === 'loss' ? Math.round(tdee * 0.8) : goal === 'gain' ? Math.round(tdee * 1.1) : tdee
  const protein_g = Math.round((kcal * 0.3) / 4)
  const fat_g = Math.round((kcal * 0.25) / 9)
  const carbs_g = Math.round((kcal - protein_g * 4 - fat_g * 9) / 4)
  return { kcal, protein_g, carbs_g, fat_g }
}

// ─── Formatting ───────────────────────────────────────────────────────────────

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateFull(dateString: string): string {
  return new Date(dateString).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatWeight(value?: number | null): string {
  if (value == null) return '—'
  return `${value} kg`
}

export function formatNumber(value?: number | null, decimals = 1): string {
  if (value == null) return '—'
  return value.toFixed(decimals)
}
