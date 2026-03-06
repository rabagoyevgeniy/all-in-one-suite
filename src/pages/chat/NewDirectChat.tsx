import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

const ROLE_ICONS: Record<string, string> = {
  coach: '🏊',
  parent: '👨‍👩‍👧',
  admin: '⚙️',
  student: '🎓',
  pro_athlete: '🏆',
  head_manager: '👔',
  personal_manager: '🤝',
};

export function NewDirectChat({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  // Load all users with roles
  const { data: allUsers, isLoading } = useQuery({
    queryKey: ['all-users-for-chat', user?.id],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, city')
        .neq('id', user!.id)
        .eq('is_active', true)
        .order('full_name');

      if (error) {
        console.error('Users fetch error:', error);
        throw error;
      }
      if (!profiles?.length) return [];

      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', profiles.map(p => p.id));

      const roleMap = new Map((roles || []).map(r => [r.user_id, r.role]));

      return profiles.map(p => ({
        ...p,
        role: roleMap.get(p.id) || null,
      }));
    },
    enabled: !!user?.id && open,
  });

  const filtered = (allUsers || []).filter(u =>
    !search || u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectUser = async (selectedUser: any) => {
    if (creating) return;
    setCreating(true);
    try {
      // Check existing direct chat
      const { data: myMemberships } = await supabase
        .from('chat_members')
        .select('room_id')
        .eq('user_id', user!.id);

      const { data: theirMemberships } = await supabase
        .from('chat_members')
        .select('room_id')
        .eq('user_id', selectedUser.id);

      const myRoomIds = new Set((myMemberships || []).map(m => m.room_id));
      const sharedRoomIds = (theirMemberships || [])
        .filter(m => myRoomIds.has(m.room_id))
        .map(m => m.room_id);

      if (sharedRoomIds.length > 0) {
        const { data: directRooms } = await supabase
          .from('chat_rooms')
          .select('id')
          .eq('type', 'direct')
          .in('id', sharedRoomIds)
          .limit(1);

        if (directRooms && directRooms.length > 0) {
          onOpenChange(false);
          navigate(`/chat/${directRooms[0].id}`);
          return;
        }
      }

      // Create new room
      const { data: newRoom, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({ type: 'direct', created_by: user!.id })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add both members
      const { error: memberError } = await supabase
        .from('chat_members')
        .insert([
          { room_id: newRoom.id, user_id: user!.id },
          { room_id: newRoom.id, user_id: selectedUser.id },
        ]);

      if (memberError) throw memberError;

      onOpenChange(false);
      navigate(`/chat/${newRoom.id}`);
    } catch (err) {
      console.error('Failed to create chat:', err);
      toast({
        title: t('Failed to start conversation', 'Не удалось начать диалог'),
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{t('New conversation', 'Новый диалог')}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('Search by name...', 'Поиск по имени...')}
              className="pl-9 rounded-xl"
              autoFocus
            />
          </div>

          {creating && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}

          <ScrollArea className="h-[calc(70vh-160px)]">
            {isLoading ? (
              <div className="space-y-3 pr-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length > 0 ? (
              <div className="space-y-1 pr-3">
                {filtered.map((u: any) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-muted/80 active:scale-[0.98] border border-transparent hover:border-border/50"
                    onClick={() => handleSelectUser(u)}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">
                      {u.full_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {ROLE_ICONS[u.role] || '👤'} {u.full_name}
                      </p>
                      {u.role && (
                        <p className="text-xs text-muted-foreground capitalize">
                          {u.role.replace('_', ' ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-6">
                {search
                  ? t(`No users found matching "${search}"`, `Пользователи не найдены по запросу "${search}"`)
                  : t('No users found', 'Пользователи не найдены')}
              </p>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
