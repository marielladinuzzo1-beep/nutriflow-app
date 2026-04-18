# NutriFlow — Istruzioni per Claude Code

## Autorizzazioni permanenti (nessuna conferma richiesta)

- `npm run build` e `npm run dev` — sempre autorizzati
- `vercel --prod --yes` — deploy in produzione sempre autorizzato
- Migrazioni DB via Supabase Management API (`curl` su `api.supabase.com`) — sempre autorizzate
- Lettura/scrittura di qualsiasi file nel repo — sempre autorizzata
- `nvm use 20` e comandi Node/npm — sempre autorizzati

## Panoramica del progetto

NutriFlow è una web app MVP **completamente gratuita** per nutrizionisti italiani.
Stack: React + Vite + TypeScript + Tailwind CSS + Supabase (free tier).

## Struttura attuale

```
src/
├── App.tsx                    ✅ Routing completo (React Router)
├── main.tsx                   ✅ Entry point + QueryClientProvider
├── index.css                  ✅ Tailwind + CSS variables tema verde
├── types/index.ts             ✅ Tutti i tipi TypeScript
├── lib/
│   ├── supabase.ts            ✅ Client Supabase
│   ├── database.types.ts      ✅ Tipi DB (sostituire con tipi generati)
│   ├── utils.ts               ✅ BMI, BMR, TDEE, formatting, calcNutrients
│   └── validations.ts         ✅ Schemi Zod per tutti i form
├── hooks/
│   ├── useAuth.ts             ✅ Auth Supabase + profilo
│   ├── usePatients.ts         ✅ CRUD pazienti con React Query
│   ├── useMeasurements.ts     ✅ CRUD misurazioni
│   ├── useMealPlans.ts        ✅ CRUD piani alimentari
│   └── useFoods.ts            ✅ DB alimenti + Open Food Facts
├── components/
│   ├── ui/                    ✅ Button, Input, Label, Card, Badge, Dialog, Select, Tabs, Textarea
│   └── layout/                ✅ Sidebar, AppLayout
└── pages/
    ├── auth/LoginPage.tsx      ✅ Login
    ├── auth/RegisterPage.tsx   ✅ Registrazione + GDPR
    ├── dashboard/              ✅ Stats, grafico peso, ultimi pazienti
    ├── patients/               ✅ Lista + dettaglio paziente
    ├── measurements/           ✅ Misurazioni con form
    ├── meal-plans/             ✅ Lista + dettaglio piano
    ├── foods/                  ✅ DB locale + Open Food Facts
    ├── pdf/                    ✅ UI pronta, genera PDF da completare
    └── settings/               ✅ Profilo + GDPR info

supabase/migrations/
├── 001_initial_schema.sql     ✅ Schema completo + RLS
└── 002_seed_data.sql          ✅ ~50 alimenti italiani (fonte CREA)
```

## Setup iniziale (eseguire nell'ordine)

```bash
# 1. Installare dipendenze
npm install

# 2. Copiare .env.example in .env e inserire le credenziali Supabase
cp .env.example .env

# 3. Su Supabase Dashboard → SQL Editor:
#    - Esegui supabase/migrations/001_initial_schema.sql
#    - Esegui supabase/migrations/002_seed_data.sql

# 4. Avviare in sviluppo
npm run dev
```

## Feature da completare (PRIORITÀ)

### 1. 🔴 Generazione PDF (ALTA PRIORITÀ)
File: `src/components/pdf/MealPlanPDF.tsx`

Implementa un PDF professionale con `@react-pdf/renderer`:

```tsx
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import type { MealPlan, Patient } from '@/types'

// Il PDF deve includere:
// - Header con logo NutriFlow e dati del nutrizionista
// - Dati paziente (nome, età, obiettivo)
// - Piano per ogni giorno: colazione, spuntino, pranzo, spuntino, cena
// - Ogni alimento con: nome, grammi, kcal, P/C/G
// - Totale macro giornaliero per ogni giorno
// - Footer con data e note privacy
```

Poi in `src/pages/pdf/PdfPage.tsx` decommenta le righe di import e generazione.

### 2. 🔴 Builder piano alimentare (ALTA PRIORITÀ)
File: `src/pages/meal-plans/MealPlanDetailPage.tsx`

Aggiungere funzionalità:
- Pulsante "Aggiungi giorno" → crea record in `meal_plan_days`
- Per ogni giorno: pulsante "Aggiungi alimento" per ogni pasto
- Dialog con ricerca alimento (usa `useFoods` hook già pronto)
- Calcolo automatico macro con `calcNutrients()` da `lib/utils.ts`
- Salvataggio in `meal_plan_items`

