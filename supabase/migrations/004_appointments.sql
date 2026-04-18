-- ============================================================
-- NutriFlow - Migration 004: Appuntamenti / Calendario
-- Eseguire nel SQL Editor di Supabase DOPO 001, 002 e 003
-- ============================================================

CREATE TABLE public.appointments (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nutritionist_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id       UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  date             DATE NOT NULL,
  start_time       TIME NOT NULL,
  end_time         TIME,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointments_nutritionist_date ON public.appointments(nutritionist_id, date);
CREATE INDEX idx_appointments_patient           ON public.appointments(patient_id);

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointments_nutritionist_all" ON public.appointments
  FOR ALL
  USING  (nutritionist_id = (SELECT auth.uid()))
  WITH CHECK (nutritionist_id = (SELECT auth.uid()));
