import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Loader2, Globe, Users, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import MessageContextMenu from '@/components/chat/MessageContextMenu';
import MessageReactions from '@/components/chat/MessageReactions';
import ChatMessageBubble from '@/components/chat/ChatMessageBubble';
import ChatMediaUpload from '@/components/chat/ChatMediaUpload';
import ReplyPreview from '@/components/chat/ReplyPreview';
import TypingIndicator, { useTypingPresence } from '@/components/chat/TypingIndicator';

export default function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState('');
  const [realtimeMessages, setRealtimeMessages] = useState<any[]>([]);
  const [realtimeReactions, setRealtimeReactions] = useState<any[]>([]);
  const [replyTo, setReplyTo] = useState<{ id: string; body: string; senderName: string } | null>(null);
  const [editingMsg, setEditingMsg] = useState<{ id: string; body: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { sendTyping } = useTypingPresence(roomId || '');

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

  // For direct chats, get the other person
  const { data: otherMember } = useQuery({
    queryKey: ['chat-other-member', roomId],
    queryFn: async () => {
      const { data: members } = await supabase
        .from('chat_members')
        .select('user_id, last_read_at')
        .eq('room_id', roomId!)
        .neq('user_id', user!.id);
      if (!members?.length) return null;
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', members[0].user_id)
        .single();
      return { ...profile, last_read_at: members[0].last_read_at };
    },
    enabled: !!roomId && !!room && room.type === 'direct',
  });

  const headerTitle = room?.type === 'direct'
    ? (otherMember?.full_name || t('Chat', 'Чат'))
    : (room?.name || t('Chat', 'Чат'));

  // Messages with reply joins
  const { data: dbMessages, isLoading: msgsLoading } = useQuery({
    queryKey: ['chat-room-messages', roomId],
    queryFn: async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*, sender:profiles!chat_messages_sender_id_fkey(full_name, avatar_url)')
        .eq('room_id', roomId!)
        .order('created_at', { ascending: true })
        .limit(200);

      // Fetch reply messages separately for any that have reply_to_id
      const msgs = data || [];
      const replyIds = msgs.filter((m: any) => m.reply_to_id).map((m: any) => m.reply_to_id);
      if (replyIds.length > 0) {
        const { data: replyMsgs } = await supabase
          .from('chat_messages')
          .select('id, body, sender_id, sender:profiles!chat_messages_sender_id_fkey(full_name)')
          .in('id', replyIds);
        const replyMap = new Map((replyMsgs || []).map((r: any) => [r.id, r]));
        msgs.forEach((m: any) => {
          if (m.reply_to_id) {
            m.reply_message = replyMap.get(m.reply_to_id) || null;
          }
        });
      }
      return msgs;
    },
    enabled: !!roomId,
  });

  // Reactions
  const { data: dbReactions } = useQuery({
    queryKey: ['chat-room-reactions', roomId],
    queryFn: async () => {
      const msgIds = (dbMessages || []).map((m: any) => m.id);
      if (!msgIds.length) return [];
      const { data } = await supabase
        .from('chat_reactions')
        .select('id, message_id, user_id, emoji')
        .in('message_id', msgIds);
      return data || [];
    },
    enabled: !!roomId && !!dbMessages && dbMessages.length > 0,
  });

  const allReactions = (() => {
    const db = dbReactions || [];
    const dbIds = new Set(db.map((r: any) => r.id));
    const newOnes = realtimeReactions.filter(r => !dbIds.has(r.id));
    return [...db, ...newOnes];
  })();

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
    setRealtimeReactions([]);

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
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_reactions',
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setRealtimeReactions(prev => [...prev, payload.new as any]);
        } else if (payload.eventType === 'DELETE') {
          setRealtimeReactions(prev => prev.filter(r => r.id !== (payload.old as any).id));
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`,
      }, () => {
        // Refetch on edits/deletes
        queryClient.invalidateQueries({ queryKey: ['chat-room-messages', roomId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, user?.id, queryClient]);

  // Auto-scroll
  useEffect(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [allMessages.length]);

  const handleSend = async () => {
    if (!messageText.trim() || !roomId) return;
    const text = messageText.trim();
    setMessageText('');

    // Handle edit mode
    if (editingMsg) {
      const { error } = await supabase.from('chat_messages')
        .update({ body: text, is_edited: true, edited_at: new Date().toISOString() } as any)
        .eq('id', editingMsg.id);
      if (error) {
        toast({ title: t('Edit failed', 'Ошибка редактирования'), variant: 'destructive' });
        setMessageText(text);
      }
      setEditingMsg(null);
      return;
    }

    const insertData: any = {
      room_id: roomId,
      sender_id: user!.id,
      body: text,
    };
    if (replyTo) {
      insertData.reply_to_id = replyTo.id;
    }

    const { error } = await supabase.from('chat_messages').insert(insertData);
    if (error) {
      console.error('Send error:', error);
      setMessageText(text);
      toast({ title: t('Failed to send message', 'Не удалось отправить сообщение'), variant: 'destructive' });
      return;
    }

    setReplyTo(null);

    await supabase.from('chat_rooms').update({
      last_message: text.slice(0, 100),
      last_message_at: new Date().toISOString(),
    }).eq('id', roomId);
  };

  const handleDelete = async (msgId: string) => {
    await supabase.from('chat_messages')
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq('id', msgId);
    queryClient.invalidateQueries({ queryKey: ['chat-room-messages', roomId] });
  };

  const handleEdit = (msgId: string, body: string) => {
    setEditingMsg({ id: msgId, body });
    setMessageText(body);
    inputRef.current?.focus();
  };

  const handleReply = (msg: any) => {
    setReplyTo({
      id: msg.id,
      body: msg.body,
      senderName: msg.sender?.full_name || '',
    });
    inputRef.current?.focus();
  };

  const isAnnouncement = room?.type === 'announcement';
  const isAdmin = useAuthStore.getState().role === 'admin' || useAuthStore.getState().role === 'head_manager';
  const canSend = !isAnnouncement || isAdmin;

  const getReactionsForMessage = (msgId: string) =>
    allReactions.filter((r: any) => r.message_id === msgId);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
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
              <h3 className="font-display font-semibold text-sm text-foreground truncate">{headerTitle}</h3>
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
            const msgReactions = getReactionsForMessage(msg.id);

            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[78%]">
                  <MessageContextMenu
                    messageId={msg.id}
                    senderId={msg.sender_id}
                    createdAt={msg.created_at}
                    onReply={() => handleReply(msg)}
                    onEdit={() => handleEdit(msg.id, msg.body)}
                    onDelete={() => handleDelete(msg.id)}
                  >
                    <ChatMessageBubble
                      msg={msg}
                      isOwn={isOwn}
                      showName={showName}
                      otherLastRead={otherMember?.last_read_at}
                      isDirect={room?.type === 'direct'}
                    />
                  </MessageContextMenu>
                  <MessageReactions messageId={msg.id} reactions={msgReactions} isOwn={isOwn} />
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      <TypingIndicator roomId={roomId || ''} />

      {/* Reply / Edit preview */}
      <ReplyPreview replyTo={replyTo} onCancel={() => setReplyTo(null)} />
      {editingMsg && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-muted/30">
          <div className="flex-1 min-w-0 border-l-2 border-yellow-500 pl-2">
            <p className="text-xs font-semibold text-yellow-600">✏️ {t('Editing message', 'Редактирование')}</p>
            <p className="text-xs text-muted-foreground truncate">{editingMsg.body}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingMsg(null); setMessageText(''); }}>
            <X size={14} />
          </Button>
        </div>
      )}

      {/* Input */}
      {canSend ? (
        <div className="sticky bottom-0 px-3 py-3 border-t border-border flex gap-2 bg-background relative">
          <ChatMediaUpload roomId={roomId || ''} onUploaded={() => queryClient.invalidateQueries({ queryKey: ['chat-room-messages', roomId] })} />
          <Input
            ref={inputRef}
            value={messageText}
            onChange={e => {
              setMessageText(e.target.value);
              sendTyping();
            }}
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
