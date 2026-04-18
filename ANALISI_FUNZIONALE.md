# NutriFlow — Analisi Funzionale
*Versione 1.0 — aprile 2026*
*Finalità: confronto con piano alimentare reale per ottimizzazione funzionale*

---

## 1. PANORAMICA GENERALE

NutriFlow è una web app per nutrizionisti italiani che copre l'intero ciclo di lavoro con i pazienti: dalla raccolta dati antropometrici alla costruzione dei piani alimentari, dalla comunicazione alla consegna in PDF.

**Stack tecnologico:** React + TypeScript + Vite, Supabase (database + auth), Tailwind CSS.  
**Modello utente:** due ruoli distinti — nutrizionista e paziente — con accesso separato e isolamento dei dati via RLS.  
**URL produzione:** `https://nutriflow-app-sigma.vercel.app`

---

## 2. MODULO AUTENTICAZIONE E RUOLI

### 2.1 Nutrizionista
- Registrazione con email + password; richiede consenso GDPR esplicito.
- Al login viene instradato su `/dashboard`.
- Può invitare i pazienti via magic link (email) o link WhatsApp.

### 2.2 Paziente
- Non si registra autonomamente: viene creato dal nutrizionista.
- Riceve un magic link via email che lo porta direttamente al portale (`/portale`), senza dover scegliere una password.
- Accesso in sola lettura ai propri dati (piano, appuntamenti, misurazioni).

### 2.3 Isolamento dati
- Ogni nutrizionista vede solo i propri pazienti, piani, misurazioni.
- Le policy Supabase (RLS) bloccano qualsiasi accesso cross-account a livello di database.

---

## 3. MODULO PAZIENTI

### 3.1 Anagrafica
Campi registrati per ogni paziente:

| Campo | Tipo | Note |
|-------|------|------|
| Nome, cognome | testo | obbligatori |
| Email | email | usata per magic link |
| Telefono | testo | usato per WhatsApp |
| Data di nascita | data | calcolo automatico età |
| Genere | M / F / altro | usato per calcolo BMR |
| Obiettivo | testo libero | non strutturato — ⚠️ vedi gap |
| Note | testo libero | campo generico |
| Stato | attivo / inattivo | filtro lista |
| Consenso GDPR | booleano + data | obbligatorio |

