-- ============================================================
-- NutriFlow - Schema iniziale Supabase
-- Esegui questo file nell'SQL Editor di Supabase
-- ============================================================

-- Estensioni
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── PROFILES ────────────────────────────────────────────────────────────────
-- Estende auth.users con dati professionali

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'nutritionist' CHECK (role IN ('nutritionist', 'patient')),
  nutritionist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  phone TEXT,
  avatar_url TEXT,
  gdpr_consent BOOLEAN NOT NULL DEFAULT false,
  gdpr_consent_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger per auto-creare profilo al signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, gdpr_consent, gdpr_consent_date)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Utente'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'nutritionist'),
    true,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── PATIENTS ─────────────────────────────────────────────────────────────────

CREATE TABLE public.patients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nutritionist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('M', 'F', 'altro')),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  gdpr_consent BOOLEAN NOT NULL DEFAULT false,
  gdpr_consent_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patients_nutritionist ON public.patients(nutritionist_id);
CREATE INDEX idx_patients_name ON public.patients(last_name, first_name);

CREATE TRIGGER patients_updated_at BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── MEASUREMENTS ─────────────────────────────────────────────────────────────

CREATE TABLE public.measurements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  nutritionist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  measured_at DATE NOT NULL,
  weight_kg NUMERIC(5,2),
  height_cm NUMERIC(5,1),
  bmi NUMERIC(4,1),
  body_fat_pct NUMERIC(4,1),
  muscle_mass_kg NUMERIC(5,2),
  waist_cm NUMERIC(5,1),
  hip_cm NUMERIC(5,1),
  arm_cm NUMERIC(5,1),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_measurements_patient ON public.measurements(patient_id, measured_at DESC);
CREATE INDEX idx_measurements_nutritionist ON public.measurements(nutritionist_id);

-- ─── FOODS ────────────────────────────────────────────────────────────────────

CREATE TABLE public.foods (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  source TEXT NOT NULL DEFAULT 'custom' CHECK (source IN ('crea', 'openfoodfacts', 'custom', 'usda')),
  kcal_100g NUMERIC(6,2) NOT NULL DEFAULT 0,
  protein_100g NUMERIC(5,2) NOT NULL DEFAULT 0,
  carbs_100g NUMERIC(5,2) NOT NULL DEFAULT 0,
  fat_100g NUMERIC(5,2) NOT NULL DEFAULT 0,
  fiber_100g NUMERIC(5,2),
  sodium_100g NUMERIC(6,3),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  barcode TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_foods_name ON public.foods USING GIN(to_tsvector('italian', name));
CREATE INDEX idx_foods_barcode ON public.foods(barcode) WHERE barcode IS NOT NULL;

-- ─── MEAL PLANS ───────────────────────────────────────────────────────────────

CREATE TABLE public.meal_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  nutritionist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  start_date DATE,
  end_date DATE,
  target_kcal INTEGER,
  target_protein_g INTEGER,
  target_carbs_g INTEGER,
  target_fat_g INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meal_plans_patient ON public.meal_plans(patient_id);
CREATE INDEX idx_meal_plans_nutritionist ON public.meal_plans(nutritionist_id);

CREATE TRIGGER meal_plans_updated_at BEFORE UPDATE ON public.meal_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── MEAL PLAN DAYS ───────────────────────────────────────────────────────────

CREATE TABLE public.meal_plan_days (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  meal_plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  day_label TEXT,
  UNIQUE(meal_plan_id, day_number)
);

-- ─── MEAL PLAN ITEMS ──────────────────────────────────────────────────────────

CREATE TABLE public.meal_plan_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  meal_plan_day_id UUID NOT NULL REFERENCES public.meal_plan_days(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('colazione','spuntino_mattina','pranzo','spuntino_pomeriggio','cena')),
  food_id UUID NOT NULL REFERENCES public.foods(id),
  quantity_g NUMERIC(6,1) NOT NULL,
  kcal NUMERIC(6,1) NOT NULL DEFAULT 0,
  protein_g NUMERIC(5,2) NOT NULL DEFAULT 0,
  carbs_g NUMERIC(5,2) NOT NULL DEFAULT 0,
  fat_g NUMERIC(5,2) NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE INDEX idx_meal_plan_items_day ON public.meal_plan_items(meal_plan_day_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plan_items ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()));

