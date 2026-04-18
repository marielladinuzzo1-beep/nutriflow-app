import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { MealPlan, Patient } from '@/types'

// ─── Styles ───────────────────────────────────────────────────────────────────

const COLOR = {
  primary: '#16a34a',
  primaryLight: '#dcfce7',
  text: '#111827',
  muted: '#6b7280',
  border: '#e5e7eb',
  white: '#ffffff',
  blue: '#2563eb',
  amber: '#d97706',
  amberLight: '#fffbeb',
  blueLight: '#eff6ff',
  rose: '#e11d48',
  bg: '#f9fafb',
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: COLOR.text,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
    backgroundColor: COLOR.white,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: COLOR.primary,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBox: {
    width: 32,
    height: 32,
    backgroundColor: COLOR.primary,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: COLOR.white, fontSize: 16, fontFamily: 'Helvetica-Bold' },
  brandName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: COLOR.primary },
  brandSub: { fontSize: 8, color: COLOR.muted },
  headerDate: { fontSize: 8, color: COLOR.muted, textAlign: 'right' },
  // Patient info
  patientCard: {
    backgroundColor: COLOR.primaryLight,
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  patientLabel: { fontSize: 7, color: COLOR.muted, marginBottom: 2 },
  patientValue: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  // Plan info
  planTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  planMeta: { fontSize: 8, color: COLOR.muted, marginBottom: 16 },
  // Macro targets
  macroRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  macroCard: {
    flex: 1,
    backgroundColor: COLOR.bg,
    borderRadius: 5,
    padding: 8,
    borderWidth: 1,
    borderColor: COLOR.border,
    alignItems: 'center',
  },
  macroLabel: { fontSize: 7, color: COLOR.muted, marginBottom: 2 },
  macroValue: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
  // Narrative sections
  narrativeBox: {
    borderRadius: 5,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
  },
  narrativeLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', marginBottom: 4, textTransform: 'uppercase' },
  narrativeText: { fontSize: 9, lineHeight: 1.5 },
  // Day
  dayHeader: {
    backgroundColor: COLOR.primary,
    borderRadius: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 8,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayTitle: { color: COLOR.white, fontFamily: 'Helvetica-Bold', fontSize: 10 },
  dayTotals: { color: COLOR.white, fontSize: 8, opacity: 0.9 },
  // Free day
  freeDayBox: {
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: 5,
    borderStyle: 'dashed',
    padding: 14,
    marginBottom: 8,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  freeDayLabel: { fontSize: 9, color: COLOR.muted, fontFamily: 'Helvetica-Bold' },
  freeDayNote: { fontSize: 8, color: COLOR.muted, marginTop: 3 },
  // Meal group
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: COLOR.bg,
    borderRadius: 4,
    marginBottom: 3,
    borderLeftWidth: 3,
    borderLeftColor: COLOR.primary,
  },
  mealTitle: { fontFamily: 'Helvetica-Bold', fontSize: 9 },
  mealKcal: { color: COLOR.muted, fontSize: 8 },
  // Food item row
  foodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.border,
  },
  foodName: { flex: 2 },
  foodQty: { flex: 1, textAlign: 'center', color: COLOR.muted },
  foodKcal: { flex: 1, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  foodMacro: { flex: 3, textAlign: 'right', color: COLOR.muted },
  // Column headers
  colHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
    paddingHorizontal: 10,
    marginBottom: 2,
  },
  colHeaderText: { fontSize: 7, color: COLOR.muted, fontFamily: 'Helvetica-Bold' },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLOR.border,
    paddingTop: 8,
  },
  footerText: { fontSize: 7, color: COLOR.muted },
  pageNum: { fontSize: 7, color: COLOR.muted },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MEAL_LEGACY_LABELS: Record<string, string> = {
  colazione: 'Colazione',
  spuntino_mattina: 'Spuntino mattina',
  pranzo: 'Pranzo',
  spuntino_pomeriggio: 'Spuntino pomeriggio',
  cena: 'Cena',
}

const MEAL_SORT_ORDER: Record<string, number> = {
  colazione: 0,
  breakfast: 0,
  'spuntino mattina': 10,
  spuntino_mattina: 10,
  pranzo: 20,
  lunch: 20,
  'spuntino pomeriggio': 30,
  spuntino_pomeriggio: 30,
  cena: 40,
  dinner: 40,
}

function getMealLabel(mealType: string): string {
  return MEAL_LEGACY_LABELS[mealType] ?? mealType
}

function getDayMealTypes(items: { meal_type: string; sort_order?: number }[]): string[] {
  const seen = new Set<string>()
  const order: string[] = []
  for (const item of [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))) {
    if (!seen.has(item.meal_type)) {
      seen.add(item.meal_type)
      order.push(item.meal_type)
    }
  }
  return [...order].sort((a, b) => {
    const oa = MEAL_SORT_ORDER[a.toLowerCase()] ?? 50
    const ob = MEAL_SORT_ORDER[b.toLowerCase()] ?? 50
    return oa - ob
  })
}

