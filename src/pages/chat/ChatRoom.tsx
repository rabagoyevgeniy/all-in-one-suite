import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';

function initials(name: string | null) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [realtimeMessages, setRealtimeMessages] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Room info
  const { data: room } = useQuery({
    queryKey: ['chat-room', roomId],
    queryFn: async () => {
      const { data } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('id', roomId!)
        .single();
      return data;
    },
    enabled: !!roomId,
  });

  // Room title (for direct chats, show other user's name)
  const { data: roomTitle } = useQuery({
    queryKey: ['chat-room-title', roomId, room?.type],
    queryFn: async () => {
      if (room?.type !== 'direct') return room?.name || t('Chat', 'Чат');
      const { data: members } = await supabase
        .from('chat_members')
        .select('user_id')
        .eq('room_id', roomId!)
        .neq('user_id', user!.id);
      if (!members?.length) return t('Chat', 'Чат');
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', members[0].user_id)
        .single();
      return profile?.full_name || t('Chat', 'Чат');
    },
    enabled: !!roomId && !!room,
  });

  // Messages
  const { data: dbMessages, isLoading: msgsLoading } = useQuery({
    queryKey: ['chat-room-messages', roomId],
    queryFn: async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*, sender:profiles!chat_messages_sender_id_fkey(full_name, avatar_url)')
        .eq('room_id', roomId!)
        .order('created_at', { ascending: true })
        .limit(200);
      return data || [];
    },
    enabled: !!roomId,
  });

  // Combine db + realtime messages, dedup
  const allMessages = (() => {
    const db = dbMessages || [];
    const dbIds = new Set(db.map((m: any) => m.id));
    const newOnes = realtimeMessages.filter(m => !dbIds.has(m.id));
    return [...db, ...newOnes];
  })();

  // Mark as read on open
  useEffect(() => {
    if (!roomId || !user?.id) return;
    supabase
      .from('chat_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .then(() => {});
  }, [roomId, user?.id]);

  // Realtime
  useEffect(() => {
    if (!roomId) return;
    setRealtimeMessages([]);
    const channel = supabase
      .channel(`room-${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`,
      }, async (payload) => {
        const newMsg = payload.new as any;
        // Fetch sender profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', newMsg.sender_id)
          .single();
        newMsg.sender = profile;
        setRealtimeMessages(prev => [...prev, newMsg]);
        
        // Update last_read_at
        if (newMsg.sender_id !== user?.id) {
          await supabase
            .from('chat_members')
            .update({ last_read_at: new Date().toISOString() })
            .eq('room_id', roomId)
            .eq('user_id', user!.id);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId, user?.id]);

  // Auto-scroll
  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 100);
  }, [allMessages.length]);

  const handleSend = async () => {
    if (!message.trim() || !roomId || sending) return;
    setSending(true);
    try {
      await supabase.from('chat_messages').insert({
        room_id: roomId,
        sender_id: user!.id,
        body: message.trim(),
      });
      // Update room's last_message
      await supabase.from('chat_rooms').update({
        last_message: message.trim().slice(0, 100),
        last_message_at: new Date().toISOString(),
      }).eq('id', roomId);
      setMessage('');
    } finally {
      setSending(false);
    }
  };

  const isAnnouncement = room?.type === 'announcement';
  const isAdmin = useAuthStore.getState().role === 'admin' || useAuthStore.getState().role === 'head_manager';
  const canSend = !isAnnouncement || isAdmin;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="px-3 py-3 border-b border-border flex items-center gap-3 bg-card">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-sm text-foreground truncate">
            {roomTitle || t('Chat', 'Чат')}
          </h3>
          {room?.type && room.type !== 'direct' && (
            <p className="text-[10px] text-muted-foreground">
              {room.type === 'announcement' ? t('📣 Announcements', '📣 Объявления') :
               room.type === 'community' ? t('🌍 Community', '🌍 Сообщество') :
               t('👥 Group', '👥 Группа')}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {msgsLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : allMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-muted-foreground">{t('No messages yet. Say hello! 👋', 'Сообщений пока нет. Напишите первыми! 👋')}</p>
          </div>
        ) : (
          allMessages.map((msg: any) => {
            const isOwn = msg.sender_id === user?.id;
            const showName = room?.type !== 'direct' && !isOwn;
            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                  {showName && (
                    <p className="text-[10px] font-semibold mb-0.5 opacity-70">
                      {(msg.sender as any)?.full_name || ''}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                  <p className={`text-[9px] mt-1 ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      {canSend ? (
        <div className="px-3 py-3 border-t border-border flex gap-2 bg-card">
          <Input
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={t('Type a message...', 'Напишите сообщение...')}
            className="rounded-xl"
          />
          <Button size="icon" className="rounded-xl shrink-0" disabled={!message.trim() || sending} onClick={handleSend}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={16} />}
          </Button>
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">{t('Only admins can post here', 'Только админы могут писать сюда')}</p>
        </div>
      )}
    </div>
  );
}
