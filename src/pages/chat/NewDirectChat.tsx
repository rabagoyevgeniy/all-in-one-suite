import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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

  // Load all users from profiles table
  const { data: allUsers, isLoading } = useQuery({
    queryKey: ['chat-users', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, city')
        .neq('id', user!.id)
        .eq('is_active', true)
        .order('full_name');

      if (error) {
        console.error('Users fetch error:', error);
        throw error;
      }
      return data || [];
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
      // Step 1: Get my room memberships
      const { data: myMemberships } = await supabase
        .from('chat_members')
        .select('room_id')
        .eq('user_id', user!.id);

      const myRoomIds = (myMemberships || []).map(m => m.room_id);
      let roomId: string | null = null;

      if (myRoomIds.length > 0) {
        // Find direct rooms I'm in
        const { data: myDirectRooms } = await supabase
          .from('chat_rooms')
          .select('id')
          .eq('type', 'direct')
          .in('id', myRoomIds);

        if (myDirectRooms && myDirectRooms.length > 0) {
          // Check if selected user is in any of these direct rooms
          for (const dr of myDirectRooms) {
            const { data: otherMember } = await supabase
              .from('chat_members')
              .select('id')
              .eq('room_id', dr.id)
              .eq('user_id', selectedUser.id)
              .maybeSingle();

            if (otherMember) {
              roomId = dr.id;
              break;
            }
          }
        }
      }

      // Step 2: Create new room if not found
      if (!roomId) {
        const { data: newRoom, error: roomError } = await supabase
          .from('chat_rooms')
          .insert({
            type: 'direct',
            name: `${profile?.full_name || 'User'} & ${selectedUser.full_name}`,
            created_by: user!.id,
          })
          .select('id')
          .single();

        if (roomError) throw roomError;
        roomId = newRoom.id;

        // Step 3: Add both members
        const { error: membersError } = await supabase
          .from('chat_members')
          .insert([
            { room_id: roomId, user_id: user!.id, role: 'member' },
            { room_id: roomId, user_id: selectedUser.id, role: 'member' },
          ]);

        if (membersError) throw membersError;
      }

      // Step 4: Close and navigate
      onOpenChange(false);
      navigate(`/chat/${roomId}`);
    } catch (err) {
      console.error('Chat creation error:', err);
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
            ) : filtered.length > 0 ? (
              <div className="space-y-1 pr-3">
                {filtered.map((u: any) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-muted/40 active:scale-[0.98] border border-transparent hover:border-border/50"
                    onClick={() => handleSelectUser(u)}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">
                      {u.full_name?.[0]?.toUpperCase() || '?'}
                    </div>
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