### 3. 🟡 Grafici misurazioni avanzati
File: `src/pages/patients/PatientDetailPage.tsx`

Aggiungere tab "Grafici" con:
- LineChart peso nel tempo (già parzialmente implementato)
- AreaChart BMI con zone colorate (< 18.5 blu, 18.5-25 verde, > 25 giallo/rosso)
- BarChart composizione corporea (massa grassa vs muscolare)
- Usa Recharts (già installato)

### 4. 🟡 AI rule-based (senza API)
File: `src/lib/ai-suggestions.ts` (da creare)

Implementa suggerimenti automatici basati su regole locali:

```typescript
// Suggerisce macro in base a: peso, altezza, età, genere, obiettivo
// Usa le funzioni già pronte: calculateBMR, calculateTDEE, suggestMacros
// Non usare API esterne - tutto locale
export function generateMealPlanSuggestion(patient: Patient, latestMeasurement: Measurement, goal: 'loss' | 'maintain' | 'gain') {
  const age = calculateAge(patient.date_of_birth!)
  const bmr = calculateBMR(latestMeasurement.weight_kg!, latestMeasurement.height_cm!, age, patient.gender as 'M' | 'F')
  const tdee = calculateTDEE(bmr, 1.375) // sedentario-moderato default
  return suggestMacros(tdee, goal)
}
```

### 5. 🟢 Tipi Supabase generati
Esegui per avere tipi perfettamente allineati al DB:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
```

### 6. 🟢 Aggiungere componenti UI mancanti
Installare i componenti shadcn mancanti se necessario:
- `src/components/ui/toast.tsx` (per notifiche)
- `src/components/ui/checkbox.tsx`
- `src/components/ui/separator.tsx`
- `src/components/ui/avatar.tsx`

## Architettura e regole

### Database (Supabase)
- **RLS attivo su tutte le tabelle** — i dati di ogni nutrizionista sono isolati
- Pattern: `nutritionist_id = (SELECT auth.uid())` nelle policy (il SELECT evita re-evaluation per-riga)
- Non esporre mai la `service_role` key nel frontend

### Calcoli nutrizionali (no API esterne)
Tutte le funzioni sono in `src/lib/utils.ts`:
- `calculateBMI(weightKg, heightCm)` → BMI
- `calculateBMR(weight, height, age, gender)` → Mifflin-St Jeor
- `calculateTDEE(bmr, activityLevel)` → TDEE
- `calcNutrients(kcal100g, protein100g, carbs100g, fat100g, quantityG)` → macro per porzione
- `suggestMacros(tdee, goal)` → distribuzione macro rule-based

### Fonti alimenti (tutte gratuite)
1. **DB locale Supabase** — già popolato con alimenti CREA
2. **Open Food Facts** — API gratuita, 100 req/min, già implementata in `useFoods.ts`
3. **USDA FoodData Central** — fallback, API gratuita, da implementare se serve

### GDPR
- Consenso paziente tracciato con timestamp in `patients.gdpr_consent_date`
- Registrazione nutrizionista include consenso obbligatorio
- Tutti i dati risiedono in Supabase (EU region: `eu-west-1`)
- Nessun dato condiviso con terze parti

## Deploy gratuito

### Vercel
```bash
npm install -g vercel
vercel --prod
# Aggiungere le variabili d'ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
```

### Netlify
Crea file `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## Variabili d'ambiente richieste

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## Dipendenze principali

| Pacchetto | Versione | Uso |
|-----------|----------|-----|
| react + react-dom | ^18.3 | UI |
| vite | ^5.4 | Build tool |
| typescript | ^5.5 | Tipizzazione |
| tailwindcss | ^3.4 | CSS utility |
| @supabase/supabase-js | ^2.45 | Backend |
| @tanstack/react-query | ^5.59 | Data fetching |
| react-router-dom | ^6.27 | Routing |
| react-hook-form | ^7.53 | Form |
| zod | ^3.23 | Validazione |
| recharts | ^2.13 | Grafici |
| @react-pdf/renderer | ^3.4 | Generazione PDF |
| lucide-react | ^0.454 | Icone |
| class-variance-authority | ^0.7 | Varianti componenti |

## Comandi utili

```bash
npm run dev          # Sviluppo locale (porta 5173)
npm run build        # Build produzione
npm run preview      # Anteprima build
npm run lint         # ESLint
```
