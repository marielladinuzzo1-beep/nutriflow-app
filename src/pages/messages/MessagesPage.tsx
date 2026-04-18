import { useState, useEffect, useRef } from 'react'
import { Send, MessageSquare, Search, Plus, Loader2, ChevronLeft, Trash2, AlertTriangle } from 'lucide-react'
import {
  useConversations,
  useCreateConversation,
  useMessages,
  useSendMessage,
  useMarkConversationRead,
  useUnreadMessages,
  useDeleteConversation,
} from '@/hooks/useMessages'
import { usePatients } from '@/hooks/usePatients'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn, formatDate } from '@/lib/utils'
import { toast } from '@/components/ui/toast'
import type { Conversation } from '@/types'

// ─── New conversation dialog ──────────────────────────────────────────────────

function NewConversationDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (conv: Conversation) => void
}) {
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const { data: patients } = usePatients()
  const createConversation = useCreateConversation()

  async function handleCreate() {
    if (!selectedPatientId) return
    try {
      const conv = await createConversation.mutateAsync(selectedPatientId)
      onCreated(conv)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nella creazione della conversazione')
    }
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Nuova conversazione</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
            <SelectTrigger><SelectValue placeholder="Seleziona un paziente..." /></SelectTrigger>
            <SelectContent>
              {patients?.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button disabled={!selectedPatientId || createConversation.isPending} onClick={handleCreate}>
            {createConversation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Apri chat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Conversation list item ───────────────────────────────────────────────────

function ConversationItem({
  conv,
  isActive,
  unreadCount,
  onClick,
  onDelete,
}: {
  conv: Conversation
  isActive: boolean
  unreadCount: number
  onClick: () => void
  onDelete: () => void
}) {
  const patientName = conv.patient
    ? `${conv.patient.first_name} ${conv.patient.last_name}`
    : 'Paziente sconosciuto'
  const initials = conv.patient
    ? `${conv.patient.first_name[0]}${conv.patient.last_name[0]}`
    : '?'

  return (
    <div className="group relative">
      <button
        onClick={onClick}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-3 pr-9 rounded-lg text-left transition-colors',
          isActive ? 'bg-primary/10' : 'hover:bg-muted'
        )}
      >
        <div className="relative flex-shrink-0">
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold',
            isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}>
            {initials}
          </div>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className={cn('text-sm font-medium truncate', unreadCount > 0 && 'font-semibold')}>{patientName}</p>
            {conv.last_message_at && (
              <span className="text-[10px] text-muted-foreground ml-2 shrink-0">{formatDate(conv.last_message_at)}</span>
            )}
          </div>
          {conv.last_message_preview && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message_preview}</p>
          )}
        </div>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
        title="Elimina conversazione"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ─── Chat panel ───────────────────────────────────────────────────────────────

function ChatPanel({
  conv,
  onBack,
}: {
  conv: Conversation
  onBack: () => void
}) {
  const { user } = useAuth()
  const { data: messages, isLoading } = useMessages(conv.id)
  const sendMessage = useSendMessage()
  const markRead = useMarkConversationRead()
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const patientName = conv.patient
    ? `${conv.patient.first_name} ${conv.patient.last_name}`
    : 'Paziente'

  // Mark as read when opening conversation
  useEffect(() => {
    if (conv.id && user?.id) {
      markRead.mutate({ conversationId: conv.id, userId: user.id })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv.id, user?.id])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const trimmed = text.trim()
    if (!trimmed) return
    setText('')
    try {
      await sendMessage.mutateAsync({ conversationId: conv.id, content: trimmed })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nel invio del messaggio')
      setText(trimmed) // restore
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card shrink-0">
        <button
          onClick={onBack}
          className="md:hidden p-1 rounded-md hover:bg-muted transition-colors"
          title="Indietro"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
          {conv.patient ? `${conv.patient.first_name[0]}${conv.patient.last_name[0]}` : '?'}
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight">{patientName}</p>
          {conv.patient?.email && (
            <p className="text-xs text-muted-foreground">{conv.patient.email}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : messages?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nessun messaggio ancora.<br />Inizia la conversazione!</p>
          </div>
        ) : (
          messages?.map(msg => {
            const isOwn = msg.sender_id === user?.id
            return (
              <div key={msg.id} className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[70%] rounded-2xl px-4 py-2 text-sm',
                    isOwn
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className={cn('text-[10px] mt-1 flex items-center gap-1', isOwn ? 'text-primary-foreground/70 justify-end' : 'text-muted-foreground')}>
                    {new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    {isOwn && (
                      <span title={msg.is_read ? 'Letto' : 'Inviato'}>
                        {msg.is_read ? '✓✓' : '✓'}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t bg-card shrink-0">
        <div className="flex items-center gap-2">
          <Input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scrivi un messaggio..."
            className="flex-1"
            disabled={sendMessage.isPending}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!text.trim() || sendMessage.isPending}
          >
            {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function MessagesPage() {
  const [search, setSearch] = useState('')
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [newConvOpen, setNewConvOpen] = useState(false)
  const [confirmDeleteConv, setConfirmDeleteConv] = useState<Conversation | null>(null)

  const { data: conversations, isLoading } = useConversations()
  const { data: unread } = useUnreadMessages()
  const deleteConversation = useDeleteConversation()

  async function handleDeleteConversation() {
    if (!confirmDeleteConv) return
    try {
      await deleteConversation.mutateAsync(confirmDeleteConv.id)
      if (activeConv?.id === confirmDeleteConv.id) setActiveConv(null)
      setConfirmDeleteConv(null)
      toast.success('Conversazione eliminata')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante l\'eliminazione')
    }
  }

  // Count unread per conversation
  const unreadByConv: Record<string, number> = {}
  unread?.forEach(u => {
    unreadByConv[u.conversation_id] = (unreadByConv[u.conversation_id] ?? 0) + 1
  })

  const filtered = conversations?.filter(c => {
    if (!search) return true
    const name = c.patient ? `${c.patient.first_name} ${c.patient.last_name}` : ''
    return name.toLowerCase().includes(search.toLowerCase())
  }) ?? []

  return (
    <div className="flex h-[calc(100vh-4rem)] -mx-6 -my-6 overflow-hidden">
      {/* ── Conversation list ── */}
      <div className={cn(
        'flex flex-col w-full md:w-72 lg:w-80 shrink-0 border-r bg-card',
        activeConv && 'hidden md:flex'
      )}>
        {/* Header */}
        <div className="px-4 py-3 border-b space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold">Messaggi</h1>
            <Button size="sm" variant="outline" onClick={() => setNewConvOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />Nuova
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder="Cerca paziente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {search ? 'Nessun risultato' : 'Nessuna conversazione.\nCrea una nuova chat con un paziente.'}
              </p>
              {!search && (
                <Button size="sm" variant="outline" onClick={() => setNewConvOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Inizia una chat
                </Button>
              )}
            </div>
          ) : (
            filtered.map(conv => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isActive={activeConv?.id === conv.id}
                unreadCount={unreadByConv[conv.id] ?? 0}
                onClick={() => setActiveConv(conv)}
                onDelete={() => setConfirmDeleteConv(conv)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Chat panel ── */}
      <div className={cn(
        'flex-1 flex flex-col',
        !activeConv && 'hidden md:flex'
      )}>
        {activeConv ? (
          <ChatPanel
            key={activeConv.id}
            conv={activeConv}
            onBack={() => setActiveConv(null)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center px-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground/20" />
            <p className="text-muted-foreground text-sm">Seleziona una conversazione dalla lista<br />oppure crea una nuova chat.</p>
            <Button variant="outline" size="sm" onClick={() => setNewConvOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />Nuova conversazione
            </Button>
          </div>
        )}
      </div>

      {/* New conversation dialog */}
      {newConvOpen && (
        <NewConversationDialog
          onClose={() => setNewConvOpen(false)}
          onCreated={(conv) => setActiveConv(conv)}
        />
      )}

      {/* Confirm delete conversation */}
      <Dialog open={!!confirmDeleteConv} onOpenChange={(v) => { if (!v) setConfirmDeleteConv(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />Elimina conversazione
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Eliminare la chat con <strong>
              {confirmDeleteConv?.patient
                ? `${confirmDeleteConv.patient.first_name} ${confirmDeleteConv.patient.last_name}`
                : 'questo paziente'}
            </strong>? Tutti i messaggi saranno rimossi definitivamente.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDeleteConv(null)}>Annulla</Button>
            <Button
              variant="destructive"
              disabled={deleteConversation.isPending}
              onClick={handleDeleteConversation}
            >
              {deleteConversation.isPending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Eliminazione...</>
                : <><Trash2 className="mr-2 h-4 w-4" />Elimina</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
