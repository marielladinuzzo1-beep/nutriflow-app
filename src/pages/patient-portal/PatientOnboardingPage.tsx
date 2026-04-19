import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Leaf, Loader2, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

function Spinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )
}

export function PatientOnboardingPage() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Detect expired/already-used magic link from URL hash or query params
  const linkError = useMemo(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const search = new URLSearchParams(window.location.search)
    const desc = hash.get('error_description') || search.get('error_description')
    const code = hash.get('error') || search.get('error')
    if (!code && !desc) return null
    return desc
      ? decodeURIComponent(desc.replace(/\+/g, ' '))
      : 'Il link di accesso non è valido o è già stato utilizzato.'
  }, [])

  // Already onboarded as patient → go straight to portal
  useEffect(() => {
    if (!loading && profile?.role === 'patient') {
      navigate('/portale/calendario', { replace: true })
    }
    // Nutritionist landed here → go to dashboard
    if (!loading && profile?.role === 'nutritionist') {
      navigate('/dashboard', { replace: true })
    }
  }, [loading, profile?.role])

  // Pre-fill name from existing profile
  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name)
    else if (user?.email) setFullName(user.email.split('@')[0])
  }, [profile?.full_name, user?.email])

  // Show expired/invalid link screen before auth check
  if (linkError && !loading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary mb-3">
              <Leaf className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold">NutriFlow</h1>
          </div>
          <Card>
            <CardContent className="pt-6 space-y-4 text-center">
              <div className="flex justify-center">
                <AlertTriangle className="h-10 w-10 text-amber-500" />
              </div>
              <h2 className="text-lg font-semibold">Link scaduto o già utilizzato</h2>
              <p className="text-sm text-muted-foreground">
                Il link di accesso è valido una sola volta e per un tempo limitato.
                Richiedine uno nuovo dalla pagina di accesso.
              </p>
              <Button asChild className="w-full">
                <Link to="/login">Torna alla pagina di accesso</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (loading) return <Spinner />

  // No session and no link error → redirect to login
  if (!user) {
    navigate('/login', { replace: true })
    return <Spinner />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError(null)
    try {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || user.email!,
          role: 'patient',
          gdpr_consent: true,
          gdpr_consent_date: new Date().toISOString(),
        })
        .eq('id', user.id)
        .neq('role', 'nutritionist') // guard: mai degradare un nutrizionista
      if (updateErr) throw updateErr

      // Link to the patients record by email (idempotent, self-healing)
      await (supabase as any).rpc('patient_self_link')

      // Full reload so useAuth re-fetches profile with the updated role
      window.location.replace('/portale/calendario')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il salvataggio')
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary mb-3">
            <Leaf className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold">NutriFlow</h1>
          <p className="text-muted-foreground mt-1">Benvenuto nel tuo portale paziente</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Completa il tuo profilo</CardTitle>
            <CardDescription>
              Conferma il tuo nome per accedere al portale ({user.email})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome completo</Label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Mario Rossi"
                  required
                />
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={saving}>
                {saving
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvataggio...</>
                  : 'Accedi al portale'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
