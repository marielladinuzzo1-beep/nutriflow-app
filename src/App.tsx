import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { AppLayout } from '@/components/layout/AppLayout'

// Auth
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'

// Nutritionist pages
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { PatientsPage } from '@/pages/patients/PatientsPage'
import { PatientDetailPage } from '@/pages/patients/PatientDetailPage'
import { MeasurementsPage } from '@/pages/measurements/MeasurementsPage'
import { MealPlansPage } from '@/pages/meal-plans/MealPlansPage'
import { MealPlanDetailPage } from '@/pages/meal-plans/MealPlanDetailPage'
import { FoodsPage } from '@/pages/foods/FoodsPage'
import { PdfPage } from '@/pages/pdf/PdfPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { MessagesPage } from '@/pages/messages/MessagesPage'
import { AppointmentsPage } from '@/pages/appointments/AppointmentsPage'
import { MealTemplatesPage } from '@/pages/meal-templates/MealTemplatesPage'

// Patient portal
import { PatientOnboardingPage } from '@/pages/patient-portal/PatientOnboardingPage'
import { PatientPortalLayout } from '@/pages/patient-portal/PatientPortalLayout'
import { PatientAppointmentsPage } from '@/pages/patient-portal/PatientAppointmentsPage'
import { PatientMealPlanPage } from '@/pages/patient-portal/PatientMealPlanPage'
import { PatientMessagesPage } from '@/pages/patient-portal/PatientMessagesPage'
import { PatientFeedbackPage } from '@/pages/patient-portal/PatientFeedbackPage'

// ─── Route guards ─────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )
}

/** Only for nutritionist role. Patients are redirected to /portale. */
function NutritionistRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (profile?.role === 'patient') return <Navigate to="/portale/calendario" replace />
  return <>{children}</>
}

/** Only for patient role. Nutritionists are redirected to /dashboard. */
function PatientRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (profile && profile.role !== 'patient') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

/** Redirects authenticated users away from login/register. */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <Spinner />
  if (user) {
    if (profile?.role === 'patient') return <Navigate to="/portale/calendario" replace />
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/registrazione" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Patient onboarding (magic link landing) — handles auth state internally */}
        <Route path="/portale/onboarding" element={<PatientOnboardingPage />} />

        {/* Patient portal */}
        <Route
          path="/portale"
          element={<PatientRoute><PatientPortalLayout /></PatientRoute>}
        >
          <Route index element={<Navigate to="/portale/calendario" replace />} />
          <Route path="calendario" element={<PatientAppointmentsPage />} />
          <Route path="piano" element={<PatientMealPlanPage />} />
          <Route path="messaggi" element={<PatientMessagesPage />} />
          <Route path="feedback" element={<PatientFeedbackPage />} />
        </Route>

        {/* Nutritionist app */}
        <Route element={<NutritionistRoute><AppLayout /></NutritionistRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/pazienti" element={<PatientsPage />} />
          <Route path="/pazienti/:id" element={<PatientDetailPage />} />
          <Route path="/misurazioni" element={<MeasurementsPage />} />
          <Route path="/piani" element={<MealPlansPage />} />
          <Route path="/piani/:id" element={<MealPlanDetailPage />} />
          <Route path="/alimenti" element={<FoodsPage />} />
          <Route path="/pasti" element={<MealTemplatesPage />} />
          <Route path="/pdf" element={<PdfPage />} />
          <Route path="/impostazioni" element={<SettingsPage />} />
          <Route path="/messaggi" element={<MessagesPage />} />
          <Route path="/calendario" element={<AppointmentsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
