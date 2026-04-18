# Changelog

Tutte le modifiche rilevanti al progetto NutriFlow sono documentate in questo file.

Il formato è basato su [Keep a Changelog](https://keepachangelog.com/it/1.1.0/)
e il progetto segue il [Semantic Versioning](https://semver.org/lang/it/).

## [Unreleased]

## [0.2.1] — 2026-04-18

### Fixed
- **Auth link self-healing**: il portale paziente ora chiama `patient_self_link()` (funzione SECURITY DEFINER) al primo caricamento per risolvere automaticamente i casi in cui `patients.auth_user_id` non era impostato (e-mail match via `profiles.email → patients.email`). Questo sblocca piano alimentare, chat e notifiche per i pazienti già registrati ma non ancora linkati.
- **Trigger `on_patient_feedback_submitted` più robusto**: fallback via e-mail del profilo quando `auth_user_id` è NULL; auto-fixa il link nel DB al momento dell'invio del questionario.
- **Trigger `handle_new_user` con ON CONFLICT**: gestisce registrazioni duplicate senza crash; aggiorna `role` e `nutritionist_id` se già presenti.

### Database
- Migrazione `010_auth_link_selfheal.sql` (idempotente):
  1. Backfill aggressivo via `profiles.email → patients.email` (non solo via `auth.users.email`).
  2. `handle_new_user()` aggiornata con `ON CONFLICT DO UPDATE`.
  3. `on_patient_feedback_submitted()` aggiornata con fallback email + self-healing.
  4. Funzione RPC `patient_self_link()` (SECURITY DEFINER, `GRANT` agli autenticati).

## [0.2.0] — 2026-04-18

### Fixed
- **Portale paziente — Piano alimentare**: il paziente vedeva a volte una *bozza* più recente al posto del piano *attivato* dal nutrizionista.
  La query ora filtra su `status = 'active'` ordinando per `updated_at` desc (`src/pages/patient-portal/PatientMealPlanPage.tsx`).
- **Chat paziente ↔ nutrizionista**: i messaggi non sempre risultavano "arrivati" perché `conversations.last_message_*` non veniva aggiornato dal lato paziente (che non ha permessi UPDATE sulla conversazione).
  Introdotto trigger `messages_touch_conversation` che aggiorna `last_message_at/preview/updated_at` lato server in modo simmetrico.
  Inoltre backfill di `patients.auth_user_id` per allineare gli account paziente già registrati con la scheda paziente (precondizione RLS per SELECT/INSERT messaggi).
- **Questionario paziente (anamnesi)**: il submit falliva silenziosamente quando il profilo non era ancora caricato e quando la tabella `patient_feedback` non era presente (migrazione 008 mai eseguita). Applicata 008 idempotente e aggiunta gestione errori esplicita nel form.
  Il `nutritionist_id` viene inoltre risolto dal record paziente se non disponibile sul profilo.

### Added
- **Notifica nutrizionista al submit questionario**:
  - Tabella `public.notifications` (RLS solo per il nutrizionista proprietario).
  - Trigger `patient_feedback_after_insert` che valorizza `patient_id`/`nutritionist_id` mancanti (link via `auth_user_id`) e crea una notifica di tipo `feedback_submitted`.
  - Client: hook `useNotifications`, componente `NotificationsBell` in sidebar con badge conteggio non lette e dialog con lista + link diretto al tab "Questionario" del paziente.
  - Fire-and-forget invoke di una Edge Function `notify-feedback` (facoltativa, canale email; il canale DB è sempre attivo).
- **Questionario accessibile dalla scheda paziente**: nuovo tab **Questionario** in `/pazienti/:id` con rendering read-only di tutte le risposte.
  Il parametro URL `?tab=questionario` viene rispettato, quindi cliccando sulla notifica il nutrizionista atterra direttamente sulla vista.
- **Release infrastructure minima**:
  - Questo `CHANGELOG.md` (Keep a Changelog + SemVer).
  - `docs/releases/v0.2.0.md` con le note di release complete.
  - Script `scripts/release-notes.mjs` (`npm run release:notes -- <vX.Y.Z>`) che crea lo scheletro delle note a partire dalla sezione `[Unreleased]`.

### Database
- Migrazione `008_feedback_and_meal_order.sql` applicata (in precedenza non eseguita).
- Nuova migrazione `009_bugfixes_and_notifications.sql` (idempotente):
  1. Backfill `patients.auth_user_id` via match email.
  2. Trigger `touch_conversation_on_message` su `messages` INSERT.
  3. Tabella `notifications` + RLS + indice.
  4. Trigger `on_patient_feedback_submitted` su `patient_feedback` INSERT.
  5. Policy RLS aggiuntiva `patient_feedback_nutritionist_via_patient` (fallback SELECT via `patient_id`).

## [0.1.0] — 2026-04-13

### Added
- MVP iniziale: auth, pazienti, misurazioni, piani alimentari, alimenti (CREA + Open Food Facts), generazione PDF, impostazioni.
- Modulo messaggistica e calendario appuntamenti.
- Portale paziente (appuntamenti, piano, messaggi, questionario).

[Unreleased]: https://github.com/nutriflow/nutriflow/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/nutriflow/nutriflow/releases/tag/v0.2.1
[0.2.0]: https://github.com/nutriflow/nutriflow/releases/tag/v0.2.0
[0.1.0]: https://github.com/nutriflow/nutriflow/releases/tag/v0.1.0
