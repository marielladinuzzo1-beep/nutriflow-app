import { describe, it, expect } from 'vitest'
import { calcKcalFromMacros, calcNutrients } from './utils'

// Formula: calorie = p*4 + c*4 + f*9

describe('calcKcalFromMacros', () => {
  it('calcola correttamente con valori interi', () => {
    // 100g proteine = 400 kcal, 100g carbo = 400 kcal, 50g grassi = 450 kcal → 1250
    expect(calcKcalFromMacros(100, 100, 50)).toBe(1250)
  })

  it('formula p*4 + c*4 + f*9', () => {
    expect(calcKcalFromMacros(30, 200, 60)).toBe(30 * 4 + 200 * 4 + 60 * 9)
  })

  it('tutti zero → 0 kcal', () => {
    expect(calcKcalFromMacros(0, 0, 0)).toBe(0)
  })

  it('solo proteine', () => {
    expect(calcKcalFromMacros(50, 0, 0)).toBe(200)
  })

  it('solo grassi', () => {
    expect(calcKcalFromMacros(0, 0, 20)).toBe(180)
  })

  it('arrotonda al numero intero', () => {
    // 1.1 * 4 + 2.2 * 4 + 3.3 * 9 = 4.4 + 8.8 + 29.7 = 42.9 → arrotonda a 43
    expect(calcKcalFromMacros(1.1, 2.2, 3.3)).toBe(43)
  })
})

describe('formula % → grammi → kcal (round-trip)', () => {
  it('30% prot, 50% carbo, 20% grassi su 2000 kcal', () => {
    const kcalTarget = 2000
    const p_pct = 30
    const c_pct = 50
    const f_pct = 20

    const p_g = Math.round((kcalTarget * p_pct / 100) / 4 * 10) / 10
    const c_g = Math.round((kcalTarget * c_pct / 100) / 4 * 10) / 10
    const f_g = Math.round((kcalTarget * f_pct / 100) / 9 * 10) / 10

    // proteine: 150g, carbo: 250g, grassi: 44.4g
    expect(p_g).toBe(150)
    expect(c_g).toBe(250)
    expect(f_g).toBe(44.4)

    const kcalResult = calcKcalFromMacros(p_g, c_g, f_g)
    // 150*4 + 250*4 + 44.4*9 = 600 + 1000 + 399.6 = 1999.6 → 2000 (arrotondato)
    expect(kcalResult).toBeCloseTo(2000, -1)
  })

  it('25% prot, 45% carbo, 30% grassi su 1800 kcal', () => {
    const kcalTarget = 1800
    const p_g = Math.round((kcalTarget * 25 / 100) / 4 * 10) / 10
    const c_g = Math.round((kcalTarget * 45 / 100) / 4 * 10) / 10
    const f_g = Math.round((kcalTarget * 30 / 100) / 9 * 10) / 10

    const kcalResult = calcKcalFromMacros(p_g, c_g, f_g)
    expect(kcalResult).toBeCloseTo(1800, -1)
  })
})

describe('formula grammi → kcal', () => {
  it('modifica grammi aggiorna kcal', () => {
    const before = calcKcalFromMacros(100, 200, 50)
    const after = calcKcalFromMacros(120, 200, 50)
    // +20g proteine = +80 kcal
    expect(after - before).toBe(80)
  })

  it('aumentare i grassi aumenta più le calorie per grammo', () => {
    const kcalProt = calcKcalFromMacros(10, 0, 0)  // 40 kcal
    const kcalFat  = calcKcalFromMacros(0, 0, 10)  // 90 kcal
    expect(kcalFat).toBeGreaterThan(kcalProt)
    expect(kcalFat).toBe(90)
    expect(kcalProt).toBe(40)
  })
})

describe('coerenza totali giorno', () => {
  it('somma macro degli item = kcal giorno calcolato dalla formula', () => {
    const items = [
      { protein_g: 30, carbs_g: 50, fat_g: 10 },
      { protein_g: 20, carbs_g: 80, fat_g: 15 },
      { protein_g: 10, carbs_g: 30, fat_g: 5 },
    ]
    const totalP = items.reduce((s, i) => s + i.protein_g, 0)
    const totalC = items.reduce((s, i) => s + i.carbs_g, 0)
    const totalF = items.reduce((s, i) => s + i.fat_g, 0)

    const totalKcal = calcKcalFromMacros(totalP, totalC, totalF)
    // 60*4 + 160*4 + 30*9 = 240 + 640 + 270 = 1150
    expect(totalKcal).toBe(1150)
  })
})

describe('calcNutrients + calcKcalFromMacros — coerenza per porzione', () => {
  it('kcal porzione = p*4+c*4+f*9', () => {
    const food = { kcal_100g: 350, protein_100g: 12, carbs_100g: 60, fat_100g: 5 }
    const macros = calcNutrients(food.kcal_100g, food.protein_100g, food.carbs_100g, food.fat_100g, 150)
    const kcalFromFormula = calcKcalFromMacros(macros.protein_g, macros.carbs_g, macros.fat_g)
    // 12*1.5=18, 60*1.5=90, 5*1.5=7.5 → 18*4+90*4+7.5*9 = 72+360+67.5=499.5 → 500
    expect(kcalFromFormula).toBeCloseTo(500, 0)
  })
})

describe('validazioni', () => {
  it('percentuali non possono essere negative', () => {
    // pct negativa non ha senso: p_g sarebbe negativa
    const kcal = 2000
    const p_g = (kcal * (-10) / 100) / 4
    expect(p_g).toBeLessThan(0)
  })

  it('somma % deve essere 100', () => {
    const sum = (p: number, c: number, f: number) => Math.abs(p + c + f - 100) < 0.5
    expect(sum(30, 50, 20)).toBe(true)
    expect(sum(30, 50, 25)).toBe(false)
    expect(sum(0, 0, 0)).toBe(false)
  })
})