function formatDateIT(dateStr?: string | null) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function calcAge(dob?: string | null) {
  if (!dob) return null
  const today = new Date()
  const birth = new Date(dob)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

// ─── PDF Component ────────────────────────────────────────────────────────────

interface MealPlanPDFProps {
  plan: MealPlan
  patient?: Patient
  nutritionistName?: string
}

export function MealPlanPDF({ plan, patient, nutritionistName }: MealPlanPDFProps) {
  const today = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
  const age = patient ? calcAge(patient.date_of_birth) : null
  const sortedDays = [...(plan.days ?? [])].sort((a, b) => a.day_number - b.day_number)

  return (
    <Document
      title={`Piano alimentare — ${plan.name}`}
      author={nutritionistName ?? 'NutriFlow'}
      subject={`Piano alimentare per ${patient ? `${patient.first_name} ${patient.last_name}` : 'paziente'}`}
    >
      {sortedDays.length === 0 ? (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.logoBox}><Text style={styles.logoText}>N</Text></View>
              <View>
                <Text style={styles.brandName}>NutriFlow</Text>
                <Text style={styles.brandSub}>Gestione nutrizionistica professionale</Text>
              </View>
            </View>
            <Text style={styles.headerDate}>Generato il {today}</Text>
          </View>
          <Text style={styles.planTitle}>{plan.name}</Text>
          <Text style={styles.planMeta}>Il piano non contiene giorni. Aggiungi giorni e alimenti nel builder.</Text>
        </Page>
      ) : (
        sortedDays.map((day, dayIndex) => {
          const allItems = day.items ?? []
          const isFreeDay = (day as { is_free_day?: boolean }).is_free_day
          const dailyNote = (day as { daily_note?: string }).daily_note
          const totalKcal = allItems.reduce((s, i) => s + i.kcal, 0)
          const totalP = allItems.reduce((s, i) => s + i.protein_g, 0)
          const totalC = allItems.reduce((s, i) => s + i.carbs_g, 0)
          const totalF = allItems.reduce((s, i) => s + i.fat_g, 0)
          const mealTypes = getDayMealTypes(allItems)

          return (
            <Page key={day.id} size="A4" style={styles.page}>
              {/* Header */}
              <View style={styles.header} fixed>
                <View style={styles.headerLeft}>
                  <View style={styles.logoBox}><Text style={styles.logoText}>N</Text></View>
                  <View>
                    <Text style={styles.brandName}>NutriFlow</Text>
                    <Text style={styles.brandSub}>Gestione nutrizionistica professionale</Text>
                  </View>
                </View>
                <Text style={styles.headerDate}>Generato il {today}{nutritionistName ? `\nDott. ${nutritionistName}` : ''}</Text>
              </View>

              {/* First-page info: patient, macro targets, narrative sections */}
              {dayIndex === 0 && (
                <>
                  {patient && (
                    <View style={styles.patientCard}>
                      <View>
                        <Text style={styles.patientLabel}>PAZIENTE</Text>
                        <Text style={styles.patientValue}>{patient.first_name} {patient.last_name}</Text>
                        {age && <Text style={{ fontSize: 8, color: COLOR.muted, marginTop: 2 }}>{age} anni{patient.gender === 'M' ? ' • Uomo' : patient.gender === 'F' ? ' • Donna' : ''}</Text>}
                      </View>
                      <View>
                        <Text style={styles.patientLabel}>PIANO ALIMENTARE</Text>
                        <Text style={styles.patientValue}>{plan.name}</Text>
                        {plan.start_date && (
                          <Text style={{ fontSize: 8, color: COLOR.muted, marginTop: 2 }}>
                            Dal {formatDateIT(plan.start_date)}{plan.end_date ? ` al ${formatDateIT(plan.end_date)}` : ''}
                          </Text>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Macro targets */}
                  {plan.target_kcal && (
                    <View style={styles.macroRow}>
                      <View style={styles.macroCard}>
                        <Text style={styles.macroLabel}>TARGET CALORICO</Text>
                        <Text style={[styles.macroValue, { color: COLOR.primary }]}>{plan.target_kcal} kcal</Text>
                      </View>
                      <View style={styles.macroCard}>
                        <Text style={styles.macroLabel}>PROTEINE</Text>
                        <Text style={[styles.macroValue, { color: COLOR.blue }]}>{plan.target_protein_g ?? '—'} g</Text>
                      </View>
                      <View style={styles.macroCard}>
                        <Text style={styles.macroLabel}>CARBOIDRATI</Text>
                        <Text style={[styles.macroValue, { color: COLOR.amber }]}>{plan.target_carbs_g ?? '—'} g</Text>
                      </View>
                      <View style={styles.macroCard}>
                        <Text style={styles.macroLabel}>GRASSI</Text>
                        <Text style={[styles.macroValue, { color: COLOR.rose }]}>{plan.target_fat_g ?? '—'} g</Text>
                      </View>
                    </View>
                  )}

                  {/* Considerazioni */}
                  {plan.considerations && (
                    <View style={[styles.narrativeBox, { backgroundColor: COLOR.blueLight, borderColor: '#bfdbfe' }]}>
                      <Text style={[styles.narrativeLabel, { color: '#1d4ed8' }]}>Considerazioni e caratteristiche della dieta</Text>
                      <Text style={styles.narrativeText}>{plan.considerations}</Text>
                    </View>
                  )}

                  {/* Da consumare in giornata */}
                  {plan.daily_extras && (
                    <View style={[styles.narrativeBox, { backgroundColor: COLOR.amberLight, borderColor: '#fcd34d' }]}>
                      <Text style={[styles.narrativeLabel, { color: COLOR.amber }]}>Da consumare in giornata</Text>
                      <Text style={styles.narrativeText}>{plan.daily_extras}</Text>
                    </View>
                  )}
                </>
              )}

              {/* Day header or free day */}
              {isFreeDay ? (
                <View style={styles.freeDayBox}>
                  <View>
                    <Text style={styles.freeDayLabel}>{day.day_label ?? `Giorno ${day.day_number}`} — Giorno libero</Text>
                    {dailyNote && <Text style={styles.freeDayNote}>{dailyNote}</Text>}
                  </View>
                  {plan.daily_extras && (
                    <Text style={{ fontSize: 8, color: COLOR.amber, maxWidth: 200 }}>
                      Ricorda: {plan.daily_extras}
                    </Text>
                  )}
                </View>
              ) : (
                <>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayTitle}>{day.day_label ?? `Giorno ${day.day_number}`}</Text>
                    {allItems.length > 0 && (
                      <Text style={styles.dayTotals}>
                        Totale: {Math.round(totalKcal)} kcal • P: {totalP.toFixed(0)}g • C: {totalC.toFixed(0)}g • G: {totalF.toFixed(0)}g
                      </Text>
                    )}
                  </View>
                  {dailyNote && (
                    <Text style={{ fontSize: 8, color: COLOR.muted, marginBottom: 6 }}>{dailyNote}</Text>
                  )}

                  {/* Meals */}
                  {mealTypes.map(mealType => {
                    const items = allItems.filter(i => i.meal_type === mealType)
                    if (!items.length) return null
                    const mealKcal = items.reduce((s, i) => s + i.kcal, 0)
                    const mealP = items.reduce((s, i) => s + i.protein_g, 0)
                    const mealC = items.reduce((s, i) => s + i.carbs_g, 0)
                    const mealF = items.reduce((s, i) => s + i.fat_g, 0)

                    return (
                      <View key={mealType} style={{ marginBottom: 10 }}>
                        <View style={styles.mealHeader}>
                          <Text style={styles.mealTitle}>{getMealLabel(mealType)}</Text>
                          <Text style={styles.mealKcal}>
                            {Math.round(mealKcal)} kcal • P:{mealP.toFixed(0)}g C:{mealC.toFixed(0)}g G:{mealF.toFixed(0)}g
                          </Text>
                        </View>
                        <View style={styles.colHeader}>
                          <Text style={[styles.colHeaderText, { flex: 2 }]}>ALIMENTO</Text>
                          <Text style={[styles.colHeaderText, { flex: 1, textAlign: 'center' }]}>QUANTITÀ</Text>
                          <Text style={[styles.colHeaderText, { flex: 1, textAlign: 'right' }]}>KCAL</Text>
                          <Text style={[styles.colHeaderText, { flex: 3, textAlign: 'right' }]}>P / C / G</Text>
                        </View>
                        {items.map(item => {
                          const qtyMax = (item as { quantity_max_g?: number }).quantity_max_g
                          return (
                            <View key={item.id} style={styles.foodRow}>
                              <Text style={styles.foodName}>{item.food?.name ?? 'Alimento'}</Text>
                              <Text style={styles.foodQty}>
                                {item.quantity_g}{qtyMax ? `–${qtyMax}` : ''} g
                              </Text>
                              <Text style={styles.foodKcal}>{Math.round(item.kcal)}</Text>
                              <Text style={styles.foodMacro}>
                                {item.protein_g.toFixed(1)}g / {item.carbs_g.toFixed(1)}g / {item.fat_g.toFixed(1)}g
                              </Text>
                            </View>
                          )
                        })}
                      </View>
                    )
                  })}

                  {allItems.length === 0 && (
                    <Text style={{ color: COLOR.muted, fontSize: 8, textAlign: 'center', marginTop: 8 }}>
                      Nessun alimento inserito per questo giorno
                    </Text>
                  )}
                </>
              )}

              {/* Consigli pratici — shown on last page */}
              {dayIndex === sortedDays.length - 1 && plan.practical_advice && (
                <View style={[styles.narrativeBox, { backgroundColor: COLOR.bg, borderColor: COLOR.border, marginTop: 16 }]}>
                  <Text style={[styles.narrativeLabel, { color: COLOR.muted }]}>Consigli pratici</Text>
                  <Text style={styles.narrativeText}>{plan.practical_advice}</Text>
                </View>
              )}

              {/* Footer */}
              <View style={styles.footer} fixed>
                <Text style={styles.footerText}>
                  NutriFlow • I dati contenuti in questo documento sono soggetti al GDPR (UE 2016/679) e sono riservati
                </Text>
                <Text style={styles.pageNum} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
              </View>
            </Page>
          )
        })
      )}
    </Document>
  )
}
