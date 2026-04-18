import type { Food, MealType } from '@/types'
import { calcNutrients } from './utils'

export const DAY_LABELS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']

interface FoodSlot {
  name: string
  base_g: number
}

interface MealSlot {
  meal_type: MealType
  slots: FoodSlot[]
}

interface DayTemplate {
  meals: MealSlot[]
}

export interface GeneratedItem {
  food_id: string
  food: Food
  quantity_g: number
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface GeneratedMeal {
  meal_type: MealType
  items: GeneratedItem[]
}

export interface GeneratedDay {
  day_number: number
  day_label: string
  meals: GeneratedMeal[]
}

/**
 * 7-day Italian meal template.
 * Base quantities are calibrated for ~2000 kcal/day using foods from the CREA DB seed.
 * Names must match exactly the `name` field in the `foods` table (case-insensitive).
 */
const DAY_TEMPLATES: DayTemplate[] = [
  // Lunedì
  {
    meals: [
      {
        meal_type: 'colazione',
        slots: [
          { name: 'Fiocchi di avena', base_g: 60 },
          { name: 'Latte parzialmente scremato', base_g: 200 },
          { name: 'Mela', base_g: 150 },
        ],
      },
      {
        meal_type: 'spuntino_mattina',
        slots: [
          { name: 'Yogurt greco 0%', base_g: 150 },
          { name: 'Mandorle', base_g: 20 },
        ],
      },
      {
        meal_type: 'pranzo',
        slots: [
          { name: 'Pasta di semola cotta', base_g: 200 },
          { name: 'Petto di pollo', base_g: 150 },
          { name: 'Broccoli crudi', base_g: 150 },
          { name: 'Olio extravergine di oliva', base_g: 15 },
        ],
      },
      {
        meal_type: 'spuntino_pomeriggio',
        slots: [
          { name: 'Banana', base_g: 120 },
          { name: 'Noci', base_g: 20 },
        ],
      },
      {
        meal_type: 'cena',
        slots: [
          { name: 'Salmone', base_g: 180 },
          { name: 'Spinaci crudi', base_g: 200 },
          { name: 'Pane comune', base_g: 50 },
          { name: 'Olio extravergine di oliva', base_g: 10 },
        ],
      },
    ],
  },
  // Martedì
  {
    meals: [
      {
        meal_type: 'colazione',
        slots: [
          { name: 'Pane integrale', base_g: 60 },
          { name: 'Yogurt bianco intero', base_g: 150 },
          { name: 'Arancia', base_g: 180 },
        ],
      },
      {
        meal_type: 'spuntino_mattina',
        slots: [
          { name: 'Mela', base_g: 150 },
          { name: 'Mandorle', base_g: 20 },
        ],
      },
      {
        meal_type: 'pranzo',
        slots: [
          { name: 'Riso bianco cotto', base_g: 200 },
          { name: 'Merluzzo', base_g: 200 },
          { name: 'Zucchine', base_g: 200 },
          { name: 'Olio extravergine di oliva', base_g: 15 },
        ],
      },
      {
        meal_type: 'spuntino_pomeriggio',
        slots: [
          { name: 'Pera', base_g: 150 },
          { name: 'Noci', base_g: 20 },
        ],
      },
      {
        meal_type: 'cena',
        slots: [
          { name: 'Uovo intero', base_g: 150 },
          { name: 'Pomodori', base_g: 200 },
          { name: 'Pane comune', base_g: 50 },
          { name: 'Olio extravergine di oliva', base_g: 10 },
        ],
      },
    ],
  },
  // Mercoledì
  {
    meals: [
      {
        meal_type: 'colazione',
        slots: [
          { name: 'Fiocchi di avena', base_g: 60 },
          { name: 'Latte parzialmente scremato', base_g: 200 },
          { name: 'Banana', base_g: 100 },
        ],
      },
      {
        meal_type: 'spuntino_mattina',
        slots: [
          { name: 'Yogurt greco 0%', base_g: 150 },
          { name: 'Kiwi', base_g: 100 },
        ],
      },
      {
        meal_type: 'pranzo',
        slots: [
          { name: 'Pasta di semola cotta', base_g: 200 },
          { name: 'Tacchino petto', base_g: 150 },
          { name: 'Insalata mista', base_g: 150 },
          { name: 'Olio extravergine di oliva', base_g: 15 },
        ],
      },
      {
        meal_type: 'spuntino_pomeriggio',
        slots: [
          { name: 'Fragole', base_g: 200 },
          { name: 'Mandorle', base_g: 20 },
        ],
      },
      {
        meal_type: 'cena',
        slots: [
          { name: 'Petto di pollo', base_g: 180 },
          { name: 'Cavolfiore', base_g: 200 },
          { name: 'Pane integrale', base_g: 50 },
          { name: 'Olio extravergine di oliva', base_g: 10 },
        ],
      },
    ],
  },
  // Giovedì
  {
    meals: [
      {
        meal_type: 'colazione',
        slots: [
          { name: 'Pane comune', base_g: 60 },
          { name: 'Ricotta vaccina', base_g: 80 },
          { name: 'Fragole', base_g: 150 },
        ],
      },
      {
        meal_type: 'spuntino_mattina',
        slots: [
          { name: 'Banana', base_g: 120 },
          { name: 'Noci', base_g: 20 },
        ],
      },
      {
        meal_type: 'pranzo',
        slots: [
          { name: 'Riso integrale cotto', base_g: 200 },
          { name: 'Tonno in scatola (al naturale)', base_g: 150 },
          { name: 'Peperoni', base_g: 200 },
          { name: 'Olio extravergine di oliva', base_g: 15 },
        ],
      },
      {
        meal_type: 'spuntino_pomeriggio',
        slots: [
          { name: 'Uva', base_g: 150 },
          { name: 'Mandorle', base_g: 20 },
        ],
      },
      {
        meal_type: 'cena',
        slots: [
          { name: 'Manzo magro (fesa)', base_g: 180 },
          { name: 'Carote', base_g: 200 },
          { name: 'Pane comune', base_g: 50 },
          { name: 'Olio extravergine di oliva', base_g: 10 },
        ],
      },
    ],
  },
  // Venerdì
  {
    meals: [
      {
        meal_type: 'colazione',
        slots: [
          { name: 'Fiocchi di avena', base_g: 60 },
          { name: 'Latte parzialmente scremato', base_g: 200 },
          { name: 'Kiwi', base_g: 100 },
        ],
      },
      {
        meal_type: 'spuntino_mattina',
        slots: [
          { name: 'Yogurt greco 0%', base_g: 150 },
          { name: 'Mela', base_g: 120 },
        ],
      },
      {
        meal_type: 'pranzo',
        slots: [
          { name: 'Pasta di semola cotta', base_g: 200 },
          { name: 'Lenticchie cotte', base_g: 150 },
          { name: 'Spinaci crudi', base_g: 150 },
          { name: 'Olio extravergine di oliva', base_g: 15 },
        ],
      },
      {
        meal_type: 'spuntino_pomeriggio',
        slots: [
          { name: 'Pera', base_g: 150 },
          { name: 'Mandorle', base_g: 20 },
        ],
      },
      {
        meal_type: 'cena',
        slots: [
          { name: 'Salmone', base_g: 180 },
          { name: 'Broccoli crudi', base_g: 200 },
          { name: 'Pane integrale', base_g: 50 },
          { name: 'Olio extravergine di oliva', base_g: 10 },
        ],
      },
    ],
  },
  // Sabato
  {
    meals: [
      {
        meal_type: 'colazione',
        slots: [
          { name: 'Pane integrale', base_g: 60 },
          { name: 'Latte parzialmente scremato', base_g: 200 },
          { name: 'Arancia', base_g: 180 },
        ],
      },
      {
        meal_type: 'spuntino_mattina',
        slots: [
          { name: 'Banana', base_g: 120 },
          { name: 'Noci', base_g: 20 },
        ],
      },
      {
        meal_type: 'pranzo',
        slots: [
          { name: 'Riso bianco cotto', base_g: 200 },
          { name: 'Ceci cotti', base_g: 150 },
          { name: 'Pomodori', base_g: 200 },
          { name: 'Olio extravergine di oliva', base_g: 15 },
        ],
      },
      {
        meal_type: 'spuntino_pomeriggio',
        slots: [
          { name: 'Fragole', base_g: 200 },
          { name: 'Yogurt greco 0%', base_g: 100 },
        ],
      },
      {
        meal_type: 'cena',
        slots: [
          { name: 'Merluzzo', base_g: 200 },
          { name: 'Zucchine', base_g: 200 },
          { name: 'Pane comune', base_g: 50 },
          { name: 'Olio extravergine di oliva', base_g: 10 },
        ],
      },
    ],
  },
  // Domenica
  {
    meals: [
      {
        meal_type: 'colazione',
        slots: [
          { name: 'Fiocchi di avena', base_g: 70 },
          { name: 'Yogurt bianco intero', base_g: 150 },
          { name: 'Mela', base_g: 150 },
        ],
      },
      {
        meal_type: 'spuntino_mattina',
        slots: [
          { name: 'Kiwi', base_g: 150 },
          { name: 'Mandorle', base_g: 20 },
        ],
      },
      {
        meal_type: 'pranzo',
        slots: [
          { name: 'Pasta di semola cotta', base_g: 200 },
          { name: 'Manzo magro (fesa)', base_g: 150 },
          { name: 'Cavolfiore', base_g: 200 },
          { name: 'Olio extravergine di oliva', base_g: 15 },
        ],
      },
      {
        meal_type: 'spuntino_pomeriggio',
        slots: [
          { name: 'Uva', base_g: 150 },
          { name: 'Noci', base_g: 20 },
        ],
      },
      {
        meal_type: 'cena',
        slots: [
          { name: 'Tacchino petto', base_g: 180 },
          { name: 'Insalata mista', base_g: 200 },
          { name: 'Pane integrale', base_g: 50 },
          { name: 'Olio extravergine di oliva', base_g: 10 },
        ],
      },
    ],
  },
]

/**
 * Generates a 7-day meal plan scaled to the target kcal.
 *
 * Algorithm:
 * 1. Build a case-insensitive food name → Food lookup from the DB foods list.
 *    Uses a 3-level fuzzy match: exact → word-prefix → contains.
 * 2. For each day template, compute the total kcal from the base quantities.
 * 3. Derive a scale factor = targetKcal / templateKcal.
 * 4. Apply the scale to every slot quantity; round to nearest 5 g (min 5 g).
 * 5. Calculate macros with calcNutrients and guard against NaN / negative values.
 * 6. Skip any slot whose food name is not found in the DB (graceful degradation).
 *
 * @param targetKcal - daily kcal target (clamped to [800, ∞))
 * @param foods      - all foods rows from Supabase
 */
export function generateMealPlan(targetKcal: number, foods: Food[]): GeneratedDay[] {
  const safeKcal = Math.max(800, Number(targetKcal) || 2000)

  // Case-insensitive name → Food lookup (exact)
  const foodMap = new Map<string, Food>()
  for (const f of foods) {
    if (f.name) foodMap.set(f.name.toLowerCase().trim(), f)
  }

  /**
   * 3-level fuzzy match so that template names like "Pasta di semola cotta"
   * still resolve even if the DB stores "Pasta di semola" (or vice versa).
   *
   * Priority: 1) exact  2) db-key starts with slot-key  3) slot-key starts with db-key  4) slot-key contained in db-key
   */
  function findFood(slotName: string): Food | undefined {
    const key = slotName.toLowerCase().trim()
    if (foodMap.has(key)) return foodMap.get(key)

    // Normalize: drop trailing adjectives like "crudi", "cotto", "cotta", "intero", "intera"
    const normalize = (s: string) =>
      s.replace(/\b(crudi?|cotti?|interi?|al\s+naturale)\b/gi, '').replace(/\s+/g, ' ').trim()

    const normKey = normalize(key)

    let bestScore = -1
    let bestFood: Food | undefined

    for (const [dbKey, food] of foodMap) {
      const normDb = normalize(dbKey)
      let score = 0
      if (normDb === normKey) score = 100
      else if (normDb.startsWith(normKey) || normKey.startsWith(normDb)) score = 80
      else if (normDb.includes(normKey) || normKey.includes(normDb)) score = 60
      else {
        // Word-overlap score
        const slotWords = normKey.split(' ').filter(w => w.length > 2)
        const dbWords = normDb.split(' ')
        const overlap = slotWords.filter(w => dbWords.some(d => d.startsWith(w))).length
        if (overlap > 0) score = overlap * 10
      }

      if (score > bestScore) {
        bestScore = score
        bestFood = food
      }
    }

    // Only accept matches with meaningful overlap
    return bestScore >= 10 ? bestFood : undefined
  }

  return DAY_TEMPLATES.map((dayTemplate, i) => {
    // Pass 1: compute template kcal from base quantities
    let templateKcal = 0
    for (const meal of dayTemplate.meals) {
      for (const slot of meal.slots) {
        const food = findFood(slot.name)
        if (food && food.kcal_100g > 0) {
          templateKcal += (food.kcal_100g * slot.base_g) / 100
        }
      }
    }

    const scale = templateKcal > 0 ? safeKcal / templateKcal : 1

    // Pass 2: build items with scaled quantities
    const meals: GeneratedMeal[] = []
    for (const meal of dayTemplate.meals) {
      const items: GeneratedItem[] = []
      for (const slot of meal.slots) {
        const food = findFood(slot.name)
        if (!food) continue // food not in DB – skip

        // Round to nearest 5 g, minimum 5 g
        const quantity_g = Math.max(5, Math.round((slot.base_g * scale) / 5) * 5)

        const raw = calcNutrients(
          food.kcal_100g ?? 0,
          food.protein_100g ?? 0,
          food.carbs_100g ?? 0,
          food.fat_100g ?? 0,
          quantity_g,
        )

        items.push({
          food_id: food.id,
          food,
          quantity_g,
          kcal: isNaN(raw.kcal) || raw.kcal < 0 ? 0 : raw.kcal,
          protein_g: isNaN(raw.protein_g) || raw.protein_g < 0 ? 0 : raw.protein_g,
          carbs_g: isNaN(raw.carbs_g) || raw.carbs_g < 0 ? 0 : raw.carbs_g,
          fat_g: isNaN(raw.fat_g) || raw.fat_g < 0 ? 0 : raw.fat_g,
        })
      }

      if (items.length > 0) {
        meals.push({ meal_type: meal.meal_type, items })
      }
    }

    return {
      day_number: i + 1,
      day_label: DAY_LABELS[i],
      meals,
    }
  })
}
