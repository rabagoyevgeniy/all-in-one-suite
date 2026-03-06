import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

function initials(name: string | null) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export function NewDirectChat({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  const { data: users, isLoading } = useQuery({
    queryKey: ['search-users', search],
    queryFn: async () => {
      if (search.trim().length < 2) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .neq('id', user!.id)
        .ilike('full_name', `%${search.trim()}%`)
        .limit(10);
      return data || [];
    },
    enabled: !!user?.id && search.trim().length >= 2,
  });

  const handleSelect = async (selectedUserId: string) => {
    if (creating) return;
    setCreating(true);
    try {
      // Check if direct chat already exists between these two users
      const { data: myMemberships } = await supabase
        .from('chat_members')
        .select('room_id')
        .eq('user_id', user!.id);

      const myRoomIds = (myMemberships || []).map(m => m.room_id);

      if (myRoomIds.length > 0) {
        const { data: theirMemberships } = await supabase
          .from('chat_members')
          .select('room_id')
          .eq('user_id', selectedUserId)
          .in('room_id', myRoomIds);

        const sharedRoomIds = (theirMemberships || []).map(m => m.room_id);

        if (sharedRoomIds.length > 0) {
          // Check if any of these shared rooms are direct
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
      }

      // Create new room
      const { data: newRoom } = await supabase
        .from('chat_rooms')
        .insert({ type: 'direct', created_by: user!.id })
        .select()
        .single();

      if (!newRoom) return;

      // Add both members
      await supabase.from('chat_members').insert([
        { room_id: newRoom.id, user_id: user!.id },
        { room_id: newRoom.id, user_id: selectedUserId },
      ]);

      onOpenChange(false);
      navigate(`/chat/${newRoom.id}`);
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
        <div className="mt-4 space-y-4">
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
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : search.trim().length < 2 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              {t('Type at least 2 characters', 'Введите минимум 2 символа')}
            </p>
          ) : users && users.length > 0 ? (
            <div className="space-y-1">
              {users.map((u: any) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSelect(u.id)}
                >
                  <Avatar className="h-10 w-10">
                    {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                    <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                      {initials(u.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-medium text-foreground">{u.full_name}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-6">
              {t('No users found', 'Пользователи не найдены')}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
