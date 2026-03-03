import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, ArrowLeft, MessageCircle } from 'lucide-react';

export default function ParentChat() {
  const { user, profile } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: chats, isLoading: chatsLoading } = useQuery({
    queryKey: ['parent-chats', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .contains('participant_ids', [user!.id])
        .order('last_message_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: messages, isLoading: msgsLoading } = useQuery({
    queryKey: ['chat-messages', selectedChat],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(full_name)')
        .eq('chat_id', selectedChat!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedChat,
  });

  // Realtime messages
  useEffect(() => {
    if (!selectedChat) return;
    const channel = supabase
      .channel(`chat-${selectedChat}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChat}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['chat-messages', selectedChat] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedChat, queryClient]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !selectedChat) return;
    setSending(true);
    try {
      await supabase.from('messages').insert({
        chat_id: selectedChat,
        sender_id: user!.id,
        content: message.trim(),
        message_type: 'text',
      });
      await supabase.from('chats').update({ last_message_at: new Date().toISOString() }).eq('id', selectedChat);
      setMessage('');
    } finally {
      setSending(false);
    }
  };

  // Chat list view
  if (!selectedChat) {
    return (
      <div className="px-4 py-6 space-y-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="font-display font-bold text-xl text-foreground">💬 Messages</h2>
        </motion.div>

        {chatsLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : chats && chats.length > 0 ? (
          chats.map((chat: any) => (
            <motion.div
              key={chat.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card rounded-xl p-4 cursor-pointer"
              onClick={() => setSelectedChat(chat.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageCircle size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{chat.chat_type === 'support' ? 'Support' : 'Chat'}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {chat.last_message_at ? new Date(chat.last_message_at).toLocaleDateString() : 'No messages'}
                  </p>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="glass-card rounded-2xl p-8 text-center">
            <MessageCircle size={40} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No conversations yet</p>
          </div>
        )}
      </div>
    );
  }

  // Chat message view
  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setSelectedChat(null)}><ArrowLeft size={18} /></Button>
        <h3 className="font-display font-semibold text-sm text-foreground">Chat</h3>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {msgsLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          messages?.map((msg: any) => {
            const isOwn = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                  {!isOwn && <p className="text-[10px] font-medium mb-0.5 opacity-70">{(msg.sender as any)?.full_name}</p>}
                  <p>{msg.content}</p>
                  <p className={`text-[9px] mt-1 ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="px-4 py-3 border-t border-border flex gap-2">
        <Input
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          className="rounded-xl"
        />
        <Button size="icon" className="rounded-xl shrink-0" disabled={!message.trim() || sending} onClick={handleSend}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={16} />}
        </Button>
      </div>
    </div>
  );
}
