import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface AIMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: string;
  suggestions?: string[];
  created_at?: string;
}

export interface AIConversationItem {
  id: string;
  title: string;
  last_message: string | null;
  message_count: number;
  updated_at: string;
  is_pinned: boolean;
  mode: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

function groupByDate(items: AIConversationItem[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const pinned: AIConversationItem[] = [];
  const todayItems: AIConversationItem[] = [];
  const yesterdayItems: AIConversationItem[] = [];
  const thisWeekItems: AIConversationItem[] = [];
  const olderItems: AIConversationItem[] = [];

  for (const item of items) {
    if (item.is_pinned) { pinned.push(item); continue; }
    const d = new Date(item.updated_at);
    if (d >= today) todayItems.push(item);
    else if (d >= yesterday) yesterdayItems.push(item);
    else if (d >= weekAgo) thisWeekItems.push(item);
    else olderItems.push(item);
  }

  return { pinned, todayItems, yesterdayItems, thisWeekItems, olderItems };
}

export function useAIConversations(userId: string | undefined) {
  const qc = useQueryClient();

  const { data: conversations = [], isLoading, refetch } = useQuery<AIConversationItem[]>({
    queryKey: ['ai-conversations', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_conversations')
        .select('id, title, last_message, message_count, updated_at, is_pinned, mode')
        .eq('user_id', userId!)
        .eq('is_archived', false)
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(50);
      return (data ?? []) as AIConversationItem[];
    },
    enabled: !!userId,
  });

  const grouped = groupByDate(conversations);

  const createConversation = async (mode: string): Promise<string | null> => {
    if (!userId) return null;
    const { data } = await supabase
      .from('ai_conversations')
      .insert({ user_id: userId, mode, title: 'New conversation' })
      .select('id')
      .single();
    if (data) {
      qc.invalidateQueries({ queryKey: ['ai-conversations'] });
      return data.id;
    }
    return null;
  };

  const deleteConversation = async (id: string) => {
    await supabase.from('ai_conversations').update({ is_archived: true }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['ai-conversations'] });
  };

  const pinConversation = async (id: string, pinned: boolean) => {
    await supabase.from('ai_conversations').update({ is_pinned: pinned }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['ai-conversations'] });
  };

  const renameConversation = async (id: string, title: string) => {
    await supabase.from('ai_conversations').update({ title }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['ai-conversations'] });
  };

  return {
    conversations,
    grouped,
    isLoading,
    refetch,
    createConversation,
    deleteConversation,
    pinConversation,
    renameConversation,
  };
}

export function useAIConversation(conversationId: string | null, mode: string) {
  const { user, session } = useAuthStore();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const loadedIdRef = useRef<string | null>(null);

  // Load messages when conversationId changes
  useEffect(() => {
    if (!conversationId || conversationId === loadedIdRef.current) return;
    loadedIdRef.current = conversationId;
    loadMessages(conversationId);
  }, [conversationId]);

  const loadMessages = async (convId: string) => {
    setIsLoadingHistory(true);
    try {
      const { data: msgs } = await supabase
        .from('ai_messages')
        .select('id, role, content, suggestions, created_at')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      setMessages(
        msgs?.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          suggestions: m.suggestions ?? [],
          created_at: m.created_at ?? undefined,
        })) ?? []
      );
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const sendMessage = useCallback(
    async (content: string, onSuggestions: (sugg: string[]) => void) => {
      if (!conversationId || !user || !session?.access_token) return;
      setIsLoading(true);

      const userMsg: AIMessage = { role: 'user', content, mode };
      setMessages((prev) => [...prev, userMsg]);

      supabase.from('ai_messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content,
      }).then();

      let assistantSoFar = '';

      try {
        const resp = await fetch(CHAT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMsg].slice(-12).map((m) => ({
              role: m.role,
              content: m.content,
            })),
            mode,
          }),
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(err.error || `Error ${resp.status}`);
        }

        const contentType = resp.headers.get('content-type') || '';
        const isStream = contentType.includes('text/event-stream');

        if (isStream && resp.body) {
          // ── SSE STREAMING MODE (local dev) ──
          const reader = resp.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          const cleanMarker = (text: string) =>
            text.replace(/\n?<!--SUGGESTIONS:\s*\[.*?\]\s*-->/s, '').trimEnd();

          const upsertAssistant = (chunk: string) => {
            assistantSoFar += chunk;
            const cleaned = cleanMarker(assistantSoFar);
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === 'assistant') {
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: cleaned } : m
                );
              }
              return [...prev, { role: 'assistant', content: cleaned, mode }];
            });
          };

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let idx: number;
            while ((idx = buffer.indexOf('\n')) !== -1) {
              let line = buffer.slice(0, idx);
              buffer = buffer.slice(idx + 1);
              if (line.endsWith('\r')) line = line.slice(0, -1);
              if (!line.startsWith('data: ') || !line.trim()) continue;
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') break;
              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  upsertAssistant(parsed.delta.text);
                }
                if (parsed.type === 'suggestions' && Array.isArray(parsed.suggestions)) {
                  onSuggestions(parsed.suggestions);
                }
              } catch { /* partial JSON */ }
            }
          }
          assistantSoFar = cleanMarker(assistantSoFar);
        } else {
          // ── JSON MODE (deployed Edge Function v8) ──
          const data = await resp.json();
          assistantSoFar = data.content || data.text || 'No response received.';

          // Set assistant message
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: assistantSoFar, mode },
          ]);

          // Handle suggestions
          if (data.suggestions && Array.isArray(data.suggestions)) {
            onSuggestions(data.suggestions);
          }
        }

        // Save assistant message to DB
        if (assistantSoFar) {
          await supabase.from('ai_messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: assistantSoFar,
          });

          const title =
            messages.length === 0 && content.length > 0
              ? content.length > 50
                ? content.slice(0, 47) + '...'
                : content
              : undefined;

          await supabase
            .from('ai_conversations')
            .update({
              last_message: assistantSoFar.slice(0, 100),
              message_count: messages.length + 2,
              updated_at: new Date().toISOString(),
              ...(title ? { title } : {}),
            })
            .eq('id', conversationId);
        }
      } catch (e: unknown) {
        console.error('AI chat error:', e);
        if (!assistantSoFar) {
          setMessages((prev) => prev.slice(0, -1));
        }
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId, messages, mode, user, session?.access_token]
  );

  const clearMessages = () => {
    setMessages([]);
    loadedIdRef.current = null;
  };

  return {
    messages,
    isLoading,
    isLoadingHistory,
    sendMessage,
    clearMessages,
  };
}
