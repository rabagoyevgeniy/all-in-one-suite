import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';

export function RecentMessagesWidget() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useLanguage();

  const { data: recentChats } = useQuery({
    queryKey: ['recent-chats-widget', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get rooms user is a member of
      const { data: memberships } = await supabase
        .from('chat_members')
        .select('room_id, last_read_at')
        .eq('user_id', user.id)
        .limit(10);

      if (!memberships?.length) return [];

      const roomIds = memberships.map(m => m.room_id);

      const { data: rooms } = await supabase
        .from('chat_rooms')
        .select('id, name, type, last_message, last_message_at')
        .in('id', roomIds)
        .order('last_message_at', { ascending: false })
        .limit(3);

      return (rooms || []).map(room => {
        const membership = memberships.find(m => m.room_id === room.id);
        return {
          ...room,
          hasUnread: !membership?.last_read_at,
        };
      });
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="mx-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          {t('Messages', 'Сообщения')}
        </h3>
        <button onClick={() => navigate('/chat')} className="text-xs text-primary">
          {t('View all →', 'Все →')}
        </button>
      </div>

      <div className="space-y-2">
        {recentChats && recentChats.length > 0 ? (
          recentChats.map(chat => (
            <button
              key={chat.id}
              onClick={() => navigate(`/chat/${chat.id}`)}
              className="w-full flex items-center gap-3 p-3 bg-card
                         rounded-2xl shadow-sm border border-border
                         hover:border-primary/30 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br
                              from-primary to-primary/70 flex items-center
                              justify-center text-primary-foreground text-sm font-bold flex-shrink-0">
                {getInitials(chat.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-foreground truncate">
                  {chat.name || t('Chat', 'Чат')}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {chat.last_message || t('No messages yet', 'Нет сообщений')}
                </div>
              </div>
              {chat.hasUnread && (
                <div className="w-2.5 h-2.5 bg-primary rounded-full flex-shrink-0" />
              )}
            </button>
          ))
        ) : (
          <button
            onClick={() => navigate('/chat')}
            className="w-full py-4 border-2 border-dashed border-border
                       rounded-2xl text-sm text-muted-foreground hover:border-primary/30
                       hover:text-primary transition-colors"
          >
            💬 {t('Start a conversation', 'Начать разговор')}
          </button>
        )}
      </div>
    </div>
  );
}
