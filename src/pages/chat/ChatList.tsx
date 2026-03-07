import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Loader2, Plus, MessageCircle, Users, Globe, Megaphone } from 'lucide-react';
import { motion } from 'framer-motion';
import { NewDirectChat } from './NewDirectChat';
import { CommunityInfoSheet } from '@/components/chat/CommunityInfoSheet';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';

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
  const [communitySheetRoom, setCommunitySheetRoom] = useState<string | null>(null);

  // Direct chats
  const { data: directRooms, isLoading: directLoading } = useQuery({
    queryKey: ['chat-rooms-direct', user?.id],
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
        .eq('type', 'direct')
        .in('id', roomIds)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (!rooms?.length) return [];

      // Get other members
      const { data: allMembers } = await supabase
        .from('chat_members')
        .select('room_id, user_id')
        .in('room_id', rooms.map(r => r.id))
        .neq('user_id', user!.id);

      const otherUserIds = [...new Set((allMembers || []).map(m => m.user_id))];

      const { data: profiles } = otherUserIds.length > 0
        ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', otherUserIds)
        : { data: [] };

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const memberMap = new Map((allMembers || []).map(m => [m.room_id, m.user_id]));

      // Unread counts
      const { data: myMemberships } = await supabase
        .from('chat_members')
        .select('room_id, last_read_at')
        .eq('user_id', user!.id)
        .in('room_id', rooms.map(r => r.id));

      const readMap = new Map((myMemberships || []).map(m => [m.room_id, m.last_read_at]));

      const enriched = await Promise.all(rooms.map(async (room) => {
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

  // Community rooms — NO membership join, visible to everyone
  const { data: communityRooms, isLoading: communityLoading } = useQuery({
    queryKey: ['community-rooms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('id, type, name, last_message, last_message_at')
        .in('type', ['community', 'announcement'])
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Community rooms error:', error);
        throw error;
      }
      return data || [];
    },
    refetchOnWindowFocus: true,
  });

  const renderRoomItem = (room: any, subtitle: string, icon: React.ReactNode, avatarText?: string, avatarUrl?: string, badge?: number) => (
    <motion.div
      key={room.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-muted/80 active:scale-[0.98] border border-transparent hover:border-border/50"
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
              {communityRooms.map((room: any) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-muted/80 active:scale-[0.98] border border-transparent hover:border-border/50"
                  onClick={() => setCommunitySheetRoom(room.id)}
                >
                  <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-lg shrink-0">
                    {room.type === 'announcement' ? '📣' : '🌍'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{room.name || 'Community'}</p>
                      {room.type === 'announcement' && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Official</Badge>
                      )}
                    </div>
                    {room.last_message && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {room.last_message.length > 40 ? room.last_message.slice(0, 40) + '…' : room.last_message}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : emptyState(t('No community channels', 'Нет каналов сообщества'))}
        </TabsContent>
      </Tabs>

      <NewDirectChat open={newChatOpen} onOpenChange={setNewChatOpen} />
      <CommunityInfoSheet
        roomId={communitySheetRoom}
        open={!!communitySheetRoom}
        onOpenChange={(open) => { if (!open) setCommunitySheetRoom(null); }}
      />
    </div>
  );
}
