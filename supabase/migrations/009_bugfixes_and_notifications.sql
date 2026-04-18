-- ============================================================
-- NutriFlow - Migrazione 009: Bugfix batch + Sistema notifiche
-- ------------------------------------------------------------
-- Idempotente: si può eseguire più volte senza effetti collaterali.
-- Obiettivi:
--   1) Backfill patients.auth_user_id per match su email  → chat + piano visibili al paziente
--   2) Trigger che aggiorna conversations.last_message_*   → messaggi "arrivano" sempre
--   3) Tabella notifications + trigger su patient_feedback → notifica al nutrizionista
--   4) Trigger su patient_feedback per collegare patient_id/nutritionist_id se mancanti
--
-- Compatibilità: nessun DROP; tutte le aggiunte sono IF NOT EXISTS / CREATE OR REPLACE
-- ============================================================

-- ─── 1. Backfill auth_user_id sui pazienti per email match ───────────────────
-- Copre i casi in cui il paziente si era registrato PRIMA che la email fosse
-- inserita nella scheda paziente, o dove handle_new_user() non ha trovato match.

UPDATE public.patients p
SET    auth_user_id = u.id
FROM   auth.users u
WHERE  p.auth_user_id IS NULL
  AND  p.email IS NOT NULL
  AND  lower(p.email) = lower(u.email);

-- Assicura anche che il profilo del paziente abbia role='patient' + nutritionist_id corretto
UPDATE public.profiles pr
SET    role = 'patient',
       nutritionist_id = p.nutritionist_id
FROM   public.patients p
WHERE  p.auth_user_id = pr.id
  AND  (pr.role IS DISTINCT FROM 'patient' OR pr.nutritionist_id IS DISTINCT FROM p.nutritionist_id);

-- ─── 2. Trigger: aggiorna conversations al nuovo messaggio ───────────────────
-- Tiene allineato last_message_at / last_message_preview / updated_at
-- sia quando scrive il nutrizionista sia quando scrive il paziente.

CREATE OR REPLACE FUNCTION public.touch_conversation_on_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.conversations
  SET    last_message_at      = NEW.created_at,
         last_message_preview = left(NEW.content, 160),
         updated_at           = NEW.created_at
  WHERE  id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_touch_conversation ON public.messages;
CREATE TRIGGER messages_touch_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_conversation_on_message();

-- ─── 3. Tabella notifiche per il nutrizionista ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type            TEXT NOT NULL
                  CHECK (type IN ('feedback_submitted', 'new_message', 'appointment', 'other')),
  title           TEXT NOT NULL,
  body            TEXT,
  link            TEXT,                  -- es: /pazienti/<id>?tab=questionario
  patient_id      UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  related_id      UUID,                  -- es: id del feedback
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_nutritionist
  ON public.notifications(nutritionist_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='notifications' AND policyname='notifications_owner'
  ) THEN
    CREATE POLICY "notifications_owner" ON public.notifications
      FOR ALL TO authenticated
      USING (nutritionist_id = (SELECT auth.uid()))
      WITH CHECK (nutritionist_id = (SELECT auth.uid()));
  END IF;
END $$;

-- ─── 4. Feedback → aggancia patient_id/nutritionist_id + crea notifica ───────

CREATE OR REPLACE FUNCTION public.on_patient_feedback_submitted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _patient public.patients%ROWTYPE;
  _title   TEXT;
  _full    TEXT;
BEGIN
  -- Se patient_id/nutritionist_id mancanti prova a risolverli
  IF NEW.patient_id IS NULL OR NEW.nutritionist_id IS NULL THEN
    SELECT * INTO _patient
    FROM public.patients
    WHERE auth_user_id = NEW.profile_id
    LIMIT 1;

    IF FOUND THEN
      IF NEW.patient_id IS NULL THEN
        NEW.patient_id := _patient.id;
      END IF;
      IF NEW.nutritionist_id IS NULL THEN
        NEW.nutritionist_id := _patient.nutritionist_id;
      END IF;
    END IF;
  END IF;

  -- Crea notifica per il nutrizionista, se presente
  IF NEW.nutritionist_id IS NOT NULL THEN
    _full := trim(concat_ws(' ', NEW.first_name, NEW.last_name));
    IF _full IS NULL OR _full = '' THEN
      _full := 'Un paziente';
    END IF;
    _title := _full || ' ha inviato il questionario';

    INSERT INTO public.notifications (
      nutritionist_id, type, title, body, link, patient_id, related_id
    ) VALUES (
      NEW.nutritionist_id,
      'feedback_submitted',
      _title,
      'Clicca per rivedere le risposte del questionario di prima anamnesi.',
      CASE WHEN NEW.patient_id IS NOT NULL
           THEN '/pazienti/' || NEW.patient_id::text || '?tab=questionario'
           ELSE NULL END,
      NEW.patient_id,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS patient_feedback_after_insert ON public.patient_feedback;
CREATE TRIGGER patient_feedback_after_insert
  BEFORE INSERT ON public.patient_feedback
  FOR EACH ROW EXECUTE FUNCTION public.on_patient_feedback_submitted();

-- ─── 5. Assicura che il nutrizionista possa leggere il feedback dei suoi pazienti
-- (già previsto da 008, ma la policy richiedeva nutritionist_id settato; il trigger
-- sopra lo assicura).  Aggiungiamo policy esplicita anche via patient_id come fallback.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='patient_feedback' AND policyname='patient_feedback_nutritionist_via_patient'
  ) THEN
    CREATE POLICY "patient_feedback_nutritionist_via_patient" ON public.patient_feedback
      FOR SELECT TO authenticated
      USING (
        patient_id IN (
          SELECT id FROM public.patients
          WHERE nutritionist_id = (SELECT auth.uid())
        )
      );
  END IF;
END $$;
