-- ============================================================
-- NutriFlow - Migration 005: Ensure conversations, messages, appointments
-- Idempotent — safe to run even if 003/004 were already applied
-- ============================================================

-- ─── conversations ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
  id                   UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nutritionist_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id           UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  last_message_at      TIMESTAMPTZ,
  last_message_preview TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT conversations_nutritionist_patient_unique UNIQUE(nutritionist_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_nutritionist ON public.conversations(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_conversations_patient      ON public.conversations(patient_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated      ON public.conversations(nutritionist_id, updated_at DESC);

-- ─── messages ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content         TEXT NOT NULL CHECK (char_length(content) > 0),
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_unread       ON public.messages(conversation_id) WHERE is_read = FALSE;

-- ─── appointments ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointments (
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

CREATE INDEX IF NOT EXISTS idx_appointments_nutritionist_date ON public.appointments(nutritionist_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient           ON public.appointments(patient_id);

-- ─── Triggers (idempotent via DO block) ───────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_conversations_updated_at'
  ) THEN
    CREATE TRIGGER update_conversations_updated_at
      BEFORE UPDATE ON public.conversations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_appointments_updated_at'
  ) THEN
    CREATE TRIGGER update_appointments_updated_at
      BEFORE UPDATE ON public.appointments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments  ENABLE ROW LEVEL SECURITY;

-- Drop first so this script is re-runnable
DROP POLICY IF EXISTS "conversations_nutritionist_all" ON public.conversations;
CREATE POLICY "conversations_nutritionist_all" ON public.conversations
  FOR ALL
  USING  (nutritionist_id = (SELECT auth.uid()))
  WITH CHECK (nutritionist_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "messages_nutritionist_all" ON public.messages;
CREATE POLICY "messages_nutritionist_all" ON public.messages
  FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE nutritionist_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE nutritionist_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "appointments_nutritionist_all" ON public.appointments;
CREATE POLICY "appointments_nutritionist_all" ON public.appointments
  FOR ALL
  USING  (nutritionist_id = (SELECT auth.uid()))
  WITH CHECK (nutritionist_id = (SELECT auth.uid()));
