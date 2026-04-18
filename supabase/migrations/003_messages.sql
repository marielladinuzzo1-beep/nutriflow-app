-- ============================================================
-- NutriFlow - Migration 003: Messaggistica
-- Eseguire nel SQL Editor di Supabase DOPO 001 e 002
-- ============================================================

-- ─── Conversations ───────────────────────────────────────────────────────────
CREATE TABLE public.conversations (
  id                   UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nutritionist_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id           UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  last_message_at      TIMESTAMPTZ,
  last_message_preview TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(nutritionist_id, patient_id)
);

CREATE INDEX idx_conversations_nutritionist ON public.conversations(nutritionist_id);
CREATE INDEX idx_conversations_patient     ON public.conversations(patient_id);
CREATE INDEX idx_conversations_updated     ON public.conversations(nutritionist_id, updated_at DESC);

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Messages ────────────────────────────────────────────────────────────────
CREATE TABLE public.messages (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content         TEXT NOT NULL CHECK (char_length(content) > 0),
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at ASC);
CREATE INDEX idx_messages_unread       ON public.messages(conversation_id) WHERE is_read = FALSE;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages      ENABLE ROW LEVEL SECURITY;

-- Conversations: solo il nutrizionista proprietario
CREATE POLICY "conversations_nutritionist_all" ON public.conversations
  FOR ALL
  USING  (nutritionist_id = (SELECT auth.uid()))
  WITH CHECK (nutritionist_id = (SELECT auth.uid()));

-- Messages: solo se la conversazione appartiene al nutrizionista corrente
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
