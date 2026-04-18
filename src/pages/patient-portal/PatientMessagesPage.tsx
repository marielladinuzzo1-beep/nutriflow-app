import { useState, useEffect, useRef } from 'react'
import { Send, Loader2, MessageSquare } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/toast'
import type { Message } from '@/types'

interface PatientConversation {
  id: string
  nutritionist_id: string
  patient_id: string
  last_message_at?: string
  nutritionist?: { full_name: string; email: string }
}

function useMyConversation() {
  return useQuery({
    queryKey: ['patient_conversation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*, nutritionist:profiles!conversations_nutritionist_id_fkey(full_name, email)')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as PatientConversation | null
    },
    staleTime: 30 * 1000,
  })
}

function useConvMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return []
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as Message[]
    },
    enabled: !!conversationId,
    refetchInterval: 8000,
  })
}

function useSendPatientMessage(conversationId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (content: string) => {
      if (!conversationId) throw new Error('Nessuna conversazione')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non autenticato')
      const { error } = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, sender_id: user.id, content })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', conversationId] })
      qc.invalidateQueries({ queryKey: ['patient_conversation'] })
    },
  })
}

export function PatientMessagesPage() {
  const { user } = useAuth()
  const { data: conversation, isLoading: convLoading } = useMyConversation()
  const { data: messages, isLoading: msgsLoading } = useConvMessages(conversation?.id)
  const sendMsg = useSendPatientMessage(conversation?.id)

  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    try {
      await sendMsg.mutateAsync(text.trim())
      setText('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nell\'invio')
    }
  }

  if (convLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">Messaggi</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          {conversation?.nutritionist
            ? `Conversazione con ${conversation.nutritionist.full_name}`
            : 'Messaggi col nutrizionista'}
        </p>
      </div>

      {!conversation ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 rounded-xl border border-dashed border-border text-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-[13px] text-muted-foreground">
            Nessuna conversazione avviata. Il tuo nutrizionista la aprirà per te.
          </p>
        </div>
      ) : (
        <div className="flex flex-col rounded-xl border border-border overflow-hidden bg-card" style={{ height: 'calc(100vh - 220px)' }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : messages?.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">Nessun messaggio ancora. Inizia la conversazione!</p>
            ) : (
              messages?.map(msg => {
                const isMe = msg.sender_id === user?.id
                return (
                  <div key={msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
                      isMe
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm'
                    )}>
                      <p className="break-words">{msg.content}</p>
                      <p className={cn(
                        'text-[10px] mt-1',
                        isMe ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground'
                      )}>
                        {new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="border-t border-border p-3 flex gap-2">
            <Input
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Scrivi un messaggio..."
              className="flex-1"
              disabled={sendMsg.isPending}
            />
            <Button type="submit" size="icon" disabled={!text.trim() || sendMsg.isPending}>
              {sendMsg.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
