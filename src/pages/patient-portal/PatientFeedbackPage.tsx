import { useState } from 'react'
import { CheckCircle2, Loader2, ClipboardList } from 'lucide-react'
import { useMyPatientFeedback, useSubmitPatientFeedback } from '@/hooks/usePatientFeedback'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/toast'
import type { PatientFeedback } from '@/types'

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

// ─── Checkbox group ───────────────────────────────────────────────────────────

function CheckboxGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: string[]
  selected: string[]
  onChange: (vals: string[]) => void
}) {
  function toggle(opt: string) {
    if (selected.includes(opt)) {
      onChange(selected.filter(s => s !== opt))
    } else {
      onChange([...selected, opt])
    }
  }
  return (
    <Field label={label}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {options.map(opt => (
          <label key={opt} className="flex items-center gap-2.5 text-sm cursor-pointer rounded-md p-3 sm:p-2 hover:bg-muted/50 transition-colors">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => toggle(opt)}
              className="h-5 w-5 sm:h-4 sm:w-4 rounded border-input accent-primary shrink-0"
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    </Field>
  )
}

// ─── Radio group ──────────────────────────────────────────────────────────────

function RadioGroup({
  label,
  options,
  value,
  onChange,
  hint,
}: {
  label: string
  options: string[]
  value: string
  onChange: (v: string) => void
  hint?: string
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {options.map(opt => (
          <label key={opt} className={`flex items-center gap-1.5 text-sm cursor-pointer rounded-full px-4 py-2.5 sm:px-3 sm:py-1.5 border transition-colors ${
            value === opt ? 'border-primary bg-primary/8 text-primary font-medium' : 'border-border hover:bg-muted/50'
          }`}>
            <input type="radio" checked={value === opt} onChange={() => onChange(opt)} className="sr-only" />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    </Field>
  )
}

// ─── Read-only view ───────────────────────────────────────────────────────────

function FeedbackReadOnly({ fb }: { fb: PatientFeedback }) {
  const rows: Array<{ label: string; value?: string | number | boolean | string[] | null }> = [
    { label: 'Nome', value: [fb.first_name, fb.last_name].filter(Boolean).join(' ') },
    { label: 'Data di nascita', value: fb.date_of_birth },
    { label: 'Codice Fiscale', value: fb.fiscal_code },
    { label: 'Telefono', value: fb.phone },
    { label: 'Email', value: fb.email },
    { label: 'Sesso', value: fb.gender },
    { label: 'Altezza (m)', value: fb.height_m },
    { label: 'Peso (kg)', value: fb.weight_kg },
    { label: 'Come mi hai conosciuto', value: fb.referral_source },
    { label: 'Occupazione', value: fb.occupation },
    { label: 'Motivo della visita', value: fb.visit_reason },
    { label: 'Diete precedenti', value: fb.previous_diets },
    { label: 'Esito diete passate', value: fb.previous_diets_result },
    { label: 'Regime alimentare', value: fb.diet_type },
    { label: 'Qualità del sonno', value: fb.sleep_quality },
    { label: 'Ore di sonno', value: fb.sleep_hours },
    { label: 'Attività fisica', value: fb.physical_activity },
    { label: 'Condizioni attuali', value: fb.current_conditions?.join(', ') },
    { label: 'Altre condizioni', value: fb.other_conditions },
    { label: 'Patologie diagnosticate', value: fb.diagnosed_conditions?.join(', ') },
    { label: 'Assume farmaci', value: fb.takes_medications ? 'Sì' : 'No' },
    { label: 'Farmaci/integratori', value: fb.medications_list },
    { label: 'Allergie', value: fb.has_allergies },
    { label: 'Elenco allergie', value: fb.allergies_list },
    { label: 'Fumo', value: fb.smoking ? 'Sì' : 'No' },
    { label: 'Abitudini colazione', value: fb.breakfast_habits },
    { label: 'Abitudini pranzo', value: fb.lunch_habits },
    { label: 'Abitudini cena', value: fb.dinner_habits },
    { label: 'Alcol', value: fb.alcohol_consumption },
    { label: 'Accumulo grasso', value: fb.fat_distribution?.join(', ') },
    { label: 'Note aggiuntive', value: fb.additional_notes },
  ]

  const submittedDate = new Date(fb.submitted_at).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-green-800">Questionario inviato</p>
          <p className="text-xs text-green-700 mt-0.5">Compilato il {submittedDate}. Contatta il tuo nutrizionista per modifiche.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 divide-y divide-border/50">
          {rows.map(({ label, value }) => {
            if (!value && value !== 0) return null
            return (
              <div key={label} className="py-2.5 grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 text-sm">
                <span className="text-muted-foreground font-medium">{label}</span>
                <span className="break-words">{String(value)}</span>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const REFERRAL_OPTIONS = ['Passaparola/consiglio', 'Social', 'Evento o conferenza', 'Google/motore di ricerca', 'Sito web']
const SLEEP_QUALITY_OPTIONS = ['Buona', 'Discreta', 'Pessima']
const PREVIOUS_DIET_OPTIONS = ['No mai', 'Sì "fai da te"', 'Sì pianificata da specialista', 'Sì più di una']
const CURRENT_CONDITIONS = [
  'Alvo stitico', 'Reflusso gastroesofageo', 'Alvo diarroico', 'Gonfiore addominale',
  'Alvo alterno', 'Cistiti/candidosi', 'Aerofagia/meteorismo', 'Diverticolosi',
  'Difficoltà digestive', 'Dismenorrea/Amenorrea', 'Endometriosi',
]
const DIAGNOSED_CONDITIONS = [
  'Asma', 'Diabete tipo 1', 'Colon Irritabile', 'Ipertensione', 'Diabete tipo 2',
  'Problemi cutanei', 'Disturbi psichiatrici', 'Ipercolesterolemia', 'Ernia iatale',
  'Ipertrigliceridemia', 'Altro',
]
const ALLERGY_OPTIONS = ['Sì', 'No', 'Non ne sono sicuro']
const ALCOHOL_OPTIONS = ['Sì spesso', 'Durante il weekend', 'Saltuariamente', 'Mai']
const FAT_DISTRIBUTION_OPTIONS = ['Addome', 'Fianchi e glutei', 'Tutto il corpo', 'Non saprei']

type FormState = {
  first_name: string; last_name: string; referral_source: string
  date_of_birth: string; fiscal_code: string; phone: string; email: string
  gender: string; height_m: string; weight_kg: string
  occupation: string; visit_reason: string
  previous_diets: string; previous_diets_result: string; diet_type: string
  sleep_quality: string; sleep_hours: string; physical_activity: string
  current_conditions: string[]; other_conditions: string
  diagnosed_conditions: string[]
  takes_medications: string; medications_list: string
  has_allergies: string; allergies_list: string
  smoking: string
  breakfast_habits: string; lunch_habits: string; dinner_habits: string
  alcohol_consumption: string; fat_distribution: string[]
  additional_notes: string
}

const EMPTY: FormState = {
  first_name: '', last_name: '', referral_source: '',
  date_of_birth: '', fiscal_code: '', phone: '', email: '',
  gender: '', height_m: '', weight_kg: '',
  occupation: '', visit_reason: '',
  previous_diets: '', previous_diets_result: '', diet_type: '',
  sleep_quality: '', sleep_hours: '', physical_activity: '',
  current_conditions: [], other_conditions: '',
  diagnosed_conditions: [],
  takes_medications: '', medications_list: '',
  has_allergies: '', allergies_list: '',
  smoking: '',
  breakfast_habits: '', lunch_habits: '', dinner_habits: '',
  alcohol_consumption: '', fat_distribution: [],
  additional_notes: '',
}

export function PatientFeedbackPage() {
  const { profile } = useAuth()
  const { data: existing, isLoading } = useMyPatientFeedback()
  const submitFeedback = useSubmitPatientFeedback()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [submitted, setSubmitted] = useState(false)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) {
      toast.error('Profilo non caricato. Ricarica la pagina e riprova.')
      return
    }

    // Look up linked patient record + nutritionist_id (v0.2.0 fix: usa patient.nutritionist_id se profile.nutritionist_id manca)
    let patientId: string | undefined
    let nutritionistId: string | undefined = profile.nutritionist_id
    try {
      const { data: patientRecord } = await supabase
        .from('patients')
        .select('id, nutritionist_id')
        .eq('auth_user_id', profile.id)
        .maybeSingle()
      patientId = patientRecord?.id
      if (!nutritionistId) nutritionistId = patientRecord?.nutritionist_id
    } catch {
      // non-blocking
    }

    const payload: Omit<PatientFeedback, 'id' | 'submitted_at'> = {
      profile_id: profile.id,
      patient_id: patientId,
      nutritionist_id: nutritionistId,
      first_name: form.first_name || undefined,
      last_name: form.last_name || undefined,
      referral_source: form.referral_source || undefined,
      date_of_birth: form.date_of_birth || undefined,
      fiscal_code: form.fiscal_code || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      gender: form.gender || undefined,
      height_m: form.height_m ? parseFloat(form.height_m) : undefined,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : undefined,
      occupation: form.occupation || undefined,
      visit_reason: form.visit_reason || undefined,
      previous_diets: form.previous_diets || undefined,
      previous_diets_result: form.previous_diets_result || undefined,
      diet_type: form.diet_type || undefined,
      sleep_quality: form.sleep_quality || undefined,
      sleep_hours: form.sleep_hours ? parseFloat(form.sleep_hours) : undefined,
      physical_activity: form.physical_activity || undefined,
      current_conditions: form.current_conditions.length ? form.current_conditions : undefined,
      other_conditions: form.other_conditions || undefined,
      diagnosed_conditions: form.diagnosed_conditions.length ? form.diagnosed_conditions : undefined,
      takes_medications: form.takes_medications === 'Sì' ? true : form.takes_medications === 'No' ? false : undefined,
      medications_list: form.medications_list || undefined,
      has_allergies: form.has_allergies || undefined,
      allergies_list: form.allergies_list || undefined,
      smoking: form.smoking === 'Sì' ? true : form.smoking === 'No' ? false : undefined,
      breakfast_habits: form.breakfast_habits || undefined,
      lunch_habits: form.lunch_habits || undefined,
      dinner_habits: form.dinner_habits || undefined,
      alcohol_consumption: form.alcohol_consumption || undefined,
      fat_distribution: form.fat_distribution.length ? form.fat_distribution : undefined,
      additional_notes: form.additional_notes || undefined,
    }

    try {
      await submitFeedback.mutateAsync(payload)
      setSubmitted(true)
      toast.success('Questionario inviato con successo!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante l\'invio')
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }

  // Show read-only if already submitted (from DB) or just submitted in this session
  if ((existing && !submitted) || submitted) {
    const fb = submitted
      ? ({ ...form, id: '', profile_id: profile?.id ?? '', submitted_at: new Date().toISOString() } as unknown as PatientFeedback)
      : existing!
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Questionario anamnesi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Il tuo questionario è già stato inviato</p>
        </div>
        <FeedbackReadOnly fb={fb} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-[22px] font-semibold tracking-tight flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary shrink-0" />
          Questionario di prima anamnesi
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Compila il modulo ai fini della prima consulenza nutrizionale. I tuoi dati saranno visibili solo al tuo nutrizionista.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Anagrafica */}
        <Section title="Dati personali">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome">
              <Input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Mario" />
            </Field>
            <Field label="Cognome">
              <Input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Rossi" />
            </Field>
            <Field label="Data di nascita">
              <Input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
            </Field>
            <Field label="Codice Fiscale">
              <Input value={form.fiscal_code} onChange={e => set('fiscal_code', e.target.value.toUpperCase())} placeholder="RSSMRA..." />
            </Field>
            <Field label="Numero di telefono">
              <Input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+39 320 ..." />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="mario@esempio.it" />
            </Field>
            <Field label="Altezza (m)">
              <Input type="number" step="0.01" min="1" max="2.5" value={form.height_m}
                onChange={e => set('height_m', e.target.value)} placeholder="1.75" />
            </Field>
            <Field label="Peso attuale (kg)">
              <Input type="number" step="0.1" min="20" max="300" value={form.weight_kg}
                onChange={e => set('weight_kg', e.target.value)} placeholder="70" />
            </Field>
          </div>
          <RadioGroup label="Sesso" options={['Maschio', 'Femmina']} value={form.gender} onChange={v => set('gender', v)} />
          <RadioGroup
            label="Come hai conosciuto il tuo nutrizionista?"
            options={REFERRAL_OPTIONS}
            value={form.referral_source}
            onChange={v => set('referral_source', v)}
          />
        </Section>

        <Separator />

        {/* Motivazione */}
        <Section title="Motivazione e obiettivo">
          <Field label="Occupazione">
            <Input value={form.occupation} onChange={e => set('occupation', e.target.value)} placeholder="Es: impiegato, insegnante..." />
          </Field>
          <Field label="Motivo della visita">
            <Textarea value={form.visit_reason} onChange={e => set('visit_reason', e.target.value)} rows={3}
              placeholder="Perché hai scelto di consultare un nutrizionista?" />
          </Field>
        </Section>

        <Separator />

        {/* Diete precedenti */}
        <Section title="Diete precedenti">
          <RadioGroup
            label="Hai già seguito diete in passato?"
            options={PREVIOUS_DIET_OPTIONS}
            value={form.previous_diets}
            onChange={v => set('previous_diets', v)}
          />
          {form.previous_diets && form.previous_diets !== 'No mai' && (
            <Field label="Qual è stato l'esito?">
              <Input value={form.previous_diets_result} onChange={e => set('previous_diets_result', e.target.value)}
                placeholder="Es: ho perso 5 kg ma li ho ripresi..." />
            </Field>
          )}
          <Field label="Qual è il tuo attuale regime alimentare?">
            <Input value={form.diet_type} onChange={e => set('diet_type', e.target.value)}
              placeholder="Es: onnivoro, vegetariano, vegano, senza lattosio..." />
          </Field>
        </Section>

        <Separator />

        {/* Sonno e attività */}
        <Section title="Stile di vita">
          <RadioGroup
            label="Come definiresti la qualità del tuo sonno?"
            options={SLEEP_QUALITY_OPTIONS}
            value={form.sleep_quality}
            onChange={v => set('sleep_quality', v)}
          />
          <Field label="Quante ore dormi in media per notte?">
            <Input type="number" step="0.5" min="1" max="14" value={form.sleep_hours}
              onChange={e => set('sleep_hours', e.target.value)} placeholder="7.5" />
          </Field>
          <Field label="Pratichi attività fisica?" hint="Tipo, frequenza, intensità">
            <Textarea value={form.physical_activity} onChange={e => set('physical_activity', e.target.value)} rows={2}
              placeholder="Es: palestra 3 volte a settimana, camminata 30 min al giorno..." />
          </Field>
          <RadioGroup
            label="Hai l'abitudine al fumo?"
            options={['Sì', 'No']}
            value={form.smoking}
            onChange={v => set('smoking', v)}
          />
        </Section>

        <Separator />

        {/* Salute */}
        <Section title="Salute e patologie">
          <CheckboxGroup
            label="Seleziona le condizioni che ti caratterizzano"
            options={CURRENT_CONDITIONS}
            selected={form.current_conditions}
            onChange={v => set('current_conditions', v)}
          />
          <Field label="Altre condizioni (descrizione libera)">
            <Textarea value={form.other_conditions} onChange={e => set('other_conditions', e.target.value)} rows={2}
              placeholder="Descrivi eventuali altre condizioni..." />
          </Field>
          <CheckboxGroup
            label="Patologie diagnosticate"
            options={DIAGNOSED_CONDITIONS}
            selected={form.diagnosed_conditions}
            onChange={v => set('diagnosed_conditions', v)}
          />
          <RadioGroup
            label="Assumi attualmente farmaci e/o integratori?"
            options={['Sì', 'No']}
            value={form.takes_medications}
            onChange={v => set('takes_medications', v)}
          />
          {form.takes_medications === 'Sì' && (
            <Field label="Elenca farmaci/integratori">
              <Textarea value={form.medications_list} onChange={e => set('medications_list', e.target.value)} rows={2}
                placeholder="Es: Metformina 500mg, vitamina D 2000UI..." />
            </Field>
          )}
          <RadioGroup
            label="Soffri di allergie?"
            options={ALLERGY_OPTIONS}
            value={form.has_allergies}
            onChange={v => set('has_allergies', v)}
          />
          {form.has_allergies === 'Sì' && (
            <Field label="Elenca le allergie">
              <Textarea value={form.allergies_list} onChange={e => set('allergies_list', e.target.value)} rows={2}
                placeholder="Es: arachidi, nichel, lattosio..." />
            </Field>
          )}
        </Section>

        <Separator />

        {/* Abitudini alimentari */}
        <Section title="Abitudini alimentari">
          <Field label="Cosa sei solito fare a colazione?">
            <Textarea value={form.breakfast_habits} onChange={e => set('breakfast_habits', e.target.value)} rows={2}
              placeholder="Es: caffè e biscotti, latte e cereali..." />
          </Field>
          <Field label="Quali sono le tue abitudini a pranzo?">
            <Textarea value={form.lunch_habits} onChange={e => set('lunch_habits', e.target.value)} rows={2}
              placeholder="Es: pasto in ufficio, cucino a casa, panino..." />
          </Field>
          <Field label="Quali sono le tue abitudini a cena?">
            <Textarea value={form.dinner_habits} onChange={e => set('dinner_habits', e.target.value)} rows={2}
              placeholder="Es: pasto in famiglia, cucino sempre, take away..." />
          </Field>
          <RadioGroup
            label="Sei solito assumere bevande alcoliche?"
            options={ALCOHOL_OPTIONS}
            value={form.alcohol_consumption}
            onChange={v => set('alcohol_consumption', v)}
          />
          <CheckboxGroup
            label="Dove tendi ad accumulare grasso?"
            options={FAT_DISTRIBUTION_OPTIONS}
            selected={form.fat_distribution}
            onChange={v => set('fat_distribution', v)}
          />
        </Section>

        <Separator />

        {/* Note aggiuntive */}
        <Section title="Note aggiuntive">
          <Field label="Vuoi aggiungere qualcosa?" hint="Qualsiasi informazione ritieni utile per il tuo nutrizionista">
            <Textarea value={form.additional_notes} onChange={e => set('additional_notes', e.target.value)} rows={4}
              placeholder="Es: intolleranze non diagnosticate, preferenze alimentari, obiettivi specifici..." />
          </Field>
        </Section>

        <Button type="submit" size="lg" className="w-full" disabled={submitFeedback.isPending}>
          {submitFeedback.isPending
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Invio in corso...</>
            : 'Invia questionario'}
        </Button>
      </form>
    </div>
  )
}
