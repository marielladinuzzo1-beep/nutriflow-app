-- ============================================================
-- NutriFlow - Migrazione 003: Miglioramenti piani alimentari
-- Basata su analisi del piano reale (Dott.ssa Di Nuzzo)
-- Esegui nell'SQL Editor di Supabase
-- ============================================================

-- 1. meal_plan_items: rimuovi vincolo fisso sui tipi di pasto
--    e aggiungi supporto per range quantità e raggruppamento alternative
ALTER TABLE public.meal_plan_items
  DROP CONSTRAINT IF EXISTS meal_plan_items_meal_type_check;

ALTER TABLE public.meal_plan_items
  ADD COLUMN IF NOT EXISTS quantity_max_g NUMERIC(6,1),
  ADD COLUMN IF NOT EXISTS alternative_group INTEGER,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- 2. meal_plan_days: aggiungi flag giorno libero e nota giornaliera
ALTER TABLE public.meal_plan_days
  ADD COLUMN IF NOT EXISTS is_free_day BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS daily_note TEXT;

-- 3. meal_plans: aggiungi testi narrativi del piano
--    considerations = "Considerazioni e caratteristiche della dieta" (testo per il paziente)
--    practical_advice = "Delucidazioni e consigli" (note pratiche)
--    daily_extras = "Da consumare in giornata" (alimenti liberi giornalieri)
ALTER TABLE public.meal_plans
  ADD COLUMN IF NOT EXISTS considerations TEXT,
  ADD COLUMN IF NOT EXISTS practical_advice TEXT,
  ADD COLUMN IF NOT EXISTS daily_extras TEXT;

-- Indice per sort_order degli item (per ordinamento pasti)
CREATE INDEX IF NOT EXISTS idx_meal_plan_items_sort
  ON public.meal_plan_items(meal_plan_day_id, sort_order);