**Gap rilevati:**
- L'obiettivo è un campo testuale libero, non un valore selezionabile (perdita/mantenimento/aumento). Questo impedisce calcoli automatici coerenti.
- Non esiste un campo "patologie" o "intolleranze/allergie" strutturato.
- Non esiste un campo "livello di attività fisica" anagrafico (usato solo all'atto della creazione del piano).

### 3.2 Misurazioni antropometriche
Ogni misurazione è un record separato con data:

| Dato | Unità |
|------|-------|
| Peso | kg |
| Altezza | cm |
| BMI | calcolato automaticamente |
| % massa grassa | % |
| Massa muscolare | kg |
| Circonferenza vita | cm |
| Circonferenza fianchi | cm |
| Circonferenza braccio | cm |
| Note | testo |

Storico completo con grafico andamento peso nel tempo.

**Gap rilevati:**
- Non ci sono pliche cutanee (tricipite, bicipite, addome, coscia, sottoscapolare).
- Non c'è il rapporto vita/fianchi come dato calcolato e visualizzato.
- Non c'è la circonferenza torace o polpaccio.
- Il BMI è calcolato ma non viene mostrata la categoria (sottopeso/normopeso/sovrappeso/obeso) nella scheda misurazione.

### 3.3 Suggerimenti macro automatici (rule-based)
Il sistema calcola BMR (formula Mifflin-St Jeor), TDEE e distribuzione macro in base a:
- Peso, altezza, età, genere (da anagrafica + ultima misurazione)
- Obiettivo: perdita / mantenimento / aumento (selezionato al momento)
- Livello attività: sedentario / leggero / moderato / attivo / molto attivo

Output: kcal totali + grammi di proteine, carboidrati, grassi — copiabili nel form del piano.

**Gap:** il nutrizionista deve rieseguire il calcolo manualmente ogni volta; non viene aggiornato automaticamente quando cambiano le misurazioni.

---

## 4. MODULO PIANI ALIMENTARI *(sezione critica per il confronto)*

### 4.1 Struttura dati del piano

```
Piano alimentare
├── Nome, descrizione
├── Stato: bozza / attivo / completato / archiviato
├── Date inizio – fine
├── Target macronutrienti: kcal, proteine (g), carboidrati (g), grassi (g)
└── Giorni [1..N]
    ├── Numero giorno + etichetta (es. "Lunedì")
    └── Pasti del giorno
        ├── Colazione
        ├── Spuntino mattina
        ├── Pranzo
        ├── Spuntino pomeriggio
        └── Cena
            └── Alimenti [N]
                ├── Nome alimento
                ├── Quantità (g)
                └── Macros calcolati: kcal, proteine, carboidrati, grassi
```

### 4.2 Tipi di pasto supportati
L'app supporta esattamente 5 momenti pasto, con ordine fisso:

1. Colazione
2. Spuntino mattina
3. Pranzo
4. Spuntino pomeriggio
5. Cena

**Gap critici:**
- I nomi dei pasti sono hardcoded e non personalizzabili (es. non è possibile chiamarli diversamente o aggiungerne altri come "Pre-allenamento", "Post-allenamento", "Seconda colazione").
- Non esiste un campo "preparazione" o "ricetta" associato a un pasto o a un alimento.
- Non esiste la possibilità di raggruppare alimenti in ricette/preparazioni con nome proprio.

### 4.3 Struttura giornate
- I piani sono organizzati in giorni numerati (da 1 a N, max non definito).
- Ogni giorno ha un'etichetta libera (es. "Lunedì", "Giorno 1", "Giorno tipo").
- Non c'è distinzione tra giorni feriali / festivi / allenamento / riposo a livello strutturale.

**Gap:**
- Un piano con 7 giorni differenziati funziona bene; non c'è però un concetto di "settimana tipo" con rotazione automatica.
- Non esiste un "piano base" (giorno tipo da ripetere) vs "piano variante".

### 4.4 Database alimenti
Tre fonti:

| Fonte | Descrizione | Stato |
|-------|-------------|-------|
| Database CREA | ~50 alimenti italiani base, verificati | ✅ integrato |
| Open Food Facts | Ricerca libera, milioni di prodotti | ✅ integrato (ricerca) |
| Alimenti custom | Creati dal nutrizionista | ✅ funzionante |

Dati nutrizionali per 100g: kcal, proteine, carboidrati, grassi, fibra (opzionale), sodio (opzionale).

**Gap:**
- Il database CREA base è limitato (~50 voci). Mancano moltissimi alimenti italiani comuni.
- Non c'è un campo "porzione tipica" (es. 1 uovo ≈ 55g, 1 fetta pane ≈ 30g) che semplifichi l'inserimento.
- Non c'è distinzione tra carboidrati totali e zuccheri semplici.
- Non c'è il dato sull'indice glicemico.
- Open Food Facts spesso restituisce dati incompleti o inaffidabili per prodotti italiani.

### 4.5 Calcoli nutrizionali
- I macro vengono calcolati al momento dell'inserimento (`quantità × nutrienti/100g`).
- Il totale di ogni pasto e di ogni giorno è calcolato in tempo reale.
- Il confronto con i target (kcal/macro del piano) è visibile nella scheda piano.
- La distribuzione macro è espressa in grammi o percentuale (toggle).

**Gap:**
- Non c'è un semaforo visivo (verde/giallo/rosso) che indichi se il giorno è nei range target.
- Non c'è il calcolo del fabbisogno idrico.
- Non si distingue tra grassi saturi e insaturi.

### 4.6 Generazione automatica piano (AI rule-based)
Il sistema può generare automaticamente 7 giorni di piano basandosi su template italiani predefiniti, scalati sul target calorico del paziente.

**Come funziona:**
1. Si definiscono kcal target nel piano.
2. Si clicca "Genera contenuto".
3. Il sistema cerca nel DB gli alimenti del template per nome.
4. Se trovati, scala le quantità proporzionalmente.
5. Se non trovati, salta il pasto (senza avviso chiaro).

**Gap gravi:**
- I template sono hardcoded nel codice: non personalizzabili dal nutrizionista.
- La generazione sovrascrive i giorni esistenti senza conferma.
- Se un alimento del template non è nel DB, il pasto viene creato vuoto senza notifica.
- Non c'è memoria di stili alimentari per paziente (vegano, senza glutine, ecc.).

### 4.7 Export PDF
Il PDF include:
- Header con logo NutriFlow e nome del nutrizionista
- Anagrafica paziente
- Nome e descrizione del piano
- Target macro (4 box: kcal, P, C, F)
- Per ogni giorno: tutti i pasti con alimenti, quantità, macro per alimento
- Totale giornaliero
- Footer con nota GDPR e data

**Gap:**
- Non c'è uno spazio per note o consigli pratici per ogni giorno o pasto.
- Non ci sono indicazioni di preparazione o cottura.
- Non c'è un logo personalizzabile del nutrizionista.
- Il layout è fisso, non personalizzabile nell'impaginazione.

---

## 5. MODULO PORTALE PAZIENTE

Il paziente accede a `/portale` tramite magic link e trova:

### 5.1 Piano alimentare (read-only)
- Visualizza l'ultimo piano attivo o in bozza.
- Struttura accordion per giorno → pasto → alimenti.
- Per ogni alimento: nome, quantità in grammi, kcal.
- Totale per pasto e per giorno.

**Gap:**
- Il paziente non può annotare cosa ha effettivamente mangiato (diario alimentare).
- Non ci sono foto o descrizioni degli alimenti.
- Non c'è un campo "note nutrizionista" visibile al paziente per ogni giorno.
- Non c'è la possibilità di marcare un giorno come "completato".

### 5.2 Appuntamenti
- Lista appuntamenti futuri e passati.
- Dati: data, titolo, orario, note.
- Sola lettura: il paziente non può richiedere/spostare appuntamenti.

### 5.3 Messaggi
- Chat con il nutrizionista (testo semplice).
- Polling ogni 8 secondi (non real-time).

---

## 6. MODULO MESSAGGISTICA (nutrizionista)

- Una conversazione per paziente.
- Messaggi in ordine cronologico, con badge "non letti".
- Input testo + invio.
- Polling ogni 5 secondi.

**Gap:**
- Non c'è invio di file allegati (es. PDF, foto).
- Non c'è la lettura di ricevuta (il nutrizionista non sa se il paziente ha letto).
- Non c'è notifica push o email al paziente per nuovi messaggi.

---

## 7. MODULO APPUNTAMENTI (nutrizionista)

- Vista settimanale (lun–dom).
- Creazione appuntamento: paziente, titolo, data, ora inizio/fine, note.
- Modifica e cancellazione.

**Gap:**
- Non c'è integrazione con Google Calendar o Apple Calendar.
- Non c'è notifica/reminder automatica al paziente.
- Non c'è gestione della durata standard (es. visita = 60 min di default).
- Non c'è la distinzione tra tipo di visita (prima visita, follow-up, controllo).

---

## 8. CALCOLI NUTRIZIONALI — FORMULE IMPLEMENTATE

| Formula | Implementazione |
|---------|----------------|
| BMI | peso / (altezza_m²) |
| BMR | Mifflin-St Jeor (per genere M/F) |
| TDEE | BMR × coefficiente attività (1.2 – 1.9) |
| Macro da TDEE | Perdita: P 30%, C 40%, F 30% — Mantenimento: P 25%, C 50%, F 25% — Aumento: P 25%, C 55%, F 20% |
| Macro per porzione | (nutriente/100) × quantità_g |

---

## 9. TABELLA RIEPILOGATIVA GAP / OPPORTUNITÀ

### 9.1 Piano alimentare

| Area | Gap | Priorità |
|------|-----|----------|
| Struttura pasti | Nomi pasti fissi, non personalizzabili | 🔴 Alta |
| Struttura pasti | Nessun pasto "Pre/Post allenamento" | 🔴 Alta |
| Alimenti | Nessuna porzione tipica predefinita | 🔴 Alta |
| Alimenti | DB CREA troppo limitato | 🔴 Alta |
| Alimenti | Nessuna distinzione zuccheri/carboidrati complessi | 🟡 Media |
| Piano | Nessun campo note per giorno/pasto (visibile al paziente) | 🔴 Alta |
| Piano | Template generazione automatica non personalizzabili | 🟡 Media |
| Piano | Nessun concetto ricetta/preparazione | 🟡 Media |
| PDF | Nessuno spazio per note pratiche di preparazione | 🔴 Alta |
| PDF | Logo nutrizionista non personalizzabile | 🟡 Media |

### 9.2 Paziente

| Area | Gap | Priorità |
|------|-----|----------|
| Portale | Nessun diario alimentare (cosa ha mangiato realmente) | 🔴 Alta |
| Portale | Nessuna nota nutrizionista visibile per ogni giorno | 🔴 Alta |
| Portale | Nessuna foto/descrizione alimenti | 🟢 Bassa |
| Anagrafica | Nessun campo allergie/intolleranze strutturato | 🔴 Alta |
| Anagrafica | Nessun campo patologie rilevanti | 🔴 Alta |
| Obiettivo | Campo testuale, non strutturato | 🟡 Media |

### 9.3 Calcoli e dati

| Area | Gap | Priorità |
|------|-----|----------|
| Misurazioni | Nessuna plica cutanea | 🟡 Media |
| Misurazioni | Nessun rapporto vita/fianchi calcolato | 🟡 Media |
| Macro | Nessun semaforo visivo rispetto ai target | 🟡 Media |
| Macro | Nessuna distinzione grassi saturi/insaturi | 🟢 Bassa |
| Idratazione | Nessun calcolo fabbisogno idrico | 🟢 Bassa |

### 9.4 Workflow nutrizionista

| Area | Gap | Priorità |
|------|-----|----------|
| Comunicazione | Nessuna notifica al paziente per nuovi messaggi | 🟡 Media |
| Appuntamenti | Nessun tipo visita (prima visita / follow-up) | 🟡 Media |
| Impostazioni | Profilo non modificabile (nome, logo, dati studio) | 🟡 Media |
| Impostazioni | Nessuna personalizzazione del PDF (colori, logo) | 🟡 Media |

---

## 10. FLUSSO DI LAVORO ATTUALE — CREAZIONE PIANO

Il flusso attuale per costruire un piano da zero è:

```
1. Creare il paziente → inserire anagrafica
2. Aggiungere una misurazione → peso, altezza, composizione
3. Creare un piano → definire nome, date, target macro
   └─ Opzionale: usare suggerimento macro automatico (BMR/TDEE)
4. Aggiungere giorni al piano (1 per volta, con label)
5. Per ogni giorno, per ogni pasto:
   └─ Cercare alimento (DB locale o Open Food Facts)
   └─ Inserire quantità in grammi
   └─ Confermare → i macro vengono calcolati
6. Verificare totali giornalieri vs target
7. Esportare PDF
8. Inviare al paziente (magic link portale o PDF via email/WhatsApp)
```

**Criticità di questo flusso:**
- I passi 4–5 sono molto manuali e ripetitivi.
- Non c'è un modo rapido per duplicare un giorno o un pasto su più giorni.
- Non c'è un modo per salvare "combinazioni di pasto" riutilizzabili (es. "Colazione standard").
- La ricerca alimento durante la costruzione del piano è poco ergonomica (finestra modale separata).

---

## 11. DATI TECNICI RILEVANTI PER LA RISCRITTURA

### Database — tabelle principali
- `profiles` — nutrizionisti e pazienti (dopo magic link)
- `patients` — anagrafica pazienti del nutrizionista
- `measurements` — misurazioni nel tempo
- `foods` — database alimenti (verificati + custom)
- `meal_plans` — intestazione piano
- `meal_plan_days` — giorni del piano
- `meal_plan_items` — alimenti per pasto per giorno
- `appointments` — appuntamenti
- `conversations` + `messages` — messaggistica
- `todos` — task interni del nutrizionista

### Calcolo macro (formula attuale)
```
macro_porzione = (nutriente_per_100g / 100) × quantità_g
kcal = (proteine × 4) + (carboidrati × 4) + (grassi × 9)
```

### Enum pasti (hardcoded)
```
colazione | spuntino_mattina | pranzo | spuntino_pomeriggio | cena
```

### Stato piano (hardcoded)
```
draft | active | completed | archived
```

---

*Documento generato da analisi automatica del codice sorgente — aprile 2026*
*Da aggiornare dopo confronto con piano alimentare reale della nutrizionista*
