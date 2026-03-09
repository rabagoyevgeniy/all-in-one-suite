import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export interface AIMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: string;
  suggestions?: string[];
  created_at?: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

export function useAIConversation(mode: string) {
  const { user, session } = useAuthStore();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const loadedModeRef = useRef<string | null>(null);

  // Load or create conversation for this mode
  useEffect(() => {
    if (!user?.id || !mode) return;
    if (loadedModeRef.current === mode) return;
    loadOrCreateConversation();
  }, [user?.id, mode]);

  const loadOrCreateConversation = async () => {
    if (!user?.id) return;
    setIsLoadingHistory(true);
    loadedModeRef.current = mode;

    try {
      // Find existing non-archived conversation for this user+mode
      const { data: existing } = await supabase
        .from('ai_conversations')
        .select('id')
        .eq('user_id', user.id)
        .eq('mode', mode)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        setConversationId(existing.id);
        const { data: msgs } = await supabase
          .from('ai_messages')
          .select('id, role, content, suggestions, created_at')
          .eq('conversation_id', existing.id)
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
      } else {
        // Create new conversation
        const { data: newConv } = await supabase
          .from('ai_conversations')
          .insert({ user_id: user.id, mode, title: `${mode} chat` })
          .select('id')
          .single();

        if (newConv) {
          setConversationId(newConv.id);
          setMessages([]);
        }
      }
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadConversation = async (convId: string) => {
    setConversationId(convId);
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
  };

  const sendMessage = useCallback(
    async (
      content: string,
      onSuggestions: (sugg: string[]) => void
    ) => {
      if (!conversationId || !user || !session?.access_token) return;
      setIsLoading(true);

      const userMsg: AIMessage = { role: 'user', content, mode };
      setMessages((prev) => [...prev, userMsg]);

      // Save user message to DB (fire and forget)
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

        if (!resp.body) throw new Error('No response body');

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
            } catch {
              /* partial JSON */
            }
          }
        }

        // Save assistant message to DB
        const finalContent = cleanMarker(assistantSoFar);
        if (finalContent) {
          await supabase.from('ai_messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: finalContent,
          });

          // Update conversation metadata
          const title =
            messages.length === 0 && content.length > 0
              ? content.length > 50
                ? content.slice(0, 47) + '...'
                : content
              : undefined;

          await supabase
            .from('ai_conversations')
            .update({
              last_message: finalContent.slice(0, 100),
              message_count: messages.length + 2, // user + assistant
              updated_at: new Date().toISOString(),
              ...(title ? { title } : {}),
            })
            .eq('id', conversationId);
        }
      } catch (e: any) {
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

  const clearConversation = async () => {
    if (!conversationId || !user?.id) return;
    await supabase
      .from('ai_conversations')
      .update({ is_archived: true })
      .eq('id', conversationId);

    loadedModeRef.current = null;
    setMessages([]);
    setConversationId(null);
    // Create fresh conversation
    const { data: newConv } = await supabase
      .from('ai_conversations')
      .insert({ user_id: user.id, mode, title: `${mode} chat` })
      .select('id')
      .single();

    if (newConv) {
      setConversationId(newConv.id);
    }
  };

  return {
    conversationId,
    messages,
    isLoading,
    isLoadingHistory,
    sendMessage,
    clearConversation,
    loadConversation,
  };
}
