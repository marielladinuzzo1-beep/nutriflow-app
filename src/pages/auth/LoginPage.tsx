import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Leaf, Loader2, Mail } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { loginSchema, type LoginFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function LoginPage() {
  const { signIn } = useAuth()
  const [error, setError] = useState<string | null>(null)

  // Patient magic-link state
  const [patientEmail, setPatientEmail] = useState('')
  const [patientLoading, setPatientLoading] = useState(false)
  const [patientSent, setPatientSent] = useState(false)
  const [patientError, setPatientError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormData) {
    setError(null)
    try {
      await signIn(data.email, data.password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credenziali non valide')
    }
  }

  async function sendPatientLink(e: React.FormEvent) {
    e.preventDefault()
    setPatientLoading(true)
    setPatientError(null)
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: patientEmail.trim(),
        options: {
          shouldCreateUser: false, // solo utenti già invitati dal nutrizionista
          emailRedirectTo: `${window.location.origin}/portale/onboarding`,
        },
      })
      // Mostra sempre successo per evitare enumerazione degli account
      const isUserNotFound = otpError?.message?.toLowerCase().includes('not found')
        || otpError?.message?.toLowerCase().includes('signup requires')
      if (otpError && !isUserNotFound) throw otpError
      setPatientSent(true)
    } catch (err) {
      setPatientError(err instanceof Error ? err.message : "Errore durante l'invio")
    } finally {
      setPatientLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="mb-2 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary mb-3">
            <Leaf className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold">NutriFlow</h1>
          <p className="text-muted-foreground mt-1">Gestione nutrizionistica professionale</p>
        </div>

        {/* Nutritionist login */}
        <Card>
          <CardHeader>
            <CardTitle>Accedi</CardTitle>
            <CardDescription>Per nutrizionisti — inserisci email e password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="nutrizionista@esempio.it" {...register('email')} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Accesso...</> : 'Accedi'}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Non hai un account?{' '}
              <Link to="/registrazione" className="text-primary font-medium hover:underline">
                Registrati
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* Patient magic-link login */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Sei un paziente?
            </CardTitle>
            <CardDescription>
              Inserisci la tua email per ricevere un link di accesso diretto — nessuna password richiesta
            </CardDescription>
          </CardHeader>
          <CardContent>
            {patientSent ? (
              <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-center space-y-1">
                <p className="text-sm font-semibold text-green-800">Controlla la tua email!</p>
                <p className="text-xs text-green-700">
                  Se hai un account paziente, hai ricevuto un link di accesso. Controlla anche la cartella spam.
                </p>
                <button
                  className="text-xs text-primary underline mt-1"
                  onClick={() => { setPatientSent(false); setPatientEmail('') }}
                >
                  Usa un'altra email
                </button>
              </div>
            ) : (
              <form onSubmit={sendPatientLink} className="space-y-3">
                <Input
                  type="email"
                  placeholder="la-tua-email@esempio.it"
                  value={patientEmail}
                  onChange={e => setPatientEmail(e.target.value)}
                  required
                />
                {patientError && (
                  <p className="text-xs text-destructive">{patientError}</p>
                )}
                <Button type="submit" variant="outline" className="w-full" disabled={patientLoading}>
                  {patientLoading
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Invio in corso...</>
                    : 'Ricevi link di accesso'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