-- PATIENTS (solo il nutrizionista che li ha creati)
CREATE POLICY "patients_select" ON public.patients FOR SELECT TO authenticated
  USING (nutritionist_id = (SELECT auth.uid()));
CREATE POLICY "patients_insert" ON public.patients FOR INSERT TO authenticated
  WITH CHECK (nutritionist_id = (SELECT auth.uid()));
CREATE POLICY "patients_update" ON public.patients FOR UPDATE TO authenticated
  USING (nutritionist_id = (SELECT auth.uid()));
CREATE POLICY "patients_delete" ON public.patients FOR DELETE TO authenticated
  USING (nutritionist_id = (SELECT auth.uid()));

-- MEASUREMENTS
CREATE POLICY "measurements_select" ON public.measurements FOR SELECT TO authenticated
  USING (nutritionist_id = (SELECT auth.uid()));
CREATE POLICY "measurements_insert" ON public.measurements FOR INSERT TO authenticated
  WITH CHECK (nutritionist_id = (SELECT auth.uid()));
CREATE POLICY "measurements_update" ON public.measurements FOR UPDATE TO authenticated
  USING (nutritionist_id = (SELECT auth.uid()));
CREATE POLICY "measurements_delete" ON public.measurements FOR DELETE TO authenticated
  USING (nutritionist_id = (SELECT auth.uid()));

-- FOODS (tutti gli autenticati possono leggere, solo il creatore modifica i custom)
CREATE POLICY "foods_select" ON public.foods FOR SELECT TO authenticated USING (true);
CREATE POLICY "foods_insert" ON public.foods FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()) OR created_by IS NULL);
CREATE POLICY "foods_update_own" ON public.foods FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()));
CREATE POLICY "foods_delete_own" ON public.foods FOR DELETE TO authenticated
  USING (created_by = (SELECT auth.uid()));

-- MEAL PLANS
CREATE POLICY "meal_plans_select" ON public.meal_plans FOR SELECT TO authenticated
  USING (nutritionist_id = (SELECT auth.uid()));
CREATE POLICY "meal_plans_insert" ON public.meal_plans FOR INSERT TO authenticated
  WITH CHECK (nutritionist_id = (SELECT auth.uid()));
CREATE POLICY "meal_plans_update" ON public.meal_plans FOR UPDATE TO authenticated
  USING (nutritionist_id = (SELECT auth.uid()));
CREATE POLICY "meal_plans_delete" ON public.meal_plans FOR DELETE TO authenticated
  USING (nutritionist_id = (SELECT auth.uid()));

-- MEAL PLAN DAYS (via meal_plan)
CREATE POLICY "meal_plan_days_select" ON public.meal_plan_days FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.meal_plans mp
    WHERE mp.id = meal_plan_id AND mp.nutritionist_id = (SELECT auth.uid())
  ));
CREATE POLICY "meal_plan_days_insert" ON public.meal_plan_days FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.meal_plans mp
    WHERE mp.id = meal_plan_id AND mp.nutritionist_id = (SELECT auth.uid())
  ));
CREATE POLICY "meal_plan_days_delete" ON public.meal_plan_days FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.meal_plans mp
    WHERE mp.id = meal_plan_id AND mp.nutritionist_id = (SELECT auth.uid())
  ));

-- MEAL PLAN ITEMS (via meal_plan_day -> meal_plan)
CREATE POLICY "meal_plan_items_select" ON public.meal_plan_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.meal_plan_days d
    JOIN public.meal_plans mp ON mp.id = d.meal_plan_id
    WHERE d.id = meal_plan_day_id AND mp.nutritionist_id = (SELECT auth.uid())
  ));
CREATE POLICY "meal_plan_items_insert" ON public.meal_plan_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.meal_plan_days d
    JOIN public.meal_plans mp ON mp.id = d.meal_plan_id
    WHERE d.id = meal_plan_day_id AND mp.nutritionist_id = (SELECT auth.uid())
  ));
CREATE POLICY "meal_plan_items_delete" ON public.meal_plan_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.meal_plan_days d
    JOIN public.meal_plans mp ON mp.id = d.meal_plan_id
    WHERE d.id = meal_plan_day_id AND mp.nutritionist_id = (SELECT auth.uid())
  ));
