import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Conversation, Message } from '@/types'

// ─── Conversations ────────────────────────────────────────────────────────────

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*, patient:patients(id, first_name, last_name, email)')
        .order('updated_at', { ascending: false })
      if (error) throw new Error(error.message ?? String(error))
      return data as Conversation[]
    },
    staleTime: 30 * 1000,
  })
}

export function useCreateConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patientId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non autenticato')

      // Check if a conversation with this patient already exists
      const { data: existing, error: selectError } = await supabase
        .from('conversations')
        .select('*, patient:patients(id, first_name, last_name, email)')
        .eq('nutritionist_id', user.id)
        .eq('patient_id', patientId)
        .maybeSingle()
      if (selectError) throw new Error(selectError.message ?? String(selectError))
      if (existing) return existing as Conversation

      // Create new conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert({ nutritionist_id: user.id, patient_id: patientId })
        .select('*, patient:patients(id, first_name, last_name, email)')
        .single()
      if (error) throw new Error(error.message ?? String(error))
      return data as Conversation
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  })
}

// ─── Messages ────────────────────────────────────────────────────────────────

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [] as Message[]
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      if (error) throw new Error(error.message ?? String(error))
      return data as Message[]
    },
    enabled: !!conversationId,
    refetchInterval: 5000, // lightweight polling — replace with Realtime if needed
  })
}

export function useSendMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non autenticato')

      const trimmed = content.trim()
      if (!trimmed) throw new Error('Messaggio vuoto')

      // Insert message (own messages are auto read)
      const { data, error } = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, sender_id: user.id, content: trimmed, is_read: true })
        .select()
        .single()
      if (error) throw new Error(error.message ?? String(error))

      // Update conversation preview
      await supabase
        .from('conversations')
        .update({
          last_message_at: data.created_at,
          last_message_preview: trimmed.slice(0, 120),
          updated_at: data.created_at,
        })
        .eq('id', conversationId)

      // Feature 6: fire-and-forget email notification to patient
      const { data: { user: sender } } = await supabase.auth.getUser()
      const senderName = sender?.user_metadata?.full_name ?? 'Il tuo nutrizionista'
      supabase.functions.invoke('notify-message', {
        body: { conversation_id: conversationId, sender_name: senderName, preview: trimmed.slice(0, 200) },
      }).catch(() => { /* silently ignore if function not deployed */ })

      return data as Message
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['messages', data.conversation_id] })
      qc.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

// ─── Unread ───────────────────────────────────────────────────────────────────

/**
 * Returns all unread message stubs {id, conversation_id} not sent by the current user.
 * Used both for the sidebar badge (total count) and per-conversation badges.
 */
export function useUnreadMessages() {
  return useQuery({
    queryKey: ['messages_unread'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return [] as { id: string; conversation_id: string }[]
      const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id')
        .eq('is_read', false)
        .neq('sender_id', user.id)
      if (error) return [] as { id: string; conversation_id: string }[]
      return (data ?? []) as { id: string; conversation_id: string }[]
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  })
}

/** Delete a conversation and all its messages (cascade via FK or explicit delete). */
export function useDeleteConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (conversationId: string) => {
      // Delete messages first to avoid FK constraint issues on DBs without cascade
      const { error: msgError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId)
      if (msgError) throw new Error(msgError.message ?? String(msgError))

      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)
      if (error) throw new Error(error.message ?? String(error))

      return conversationId
    },
    onSuccess: (conversationId) => {
      // Remove messages cache for this conversation
      qc.removeQueries({ queryKey: ['messages', conversationId] })
      qc.invalidateQueries({ queryKey: ['conversations'] })
      qc.invalidateQueries({ queryKey: ['messages_unread'] })
    },
  })
}

/** Mark all unread messages in a conversation (not sent by current user) as read. */
export function useMarkConversationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('is_read', false)
        .neq('sender_id', userId)
      if (error) throw new Error(error.message ?? String(error))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages_unread'] })
      qc.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}
