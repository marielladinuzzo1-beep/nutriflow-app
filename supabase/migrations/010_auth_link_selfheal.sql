-- ============================================================
-- NutriFlow - Migrazione 010: Self-healing auth link
-- ------------------------------------------------------------
-- Idempotente. Obiettivi:
--   1) Backfill più aggressivo di patients.auth_user_id
--      (include match via profiles.email → patients.email per
--       gli account già registrati ma non ancora linkati)
--   2) Correzione profiles.role + nutritionist_id mancanti
--   3) Trigger on_patient_feedback_submitted più robusto:
--      tenta la risoluzione anche via email se auth_user_id manca
--      e auto-fixa il link sul momento (self-healing al submit)
--   4) Trigger handle_new_user aggiornato con ON CONFLICT IGNORE
--      per gestire re-registrazioni senza crash
-- ============================================================

-- ─── 1. Backfill aggressivo via email (idempotente) ──────────────────────────

-- a) Collega patients.auth_user_id quando email corrisponde a profiles.email
--    GUARD: non toccare profili nutrizionisti (evita conflitti email duplicata)
UPDATE public.patients p
SET    auth_user_id = pr.id
FROM   public.profiles pr
WHERE  p.auth_user_id IS NULL
  AND  p.email IS NOT NULL
  AND  lower(p.email) = lower(pr.email)
  AND  pr.role IS DISTINCT FROM 'nutritionist';  -- non degradare mai un nutrizionista

-- b) Se il profilo esiste ma ha role errato o nutritionist_id mancante, fixa
--    GUARD: non sovrascrivere mai un profilo nutritionist esistente
UPDATE public.profiles pr
SET    role            = 'patient',
       nutritionist_id = p.nutritionist_id
FROM   public.patients p
WHERE  p.auth_user_id = pr.id
  AND  pr.role IS DISTINCT FROM 'nutritionist'   -- mai degradare un nutrizionista
  AND  (pr.role IS DISTINCT FROM 'patient'
        OR pr.nutritionist_id IS DISTINCT FROM p.nutritionist_id);

-- ─── 2. Trigger handle_new_user più robusto ──────────────────────────────────
-- Aggiunge ON CONFLICT DO NOTHING per evitare errori su doppio-trigger

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _patient public.patients%ROWTYPE;
BEGIN
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
  )
  ON CONFLICT (id) DO UPDATE
    SET role            = EXCLUDED.role,
        nutritionist_id = EXCLUDED.nutritionist_id
    WHERE profiles.role IS DISTINCT FROM EXCLUDED.role
       OR profiles.nutritionist_id IS DISTINCT FROM EXCLUDED.nutritionist_id;

  IF _patient.id IS NOT NULL THEN
    UPDATE public.patients
    SET auth_user_id = NEW.id
    WHERE id = _patient.id AND auth_user_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 3. Trigger on_patient_feedback_submitted più robusto ────────────────────
-- Tenta risoluzione via auth_user_id, poi fallback via email

CREATE OR REPLACE FUNCTION public.on_patient_feedback_submitted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _patient public.patients%ROWTYPE;
  _title   TEXT;
  _full    TEXT;
  _profile_email TEXT;
BEGIN
  -- Tenta risoluzione via auth_user_id (path veloce)
  IF NEW.patient_id IS NULL OR NEW.nutritionist_id IS NULL THEN
    SELECT * INTO _patient
    FROM public.patients
    WHERE auth_user_id = NEW.profile_id
    LIMIT 1;

    -- Fallback: cerca via email del profilo → email del paziente
    IF NOT FOUND THEN
      SELECT lower(email) INTO _profile_email
      FROM public.profiles
      WHERE id = NEW.profile_id;

      IF _profile_email IS NOT NULL THEN
        SELECT * INTO _patient
        FROM public.patients
        WHERE lower(email) = _profile_email
          AND email IS NOT NULL
        LIMIT 1;

        -- Self-healing: fixa il link sul momento (solo se non è un nutrizionista)
        IF FOUND THEN
          UPDATE public.patients
          SET auth_user_id = NEW.profile_id
          WHERE id = _patient.id AND auth_user_id IS NULL;

          UPDATE public.profiles
          SET role = 'patient',
              nutritionist_id = _patient.nutritionist_id
          WHERE id = NEW.profile_id
            AND role IS DISTINCT FROM 'nutritionist'  -- mai degradare un nutrizionista
            AND (role IS DISTINCT FROM 'patient'
                 OR nutritionist_id IS DISTINCT FROM _patient.nutritionist_id);
        END IF;
      END IF;
    END IF;

    IF FOUND THEN
      IF NEW.patient_id IS NULL THEN
        NEW.patient_id := _patient.id;
      END IF;
      IF NEW.nutritionist_id IS NULL THEN
        NEW.nutritionist_id := _patient.nutritionist_id;
      END IF;
    END IF;
  END IF;

  -- Crea notifica per il nutrizionista
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

-- Ricrea il trigger (idempotente)
DROP TRIGGER IF EXISTS patient_feedback_after_insert ON public.patient_feedback;
CREATE TRIGGER patient_feedback_after_insert
  BEFORE INSERT ON public.patient_feedback
  FOR EACH ROW EXECUTE FUNCTION public.on_patient_feedback_submitted();

-- ─── 4. Funzione RPC per il paziente: auto-link al submit ────────────────────
-- Permette al frontend di invocare esplicitamente il link se mancante.
-- SECURITY DEFINER → bypassa RLS; il chiamante deve essere autenticato.

CREATE OR REPLACE FUNCTION public.patient_self_link()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _uid   UUID := auth.uid();
  _email TEXT;
  _pat   public.patients%ROWTYPE;
  _role  TEXT;
BEGIN
  IF _uid IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'not authenticated');
  END IF;

  -- GUARD: non toccare mai i nutrizionisti
  SELECT role INTO _role FROM public.profiles WHERE id = _uid;
  IF _role = 'nutritionist' THEN
    RETURN json_build_object('ok', false, 'reason', 'nutritionist accounts cannot be linked as patient');
  END IF;

  -- Verifica se già linkato
  IF EXISTS (SELECT 1 FROM public.patients WHERE auth_user_id = _uid) THEN
    RETURN json_build_object('ok', true, 'reason', 'already linked');
  END IF;

  -- Recupera email del profilo corrente
  SELECT lower(email) INTO _email FROM public.profiles WHERE id = _uid;
  IF _email IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'no profile email');
  END IF;

  -- Cerca paziente per email
  SELECT * INTO _pat
  FROM public.patients
  WHERE lower(email) = _email AND auth_user_id IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'reason', 'no matching patient');
  END IF;

  -- Esegui il link (guard: mai degradare un nutrizionista)
  UPDATE public.patients SET auth_user_id = _uid WHERE id = _pat.id;
  UPDATE public.profiles
  SET role = 'patient', nutritionist_id = _pat.nutritionist_id
  WHERE id = _uid
    AND role IS DISTINCT FROM 'nutritionist'
    AND (role IS DISTINCT FROM 'patient'
         OR nutritionist_id IS DISTINCT FROM _pat.nutritionist_id);

  RETURN json_build_object('ok', true, 'patient_id', _pat.id, 'nutritionist_id', _pat.nutritionist_id);
END;
$$;

-- Concedi EXECUTE agli autenticati (non espone dati: usa auth.uid() internamente)
GRANT EXECUTE ON FUNCTION public.patient_self_link() TO authenticated;
