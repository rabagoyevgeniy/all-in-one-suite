import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, Send, Loader2, Globe, Users, X, Phone, Video, Mic, Paperclip } from 'lucide-react';
import VoiceRecorder from '@/components/chat/VoiceRecorder';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import MessageContextMenu from '@/components/chat/MessageContextMenu';
import MessageReactions from '@/components/chat/MessageReactions';
import ChatMessageBubble from '@/components/chat/ChatMessageBubble';
import ChatMediaUpload from '@/components/chat/ChatMediaUpload';
import ReplyPreview from '@/components/chat/ReplyPreview';
import TypingIndicator, { useTypingPresence } from '@/components/chat/TypingIndicator';

function getInitials(name: string | null) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

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
  const unreadDividerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [initialLastRead, setInitialLastRead] = useState<string | null>(null);
  const hasScrolledToUnread = useRef(false);

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

  // Get current user's last_read_at BEFORE we mark as read (for unread divider)
  const { data: myMembership } = useQuery({
    queryKey: ['chat-my-membership', roomId],
    queryFn: async () => {
      const { data } = await supabase
        .from('chat_members')
        .select('last_read_at')
        .eq('room_id', roomId!)
        .eq('user_id', user!.id)
        .single();
      return data;
    },
    enabled: !!roomId && !!user?.id,
    staleTime: Infinity, // Only fetch once
  });

  useEffect(() => {
    if (myMembership && initialLastRead === null) {
      setInitialLastRead(myMembership.last_read_at || '1970-01-01T00:00:00Z');
    }
  }, [myMembership, initialLastRead]);


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
        queryClient.invalidateQueries({ queryKey: ['chat-room-messages', roomId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, user?.id, queryClient]);

  // Auto-scroll — to unread divider on first load, then to bottom for new messages
  useEffect(() => {
    if (!hasScrolledToUnread.current && unreadDividerRef.current) {
      hasScrolledToUnread.current = true;
      setTimeout(() => unreadDividerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    } else if (hasScrolledToUnread.current || !initialLastRead) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [allMessages.length, initialLastRead]);

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    sendTyping();
    // auto-resize
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 128) + 'px';
  };

  const handleSend = async () => {
    if (!messageText.trim() || !roomId) return;
    const text = messageText.trim();
    setMessageText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

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
    textareaRef.current?.focus();
  };

  const handleReply = (msg: any) => {
    setReplyTo({
      id: msg.id,
      body: msg.body,
      senderName: msg.sender?.full_name || '',
    });
    textareaRef.current?.focus();
  };

  const isAnnouncement = room?.type === 'announcement';
  const isAdmin = useAuthStore.getState().role === 'admin' || useAuthStore.getState().role === 'head_manager';
  const canSend = !isAnnouncement || isAdmin;

  const getReactionsForMessage = (msgId: string) =>
    allReactions.filter((r: any) => r.message_id === msgId);

  // Check if same sender within 5 min for avatar grouping
  const shouldShowAvatar = (index: number) => {
    const msg = allMessages[index];
    if (!msg || msg.sender_id === user?.id) return false;
    if (index === 0) return true;
    const prev = allMessages[index - 1];
    if (prev.sender_id !== msg.sender_id) return true;
    const diff = new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime();
    return diff > 5 * 60 * 1000;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* ═══ PREMIUM HEADER ═══ */}
      {room?.type === 'direct' ? (
        <div className="sticky top-0 z-20 px-4 py-3" style={{
          background: 'linear-gradient(135deg, hsl(199 89% 48%) 0%, hsl(199 89% 42%) 100%)'
        }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/chat')}
              className="p-1.5 rounded-full bg-[hsl(0_0%_100%/0.2)] hover:bg-[hsl(0_0%_100%/0.3)] transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-[hsl(0_0%_100%)]" />
            </button>
            <div className="relative">
              {otherMember?.avatar_url ? (
                <img
                  src={otherMember.avatar_url}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-[hsl(0_0%_100%/0.5)]"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[hsl(0_0%_100%/0.3)] flex items-center justify-center text-[hsl(0_0%_100%)] font-bold text-sm ring-2 ring-[hsl(0_0%_100%/0.5)]">
                  {getInitials(otherMember?.full_name)}
                </div>
              )}
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[hsl(var(--success))] ring-[1.5px] ring-[hsl(0_0%_100%)] animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[hsl(0_0%_100%)] text-sm truncate">
                {otherMember?.full_name || t('Chat', 'Чат')}
              </div>
              <div className="text-[hsl(0_0%_100%/0.7)] text-xs">online</div>
            </div>
            <div className="flex gap-1">
              <button className="p-2 rounded-full bg-[hsl(0_0%_100%/0.2)] hover:bg-[hsl(0_0%_100%/0.3)] transition-colors">
                <Phone className="w-4 h-4 text-[hsl(0_0%_100%)]" />
              </button>
              <button className="p-2 rounded-full bg-[hsl(0_0%_100%/0.2)] hover:bg-[hsl(0_0%_100%/0.3)] transition-colors">
                <Video className="w-4 h-4 text-[hsl(0_0%_100%)]" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="sticky top-0 z-20 px-4 py-3" style={{
          background: 'linear-gradient(135deg, hsl(199 89% 48%) 0%, hsl(199 89% 42%) 100%)'
        }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/chat')}
              className="p-1.5 rounded-full bg-[hsl(0_0%_100%/0.2)] hover:bg-[hsl(0_0%_100%/0.3)] transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-[hsl(0_0%_100%)]" />
            </button>
            <div className="w-9 h-9 rounded-full bg-[hsl(0_0%_100%/0.2)] flex items-center justify-center ring-2 ring-[hsl(0_0%_100%/0.5)]">
              {room?.type === 'community' ? (
                <Globe className="w-4 h-4 text-[hsl(0_0%_100%)]" />
              ) : (
                <Users className="w-4 h-4 text-[hsl(0_0%_100%)]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-sm text-[hsl(0_0%_100%)] truncate">{headerTitle}</h3>
              {room?.type && room.type !== 'direct' && (
                <p className="text-[10px] text-[hsl(0_0%_100%/0.7)]">
                  {room.type === 'announcement' ? '📣 Announcements' : room.type === 'community' ? '🌍 Community' : '👥 Group'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ MESSAGES AREA ═══ */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3 pb-4 space-y-1.5 relative"
        style={{
          background: 'radial-gradient(ellipse at top, hsl(210 100% 97%) 0%, hsl(200 100% 98%) 50%, hsl(210 17% 98%) 100%)'
        }}
      >
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, hsl(222 47% 30%) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }} />

        <div className="relative z-10 space-y-1.5">
          {msgsLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : allMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-muted-foreground">{t('No messages yet. Say hello! 👋', 'Сообщений пока нет. Напишите первыми! 👋')}</p>
            </div>
          ) : (() => {
            // Calculate unread divider position
            let unreadIndex = -1;
            let unreadCount = 0;
            if (initialLastRead) {
              const readTime = new Date(initialLastRead).getTime();
              for (let i = 0; i < allMessages.length; i++) {
                const msgTime = new Date(allMessages[i].created_at).getTime();
                if (msgTime > readTime && allMessages[i].sender_id !== user?.id) {
                  if (unreadIndex === -1) unreadIndex = i;
                  unreadCount++;
                }
              }
            }

            return allMessages.map((msg: any, idx: number) => {
              const isOwn = msg.sender_id === user?.id;
              const isSystem = msg.message_type === 'system';
              const showName = room?.type !== 'direct' && !isOwn && !isSystem;
              const msgReactions = getReactionsForMessage(msg.id);
              const showAvatar = shouldShowAvatar(idx);

              return (
                <div key={msg.id}>
                  {idx === unreadIndex && unreadCount > 0 && (
                    <div ref={unreadDividerRef} className="flex items-center gap-3 my-4 px-4">
                      <div className="flex-1 h-px bg-primary/30" />
                      <span className="text-xs text-primary/60 font-medium whitespace-nowrap">
                        {unreadCount} new message{unreadCount > 1 ? 's' : ''} • {unreadCount} {unreadCount === 1 ? 'новое' : 'новых'}
                      </span>
                      <div className="flex-1 h-px bg-primary/30" />
                    </div>
                  )}

                  {isSystem ? (
                    <ChatMessageBubble msg={msg} isOwn={false} showName={false} />
                  ) : (
                    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-1.5`}>
                      {!isOwn && (
                        <div className="w-6 shrink-0 mb-1">
                          {showAvatar ? (
                            msg.sender?.avatar_url ? (
                              <img src={msg.sender.avatar_url} className="w-6 h-6 rounded-full object-cover" alt="" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                                {getInitials(msg.sender?.full_name)}
                              </div>
                            )
                          ) : null}
                        </div>
                      )}

                      <div className={`${isOwn ? 'max-w-[72%]' : 'max-w-[72%]'}`}>
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
                  )}
                </div>
              );
            });
          })()}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ═══ TYPING INDICATOR ═══ */}
      <TypingIndicator roomId={roomId || ''} />

      {/* Reply / Edit preview */}
      <ReplyPreview replyTo={replyTo} onCancel={() => setReplyTo(null)} />
      {editingMsg && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-[hsl(var(--muted)/0.3)]">
          <div className="flex-1 min-w-0 border-l-2 border-[hsl(var(--warning))] pl-2">
            <p className="text-xs font-semibold text-[hsl(var(--warning))]">✏️ {t('Editing message', 'Редактирование')}</p>
            <p className="text-xs text-muted-foreground truncate">{editingMsg.body}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingMsg(null); setMessageText(''); }}>
            <X size={14} />
          </Button>
        </div>
      )}

      {/* ═══ PREMIUM INPUT BAR ═══ */}
      {canSend ? (
        <div className="sticky bottom-0 bg-[hsl(0_0%_100%/0.95)] backdrop-blur-sm border-t border-[hsl(var(--border))] px-3 py-2">
          <div className="flex items-end gap-2">
            <ChatMediaUpload roomId={roomId || ''} onUploaded={() => queryClient.invalidateQueries({ queryKey: ['chat-room-messages', roomId] })} />

            <div className="flex-1 bg-[hsl(var(--muted))] rounded-2xl px-4 py-2.5 flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={messageText}
                onChange={handleTextareaChange}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={t('Message...', 'Сообщение...')}
                rows={1}
                className="flex-1 bg-transparent resize-none text-sm placeholder:text-muted-foreground outline-none max-h-32 min-h-[20px] leading-5"
              />
            </div>

            <AnimatePresence mode="wait">
              {messageText.trim() ? (
                <motion.button
                  key="send"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  onClick={handleSend}
                  className="w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-colors shrink-0"
                  style={{
                    background: 'hsl(199 89% 48%)',
                    boxShadow: '0 4px 12px hsl(199 89% 48% / 0.3)'
                  }}
                >
                  <Send className="w-4 h-4 text-[hsl(0_0%_100%)]" />
                </motion.button>
              ) : (
                <motion.button
                  key="mic"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="w-10 h-10 rounded-full bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted)/0.8)] flex items-center justify-center transition-colors shrink-0"
                >
                  <Mic className="w-5 h-5 text-muted-foreground" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="sticky bottom-0 px-4 py-3 border-t border-border text-center bg-background">
          <p className="text-xs text-muted-foreground">{t('Only admins can post here', 'Только админы могут писать сюда')}</p>
        </div>
      )}
    </div>
  );
}
