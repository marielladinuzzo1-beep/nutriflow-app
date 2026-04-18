/**
 * NutriFlow — Edge Function: notify-message
 * Inviata da useSendMessage() dopo ogni messaggio del nutrizionista.
 * Richiede RESEND_API_KEY come secret Supabase:
 *   supabase secrets set RESEND_API_KEY=re_xxxx
 * Deploy:
 *   supabase functions deploy notify-message --no-verify-jwt
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  const { conversation_id, sender_name, preview } = await req.json() as {
    conversation_id: string
    sender_name: string
    preview: string
  }

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ skipped: 'no RESEND_API_KEY' }), { status: 200 })
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Fetch conversation + patient email
  const { data: conv } = await sb
    .from('conversations')
    .select('patient_id, patients(email, first_name)')
    .eq('id', conversation_id)
    .single()

  const patient = (conv as { patients?: { email?: string; first_name?: string } })?.patients
  if (!patient?.email) return new Response(JSON.stringify({ skipped: 'no patient email' }), { status: 200 })

  const emailBody = {
    from: 'NutriFlow <noreply@nutriflow.app>',
    to: [patient.email],
    subject: `Nuovo messaggio da ${sender_name}`,
    html: `<p>Ciao ${patient.first_name ?? ''},</p>
<p>${sender_name} ti ha inviato un messaggio:</p>
<blockquote style="border-left:3px solid #16a34a;padding:8px 12px;color:#555">${preview}</blockquote>
<p><a href="https://nutriflow-app-sigma.vercel.app/portale/messaggi" style="color:#16a34a">Rispondi nel portale NutriFlow</a></p>`,
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(emailBody),
  })

  return new Response(JSON.stringify({ ok: res.ok, status: res.status }), { status: 200 })
})
