import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, MessageCircle, Users, Globe, Megaphone } from 'lucide-react';
import { motion } from 'framer-motion';
import { NewDirectChat } from './NewDirectChat';
import { formatDistanceToNow } from 'date-fns';

function timeAgo(date: string | null) {
  if (!date) return '';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return '';
  }
}

function initials(name: string | null) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function ChatList() {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [newChatOpen, setNewChatOpen] = useState(false);

  // Direct chats
  const { data: directRooms, isLoading: directLoading } = useQuery({
    queryKey: ['chat-rooms-direct', user?.id],
    queryFn: async () => {
      const { data: rooms } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('type', 'direct')
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (!rooms) return [];

      // Filter to rooms where user is a member
      const { data: memberships } = await supabase
        .from('chat_members')
        .select('room_id')
        .eq('user_id', user!.id);
      
      const myRoomIds = new Set((memberships || []).map(m => m.room_id));
      const myRooms = rooms.filter(r => myRoomIds.has(r.id));

      // Get other members for each room
      const roomIds = myRooms.map(r => r.id);
      if (roomIds.length === 0) return [];

      const { data: allMembers } = await supabase
        .from('chat_members')
        .select('room_id, user_id')
        .in('room_id', roomIds)
        .neq('user_id', user!.id);

      const otherUserIds = [...new Set((allMembers || []).map(m => m.user_id))];
      
      const { data: profiles } = otherUserIds.length > 0 
        ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', otherUserIds)
        : { data: [] };

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const memberMap = new Map((allMembers || []).map(m => [m.room_id, m.user_id]));

      // Get unread counts
      const { data: myMemberships } = await supabase
        .from('chat_members')
        .select('room_id, last_read_at')
        .eq('user_id', user!.id)
        .in('room_id', roomIds);

      const readMap = new Map((myMemberships || []).map(m => [m.room_id, m.last_read_at]));

      // Count unread for each room
      const enriched = await Promise.all(myRooms.map(async (room) => {
        const lastRead = readMap.get(room.id);
        let unreadCount = 0;
        if (lastRead) {
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id)
            .gt('created_at', lastRead)
            .neq('sender_id', user!.id);
          unreadCount = count || 0;
        }
        const otherUserId = memberMap.get(room.id);
        const otherProfile = otherUserId ? profileMap.get(otherUserId) : null;
        return { ...room, otherProfile, unreadCount };
      }));

      return enriched;
    },
    enabled: !!user?.id,
  });

  // Group chats
  const { data: groupRooms, isLoading: groupLoading } = useQuery({
    queryKey: ['chat-rooms-group', user?.id],
    queryFn: async () => {
      const { data: memberships } = await supabase
        .from('chat_members')
        .select('room_id')
        .eq('user_id', user!.id);
      
      const roomIds = (memberships || []).map(m => m.room_id);
      if (roomIds.length === 0) return [];

      const { data: rooms } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('type', 'group')
        .in('id', roomIds)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (!rooms?.length) return [];

      const enriched = await Promise.all(rooms.map(async (room) => {
        const { count } = await supabase
          .from('chat_members')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', room.id);
        return { ...room, memberCount: count || 0 };
      }));

      return enriched;
    },
    enabled: !!user?.id,
  });

  // Community rooms
  const { data: communityRooms, isLoading: communityLoading } = useQuery({
    queryKey: ['chat-rooms-community'],
    queryFn: async () => {
      const { data } = await supabase
        .from('chat_rooms')
        .select('*')
        .in('type', ['community', 'announcement'])
        .order('created_at', { ascending: true });
      return data || [];
    },
    enabled: !!user?.id,
  });

  const renderRoomItem = (room: any, subtitle: string, icon: React.ReactNode, avatarText?: string, avatarUrl?: string, badge?: number) => (
    <motion.div
      key={room.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => navigate(`/chat/${room.id}`)}
    >
      <Avatar className="h-11 w-11 shrink-0">
        {avatarUrl && <AvatarImage src={avatarUrl} />}
        <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
          {avatarText || icon}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground truncate">{subtitle}</p>
          {room.last_message_at && (
            <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
              {timeAgo(room.last_message_at)}
            </span>
          )}
        </div>
        {room.last_message && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {room.last_message.length > 40 ? room.last_message.slice(0, 40) + '…' : room.last_message}
          </p>
        )}
      </div>
      {badge && badge > 0 ? (
        <Badge variant="destructive" className="rounded-full h-5 min-w-5 flex items-center justify-center text-[10px] px-1.5">
          {badge}
        </Badge>
      ) : null}
    </motion.div>
  );

  const emptyState = (text: string) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <MessageCircle size={36} className="text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );

  return (
    <div className="px-4 py-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-xl text-foreground">
          {t('Messages', 'Сообщения')}
        </h2>
        <Button size="icon" variant="outline" className="rounded-full h-9 w-9" onClick={() => setNewChatOpen(true)}>
          <Plus size={18} />
        </Button>
      </div>

      <Tabs defaultValue="direct">
        <TabsList className="w-full grid grid-cols-3 mb-4">
          <TabsTrigger value="direct" className="text-xs gap-1">
            <MessageCircle size={14} /> {t('Direct', 'Личные')}
          </TabsTrigger>
          <TabsTrigger value="groups" className="text-xs gap-1">
            <Users size={14} /> {t('Groups', 'Группы')}
          </TabsTrigger>
          <TabsTrigger value="community" className="text-xs gap-1">
            <Globe size={14} /> {t('Community', 'Сообщество')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="direct">
          {directLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : directRooms && directRooms.length > 0 ? (
            <div className="space-y-1">
              {directRooms.map((room: any) =>
                renderRoomItem(
                  room,
                  room.otherProfile?.full_name || t('Unknown', 'Неизвестный'),
                  <MessageCircle size={16} />,
                  initials(room.otherProfile?.full_name),
                  room.otherProfile?.avatar_url,
                  room.unreadCount
                )
              )}
            </div>
          ) : emptyState(t('No conversations yet', 'Пока нет диалогов'))}
        </TabsContent>

        <TabsContent value="groups">
          {groupLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : groupRooms && groupRooms.length > 0 ? (
            <div className="space-y-1">
              {groupRooms.map((room: any) =>
                renderRoomItem(
                  room,
                  room.name || t('Group', 'Группа'),
                  <Users size={16} />,
                  initials(room.name),
                  undefined
                )
              )}
            </div>
          ) : emptyState(t('No groups yet', 'Пока нет групп'))}
        </TabsContent>

        <TabsContent value="community">
          {communityLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : communityRooms && communityRooms.length > 0 ? (
            <div className="space-y-1">
              {communityRooms.map((room: any) =>
                renderRoomItem(
                  room,
                  room.name || 'Community',
                  room.type === 'announcement' ? <Megaphone size={16} /> : <Globe size={16} />,
                  room.type === 'announcement' ? '📣' : '🌍',
                  undefined
                )
              )}
            </div>
          ) : emptyState(t('No community channels', 'Нет каналов сообщества'))}
        </TabsContent>
      </Tabs>

      <NewDirectChat open={newChatOpen} onOpenChange={setNewChatOpen} />
    </div>
  );
}
