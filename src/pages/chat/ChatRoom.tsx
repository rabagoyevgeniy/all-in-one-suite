import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Loader2, Globe, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messageText, setMessageText] = useState('');
  const [realtimeMessages, setRealtimeMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Room info
  const { data: room } = useQuery({
    queryKey: ['chat-room', roomId],
    queryFn: async () => {
      const { data } = await supabase
        .from('chat_rooms')
        .select('id, name, type, city')
        .eq('id', roomId!)
        .single();
      return data;
    },
    enabled: !!roomId,
  });

  // For direct chats, get the other person's name
  const { data: otherMember } = useQuery({
    queryKey: ['chat-other-member', roomId],
    queryFn: async () => {
      const { data: members } = await supabase
        .from('chat_members')
        .select('user_id')
        .eq('room_id', roomId!)
        .neq('user_id', user!.id);
      if (!members?.length) return null;
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', members[0].user_id)
        .single();
      return profile;
    },
    enabled: !!roomId && !!room && room.type === 'direct',
  });

  const headerTitle = room?.type === 'direct'
    ? (otherMember?.full_name || t('Chat', 'Чат'))
    : (room?.name || t('Chat', 'Чат'));

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

  // Combine db + realtime, dedup
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

  // Realtime subscription
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
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', newMsg.sender_id)
          .single();
        newMsg.sender = profile;
        setRealtimeMessages(prev => [...prev, newMsg]);

        if (newMsg.sender_id !== user?.id) {
          await supabase
            .from('chat_members')
            .update({ last_read_at: new Date().toISOString() })
            .eq('room_id', roomId)
            .eq('user_id', user!.id);
        }

        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId, user?.id]);

  // Auto-scroll on new messages
  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [allMessages.length]);

  const handleSend = async () => {
    if (!messageText.trim() || !roomId) return;
    const text = messageText.trim();
    setMessageText('');

    const { error } = await supabase.from('chat_messages').insert({
      room_id: roomId,
      sender_id: user!.id,
      body: text,
    });

    if (error) {
      console.error('Send error:', error);
      setMessageText(text);
      toast({ title: t('Failed to send message', 'Не удалось отправить сообщение'), variant: 'destructive' });
      return;
    }

    await supabase.from('chat_rooms').update({
      last_message: text.slice(0, 100),
      last_message_at: new Date().toISOString(),
    }).eq('id', roomId);
  };

  const isAnnouncement = room?.type === 'announcement';
  const isAdmin = useAuthStore.getState().role === 'admin' || useAuthStore.getState().role === 'head_manager';
  const canSend = !isAnnouncement || isAdmin;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 px-3 py-3 border-b border-border flex items-center gap-3 bg-background/95 backdrop-blur">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/chat')}>
          <ArrowLeft size={20} />
        </Button>
        {room?.type === 'direct' && otherMember ? (
          <>
            {otherMember.avatar_url ? (
              <img src={otherMember.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                {otherMember.full_name?.charAt(0) ?? '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-sm text-foreground truncate">
                {otherMember.full_name}
              </h3>
            </div>
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              {room?.type === 'community' ? <Globe className="w-4 h-4 text-primary" /> : <Users className="w-4 h-4 text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-sm text-foreground truncate">
                {headerTitle}
              </h3>
              {room?.type && room.type !== 'direct' && (
                <p className="text-[10px] text-muted-foreground">
                  {room.type === 'announcement' ? '📣 Announcements' : room.type === 'community' ? '🌍 Community' : '👥 Group'}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 pb-4 space-y-2">
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
        <div ref={messagesEndRef} />
      </div>

      {/* Input — sticky at bottom */}
      {canSend ? (
        <div className="sticky bottom-0 px-3 py-3 border-t border-border flex gap-2 bg-background">
          <Input
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={t('Type a message...', 'Напишите сообщение...')}
            className="rounded-xl"
          />
          <Button size="icon" className="rounded-xl shrink-0" disabled={!messageText.trim()} onClick={handleSend}>
            <Send size={16} />
          </Button>
        </div>
      ) : (
        <div className="sticky bottom-0 px-4 py-3 border-t border-border text-center bg-background">
          <p className="text-xs text-muted-foreground">{t('Only admins can post here', 'Только админы могут писать сюда')}</p>
        </div>
      )}
    </div>
  );
}