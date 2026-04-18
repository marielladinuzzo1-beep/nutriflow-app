-- ============================================================
-- NutriFlow - Migration 006: Patient Portal + Todos
-- Eseguire nel SQL Editor di Supabase DOPO 001–005
-- ============================================================

-- ─── 1. Link auth user → patient record ──────────────────────────────────────

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS auth_user_id UUID
  REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_patients_auth_user
  ON public.patients(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- ─── 2. Update handle_new_user: auto-detect patient by email ─────────────────
-- Se l'email corrisponde a un paziente esistente → role='patient' + link

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _patient public.patients%ROWTYPE;
BEGIN
  -- Cerca paziente con la stessa email
  SELECT * INTO _patient
  FROM public.patients
  WHERE lower(email) = lower(NEW.email)
  LIMIT 1;

  INSERT INTO public.profiles (
    id, email, full_name, role,
    nutritionist_id, gdpr_consent, gdpr_consent_date
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      CASE
        WHEN _patient.id IS NOT NULL
          THEN _patient.first_name || ' ' || _patient.last_name
        ELSE 'Utente'
      END
    ),
    CASE
      WHEN _patient.id IS NOT NULL THEN 'patient'
      ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'nutritionist')
    END,
    CASE
      WHEN _patient.id IS NOT NULL THEN _patient.nutritionist_id
      ELSE NULL
    END,
    true,
    NOW()
  );

  -- Collega il paziente all'utente auth
  IF _patient.id IS NOT NULL THEN
    UPDATE public.patients
    SET auth_user_id = NEW.id
    WHERE id = _patient.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 3. To-Do ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.todos (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nutritionist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id      UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'task'
                  CHECK (type IN ('task', 'reminder', 'followup', 'measurement', 'other')),
  deadline        DATE,
  completed       BOOLEAN NOT NULL DEFAULT false,
  completed_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_todos_nutritionist ON public.todos(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_todos_patient
  ON public.todos(patient_id)
  WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_todos_deadline
  ON public.todos(nutritionist_id, deadline)
  WHERE NOT completed AND deadline IS NOT NULL;

CREATE TRIGGER todos_updated_at
  BEFORE UPDATE ON public.todos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "todos_nutritionist_all" ON public.todos
  FOR ALL TO authenticated
  USING  (nutritionist_id = (SELECT auth.uid()))
  WITH CHECK (nutritionist_id = (SELECT auth.uid()));

-- ─── 4. RLS: accesso pazienti ai propri dati ─────────────────────────────────

-- Helper: restituisce il patient_id dell'utente corrente (NULL se non è paziente)
CREATE OR REPLACE FUNCTION public.my_patient_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM public.patients WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- PROFILES: il paziente può vedere il profilo del proprio nutrizionista
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='profiles' AND policyname='profiles_patient_view_nutritionist'
  ) THEN
    CREATE POLICY "profiles_patient_view_nutritionist" ON public.profiles
      FOR SELECT TO authenticated
      USING (
        id IN (
          SELECT nutritionist_id FROM public.patients
          WHERE auth_user_id = (SELECT auth.uid())
        )
      );
  END IF;
END $$;

-- PATIENTS: il paziente vede solo la propria riga
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='patients' AND policyname='patients_patient_select_own'
  ) THEN
    CREATE POLICY "patients_patient_select_own" ON public.patients
      FOR SELECT TO authenticated
      USING (auth_user_id = (SELECT auth.uid()));
  END IF;
END $$;

-- APPOINTMENTS: il paziente vede i propri appuntamenti
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='appointments' AND policyname='appointments_patient_select'
  ) THEN
    CREATE POLICY "appointments_patient_select" ON public.appointments
      FOR SELECT TO authenticated
      USING (patient_id = (SELECT public.my_patient_id()));
  END IF;
END $$;

-- MEAL PLANS: il paziente vede i propri piani (read-only)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='meal_plans' AND policyname='meal_plans_patient_select'
  ) THEN
    CREATE POLICY "meal_plans_patient_select" ON public.meal_plans
      FOR SELECT TO authenticated
      USING (patient_id = (SELECT public.my_patient_id()));
  END IF;
END $$;

-- MEAL PLAN DAYS: il paziente vede i giorni dei propri piani
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='meal_plan_days' AND policyname='meal_plan_days_patient_select'
  ) THEN
    CREATE POLICY "meal_plan_days_patient_select" ON public.meal_plan_days
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.meal_plans mp
        WHERE mp.id = meal_plan_id
          AND mp.patient_id = (SELECT public.my_patient_id())
      ));
  END IF;
END $$;

-- MEAL PLAN ITEMS: il paziente vede gli item dei propri piani
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='meal_plan_items' AND policyname='meal_plan_items_patient_select'
  ) THEN
    CREATE POLICY "meal_plan_items_patient_select" ON public.meal_plan_items
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.meal_plan_days d
        JOIN public.meal_plans mp ON mp.id = d.meal_plan_id
        WHERE d.id = meal_plan_day_id
          AND mp.patient_id = (SELECT public.my_patient_id())
      ));
  END IF;
END $$;

-- CONVERSATIONS: il paziente vede le proprie conversazioni
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='conversations' AND policyname='conversations_patient_select'
  ) THEN
    CREATE POLICY "conversations_patient_select" ON public.conversations
      FOR SELECT TO authenticated
      USING (patient_id = (SELECT public.my_patient_id()));
  END IF;
END $$;

-- MESSAGES: il paziente legge i propri messaggi
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='messages' AND policyname='messages_patient_select'
  ) THEN
    CREATE POLICY "messages_patient_select" ON public.messages
      FOR SELECT TO authenticated
      USING (
        conversation_id IN (
          SELECT id FROM public.conversations
          WHERE patient_id = (SELECT public.my_patient_id())
        )
      );
  END IF;
END $$;

-- MESSAGES: il paziente può inviare messaggi
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='messages' AND policyname='messages_patient_insert'
  ) THEN
    CREATE POLICY "messages_patient_insert" ON public.messages
      FOR INSERT TO authenticated
      WITH CHECK (
        sender_id = (SELECT auth.uid())
        AND conversation_id IN (
          SELECT id FROM public.conversations
          WHERE patient_id = (SELECT public.my_patient_id())
        )
      );
  END IF;
END $$;

-- MEASUREMENTS: il paziente vede le proprie misurazioni
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='measurements' AND policyname='measurements_patient_select'
  ) THEN
    CREATE POLICY "measurements_patient_select" ON public.measurements
      FOR SELECT TO authenticated
      USING (patient_id = (SELECT public.my_patient_id()));
  END IF;
END $$;
