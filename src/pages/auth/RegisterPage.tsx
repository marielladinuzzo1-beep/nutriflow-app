import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Leaf, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { registerSchema, type RegisterFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function RegisterPage() {
  const { signUp } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit(data: RegisterFormData) {
    setError(null)
    try {
      await signUp(data.email, data.password, data.full_name)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante la registrazione')
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mx-auto">
              <Leaf className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold">Controlla la tua email!</h2>
            <p className="text-muted-foreground">
              Ti abbiamo inviato un link di conferma. Clicca sul link per attivare il tuo account NutriFlow.
            </p>
            <Link to="/login" className="text-primary font-medium hover:underline block">
              Torna al login
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary mb-3">
            <Leaf className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold">NutriFlow</h1>
          <p className="text-muted-foreground mt-1">Crea il tuo account professionale</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Registrazione</CardTitle>
            <CardDescription>Tutti i campi sono obbligatori</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome completo</Label>
                <Input id="full_name" placeholder="Dott. Mario Rossi" {...register('full_name')} />
                {errors.full_name && <p className="text-sm text-destructive">{errors.full_name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email professionale</Label>
                <Input id="email" type="email" placeholder="nutrizionista@esempio.it" {...register('email')} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Almeno 8 caratteri" {...register('password')} />
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Conferma password</Label>
                <Input id="confirmPassword" type="password" placeholder="Ripeti la password" {...register('confirmPassword')} />
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
              </div>

              <div className="flex items-start gap-2">
                <input type="checkbox" id="gdpr" {...register('gdpr_consent')} className="mt-1 h-4 w-4 rounded border-gray-300" />
                <Label htmlFor="gdpr" className="text-sm font-normal leading-snug cursor-pointer">
                  Acconsento al trattamento dei dati personali ai sensi del GDPR (Reg. UE 2016/679) e
                  del D.Lgs. 196/2003 come da{' '}
                  <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
                </Label>
              </div>
              {errors.gdpr_consent && <p className="text-sm text-destructive">{errors.gdpr_consent.message}</p>}

              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Registrazione...</> : 'Crea account'}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Hai già un account?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">Accedi</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
