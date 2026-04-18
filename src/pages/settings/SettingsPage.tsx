import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateFull } from '@/lib/utils'
import { Shield, LogOut } from 'lucide-react'

export function SettingsPage() {
  const { profile, signOut } = useAuth()

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Impostazioni</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profilo</CardTitle>
          <CardDescription>Le tue informazioni professionali</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
              {profile?.full_name?.charAt(0) ?? '?'}
            </div>
            <div>
              <p className="font-semibold text-lg">{profile?.full_name}</p>
              <p className="text-muted-foreground text-sm">{profile?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Badge variant="secondary">Nutrizionista</Badge>
            {profile?.gdpr_consent && (
              <Badge variant="success" className="gap-1">
                <Shield className="h-3 w-3" />GDPR accettato
              </Badge>
            )}
          </div>
          {profile?.created_at && (
            <p className="text-xs text-muted-foreground">Account creato il {formatDateFull(profile.created_at)}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4" />Privacy e GDPR</CardTitle>
          <CardDescription>Conformità al Regolamento UE 2016/679</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            NutriFlow tratta i dati dei tuoi pazienti in qualità di Titolare del trattamento ai sensi del GDPR.
            I dati sono archiviati su infrastruttura Supabase (UE) con crittografia at-rest e in-transit.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Row Level Security (RLS) attiva su tutte le tabelle</li>
            <li>Accesso ai dati limitato al solo nutrizionista di riferimento</li>
            <li>Consenso GDPR paziente tracciato e datato</li>
            <li>Nessuna condivisione con terze parti</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Account</CardTitle></CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" />Esci dall'account
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
