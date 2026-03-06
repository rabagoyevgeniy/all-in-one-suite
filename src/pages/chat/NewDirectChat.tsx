import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

const ROLE_COLORS: Record<string, string> = {
  coach: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  parent: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  head_manager: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  student: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  pro_athlete: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  personal_manager: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
};

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
  const { user, profile } = useAuthStore();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  // Load ALL users from profiles table — no role filter, just exclude self
  const { data: allUsers, isLoading, error } = useQuery({
    queryKey: ['chat-searchable-users'],
    queryFn: async () => {
      console.log('[NewDirectChat] Fetching users...');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, city')
        .order('full_name');

      console.log('[NewDirectChat] Result:', { count: data?.length, error });
      if (error) throw error;

      // Filter out current user client-side
      const currentId = (await supabase.auth.getUser()).data.user?.id;
      return (data ?? []).filter(u => u.id !== currentId);
    },
    staleTime: 30000,
  });

  const filtered = useMemo(() => {
    if (!allUsers) return [];
    if (!search.trim()) return allUsers;
    return allUsers.filter(u =>
      u.full_name?.toLowerCase().includes(search.toLowerCase())
    );
  }, [allUsers, search]);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const handleSelectUser = async (selectedUser: any) => {
    if (creating) return;
    setCreating(true);
    setSelectedUserId(selectedUser.id);

    try {
      // Get current user ID reliably
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) throw new Error('Not authenticated');
      const currentUserId = authUser.id;

      // Step 1: Find existing direct room between these two users
      const { data: myMemberships } = await supabase
        .from('chat_members')
        .select('room_id')
        .eq('user_id', currentUserId);

      let existingRoomId: string | null = null;

      if (myMemberships && myMemberships.length > 0) {
        const myRoomIds = myMemberships.map(m => m.room_id);

        const { data: otherMemberships } = await supabase
          .from('chat_members')
          .select('room_id')
          .eq('user_id', selectedUser.id)
          .in('room_id', myRoomIds);

        if (otherMemberships && otherMemberships.length > 0) {
          const sharedRoomIds = otherMemberships.map(m => m.room_id);

          const { data: directRoom } = await supabase
            .from('chat_rooms')
            .select('id')
            .eq('type', 'direct')
            .in('id', sharedRoomIds)
            .limit(1)
            .maybeSingle();

          if (directRoom) existingRoomId = directRoom.id;
        }
      }

      // Step 2: Create new room if none exists
      if (!existingRoomId) {
        const roomName = `${profile?.full_name || 'User'} & ${selectedUser.full_name}`;

        const { data: newRoom, error: roomError } = await supabase
          .from('chat_rooms')
          .insert({
            type: 'direct',
            name: roomName,
            created_by: currentUserId,
          })
          .select('id')
          .single();

        if (roomError) {
          console.error('[Chat] Room creation error:', roomError);
          throw new Error(`Room creation failed: ${roomError.message}`);
        }

        const { error: membersError } = await supabase
          .from('chat_members')
          .insert([
            { room_id: newRoom.id, user_id: currentUserId, role: 'member' },
            { room_id: newRoom.id, user_id: selectedUser.id, role: 'member' },
          ]);

        if (membersError) {
          console.error('[Chat] Members insert error:', membersError);
          throw new Error(`Adding members failed: ${membersError.message}`);
        }

        existingRoomId = newRoom.id;
      }

      onOpenChange(false);
      navigate(`/chat/${existingRoomId}`);
    } catch (err: any) {
      console.error('[Chat] handleSelectUser error:', err);
      toast({
        title: t('Failed to start conversation', 'Не удалось начать диалог'),
        description: err.message ?? '',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
      setSelectedUserId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{t('New conversation', 'Новый диалог')}</SheetTitle>
          <SheetDescription>{t('Select a person to start chatting', 'Выберите собеседника')}</SheetDescription>
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

          <ScrollArea className="h-[calc(70vh-180px)]">
            {isLoading ? (
              <div className="space-y-3 pr-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-4 text-center text-destructive text-sm">
                {t('Error loading users', 'Ошибка загрузки')}: {(error as Error).message}
              </div>
            ) : filtered.length > 0 ? (
              <div className="space-y-1 pr-3">
                {filtered.map((u: any) => (
                  <button
                    key={u.id}
                    disabled={creating}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-muted/40 active:scale-[0.98] border border-transparent hover:border-border/50 text-left ${creating && selectedUserId !== u.id ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={() => handleSelectUser(u)}
                  >
                    {u.avatar_url ? (
                      <img src={u.avatar_url} className="w-10 h-10 rounded-full object-cover shrink-0" alt="" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">
                        {u.full_name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {u.full_name}
                      </p>
                      {u.city && (
                        <p className="text-xs text-muted-foreground capitalize">
                          {u.city}
                        </p>
                      )}
                    </div>
                    {creating && selectedUserId === u.id && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-6">
                {search
                  ? t(`No users found matching "${search}"`, `Пользователи не найдены по запросу "${search}"`)
                  : t('No users available', 'Нет доступных пользователей')}
              </p>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
