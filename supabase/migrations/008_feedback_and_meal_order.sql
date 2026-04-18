-- ============================================================
-- NutriFlow - Migrazione 008: Riordino pasti + Feedback paziente
-- ============================================================

-- 1. Ordine pasti personalizzato per giornata del piano
ALTER TABLE public.meal_plan_days
  ADD COLUMN IF NOT EXISTS meal_group_order TEXT[];

-- 2. Form di feedback/anamnesi paziente
CREATE TABLE IF NOT EXISTS public.patient_feedback (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Chi ha compilato (profilo paziente autenticato)
  profile_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Record paziente correlato (può essere NULL se il link non è ancora stabilito)
  patient_id             UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  -- Nutrizionista di riferimento
  nutritionist_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Anagrafica
  first_name             TEXT,
  last_name              TEXT,
  referral_source        TEXT,
  date_of_birth          DATE,
  fiscal_code            TEXT,
  phone                  TEXT,
  email                  TEXT,
  gender                 TEXT,
  height_m               NUMERIC(4,2),
  weight_kg              NUMERIC(5,1),

  -- Occupazione e motivazione
  occupation             TEXT,
  visit_reason           TEXT,

  -- Diete precedenti
  previous_diets         TEXT,
  previous_diets_result  TEXT,
  diet_type              TEXT,

  -- Sonno
  sleep_quality          TEXT,
  sleep_hours            NUMERIC(4,1),

  -- Attività fisica
  physical_activity      TEXT,

  -- Condizioni e patologie
  current_conditions     TEXT[],
  other_conditions       TEXT,
  diagnosed_conditions   TEXT[],

  -- Farmaci e allergie
  takes_medications      BOOLEAN DEFAULT FALSE,
  medications_list       TEXT,
  has_allergies          TEXT,
  allergies_list         TEXT,

  -- Stile di vita
  smoking                BOOLEAN DEFAULT FALSE,

  -- Abitudini alimentari
  breakfast_habits       TEXT,
  lunch_habits           TEXT,
  dinner_habits          TEXT,

  -- Alcol e distribuzione grasso
  alcohol_consumption    TEXT,
  fat_distribution       TEXT[],

  -- Note libere e note del nutrizionista
  additional_notes       TEXT,
  nutritionist_notes     TEXT,

  -- Meta
  submitted_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_feedback ENABLE ROW LEVEL SECURITY;

-- Il paziente può leggere/inserire i propri feedback
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'patient_feedback' AND policyname = 'patient_feedback_own'
  ) THEN
    CREATE POLICY "patient_feedback_own" ON public.patient_feedback
      FOR ALL USING (profile_id = (SELECT auth.uid()));
  END IF;
END $$;

-- Il nutrizionista può leggere/aggiornare i feedback dei propri pazienti
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'patient_feedback' AND policyname = 'patient_feedback_nutritionist'
  ) THEN
    CREATE POLICY "patient_feedback_nutritionist" ON public.patient_feedback
      FOR ALL USING (nutritionist_id = (SELECT auth.uid()));
  END IF;
END $$;
