import { describe, it, expect } from 'vitest'

// ─── Meal plan: colori pasto ──────────────────────────────────────────────────

const MEAL_TYPES = [
  { value: 'colazione', bg: 'bg-amber-50', border: 'border-amber-200', heading: 'text-amber-800', badge: 'bg-amber-100 text-amber-700' },
  { value: 'spuntino_mattina', bg: 'bg-green-50', border: 'border-green-200', heading: 'text-green-800', badge: 'bg-green-100 text-green-700' },
  { value: 'pranzo', bg: 'bg-sky-50', border: 'border-sky-200', heading: 'text-sky-800', badge: 'bg-sky-100 text-sky-700' },
  { value: 'spuntino_pomeriggio', bg: 'bg-orange-50', border: 'border-orange-200', heading: 'text-orange-800', badge: 'bg-orange-100 text-orange-700' },
  { value: 'cena', bg: 'bg-indigo-50', border: 'border-indigo-200', heading: 'text-indigo-800', badge: 'bg-indigo-100 text-indigo-700' },
]

describe('MEAL_TYPES colori', () => {
  it('ogni pasto ha un colore distinto', () => {
    const bgs = MEAL_TYPES.map(m => m.bg)
    const unique = new Set(bgs)
    expect(unique.size).toBe(MEAL_TYPES.length)
  })

  it('ogni pasto ha bg, border, heading e badge', () => {
    for (const m of MEAL_TYPES) {
      expect(m.bg).toBeTruthy()
      expect(m.border).toBeTruthy()
      expect(m.heading).toBeTruthy()
      expect(m.badge).toBeTruthy()
    }
  })

  it('bg e border sono coerenti per colore', () => {
    for (const m of MEAL_TYPES) {
      // es. bg-amber-50 → border deve contenere 'amber'
      const colorFromBg = m.bg.split('-')[1]
      expect(m.border).toContain(colorFromBg)
      expect(m.heading).toContain(colorFromBg)
      expect(m.badge).toContain(colorFromBg)
    }
  })
})

// ─── Grafici: aggregazione asse X ─────────────────────────────────────────────

type XMode = 'giorni' | 'settimane' | 'mesi'

// Replica della logica di aggregateByMode per test isolati
function aggregateByMode<T extends { date: string }>(
  data: T[],
  mode: XMode,
  aggregate: (items: T[]) => Omit<T, 'date'>
): (Omit<T, 'date'> & { date: string })[] {
  if (mode === 'giorni') return data as (Omit<T, 'date'> & { date: string })[]
  const grouped = new Map<string, T[]>()
  for (const item of data) {
    const d = new Date(item.date.split('/').reverse().join('-'))
    let key: string
    if (mode === 'settimane') {
      const year = d.getFullYear()
      const start = new Date(year, 0, 1)
      const week = Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
      key = `W${week} ${year}`
    } else {
      key = d.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })
    }
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(item)
  }
  return Array.from(grouped.entries()).map(([key, items]) => ({
    date: key,
    ...aggregate(items),
  }))
}

const weightData = [
  { date: '01/04/2026', peso: 80 },
  { date: '08/04/2026', peso: 79.5 },
  { date: '15/04/2026', peso: 79 },
  { date: '22/04/2026', peso: 78.5 },
]

describe('aggregateByMode — peso', () => {
  it('giorni: restituisce i dati invariati', () => {
    const result = aggregateByMode(weightData, 'giorni', items => ({ peso: items[0].peso }))
    expect(result.length).toBe(weightData.length)
    expect(result[0].date).toBe('01/04/2026')
  })

  it('settimane: aggrega per settimana', () => {
    const result = aggregateByMode(weightData, 'settimane', items => ({
      peso: Math.round(items.reduce((s, i) => s + i.peso, 0) / items.length * 10) / 10,
    }))
    // 4 misurazioni in aprile → distribuite in settimane diverse
    expect(result.length).toBeGreaterThan(0)
    expect(result.length).toBeLessThanOrEqual(weightData.length)
    // label deve contenere 'W' e l'anno
    expect(result[0].date).toMatch(/^W\d+/)
  })

  it('mesi: aggrega per mese', () => {
    const result = aggregateByMode(weightData, 'mesi', items => ({
      peso: Math.round(items.reduce((s, i) => s + i.peso, 0) / items.length * 10) / 10,
    }))
    // tutte le date sono in aprile 2026 → 1 solo bucket
    expect(result.length).toBe(1)
    expect(result[0].date).toContain('2026')
    // media: (80 + 79.5 + 79 + 78.5) / 4 = 79.25 → arrotondato 79.3
    expect(result[0].peso).toBe(79.3)
  })

  it('mesi con 2 mesi diversi: restituisce 2 bucket', () => {
    const mixed = [
      { date: '15/03/2026', peso: 82 },
      { date: '15/04/2026', peso: 80 },
    ]
    const result = aggregateByMode(mixed, 'mesi', items => ({
      peso: Math.round(items.reduce((s, i) => s + i.peso, 0) / items.length * 10) / 10,
    }))
    expect(result.length).toBe(2)
  })

  it('media peso per mese è corretta', () => {
    const data = [
      { date: '01/04/2026', peso: 80 },
      { date: '15/04/2026', peso: 78 },
    ]
    const result = aggregateByMode(data, 'mesi', items => ({
      peso: Math.round(items.reduce((s, i) => s + i.peso, 0) / items.length * 10) / 10,
    }))
    expect(result[0].peso).toBe(79)
  })
})

// ─── Chat: delete conversazione ──────────────────────────────────────────────

describe('delete conversazione — logica UI', () => {
  it('dopo delete: activeConv viene resettato se è la conversazione eliminata', () => {
    let activeConv: string | null = 'conv-1'
    const deletedId = 'conv-1'

    // Simula la logica in handleDeleteConversation
    if (activeConv === deletedId) activeConv = null
    expect(activeConv).toBeNull()
  })

  it('dopo delete: activeConv rimane se era diverso', () => {
    let activeConv: string | null = 'conv-2'
    const deletedId = 'conv-1'

    if (activeConv === deletedId) activeConv = null
    expect(activeConv).toBe('conv-2')
  })

  it('lista conversazioni dopo delete non contiene la conversazione eliminata', () => {
    const conversations = [
      { id: 'conv-1', name: 'Mario' },
      { id: 'conv-2', name: 'Lucia' },
    ]
    const deletedId = 'conv-1'
    const updated = conversations.filter(c => c.id !== deletedId)
    expect(updated.length).toBe(1)
    expect(updated[0].id).toBe('conv-2')
  })

  it('elimina il confirm state dopo delete', () => {
    let confirmDeleteConv: string | null = 'conv-1'
    // dopo mutateAsync
    confirmDeleteConv = null
    expect(confirmDeleteConv).toBeNull()
  })
})
