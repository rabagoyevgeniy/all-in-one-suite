import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, Forward } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ForwardSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  message: {
    id: string;
    body: string;
    message_type: string;
    media_url?: string | null;
    senderName: string;
  } | null;
}

export default function ForwardSheet({ open, onOpenChange, message }: ForwardSheetProps) {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState<string | null>(null);

  const { data: allUsers, isLoading } = useQuery({
    queryKey: ['forward-users'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .order('full_name');
      return (data ?? []).filter(u => u.id !== user?.id);
    },
    enabled: open,
    staleTime: 30000,
  });

  const filtered = useMemo(() => {
    if (!allUsers) return [];
    if (!search.trim()) return allUsers;
    return allUsers.filter(u => u.full_name?.toLowerCase().includes(search.toLowerCase()));
  }, [allUsers, search]);

  const handleForward = async (targetUser: { id: string; full_name: string | null; avatar_url: string | null }) => {
    if (!message || !user?.id || sending) return;
    setSending(targetUser.id);

    try {
      const { data: roomId, error: rpcErr } = await supabase
        .rpc('create_direct_chat', { other_user_id: targetUser.id });
      if (rpcErr) throw rpcErr;

      const { error: msgErr } = await supabase.from('chat_messages').insert({
        room_id: roomId,
        sender_id: user.id,
        body: message.body,
        message_type: message.message_type === 'voice' || message.message_type === 'image' || message.message_type === 'file'
          ? message.message_type : 'text',
        media_url: message.media_url || null,
        forwarded_from_id: message.id,
        forwarded_from_name: message.senderName,
      } as any);
      if (msgErr) throw msgErr;

      await supabase.from('chat_rooms').update({
        last_message: `↗ ${message.body.slice(0, 80)}`,
        last_message_at: new Date().toISOString(),
      }).eq('id', roomId);

      onOpenChange(false);
      toast({ title: t('Message forwarded', 'Сообщение переслано') });
      navigate(`/chat/${roomId}`);
    } catch (err: unknown) {
      toast({ title: t('Forward failed', 'Ошибка пересылки'), variant: 'destructive' });
    } finally {
      setSending(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Forward className="w-4 h-4" />
            {t('Forward to', 'Переслать')}
          </SheetTitle>
          <SheetDescription>{t('Select a person to forward the message', 'Выберите получателя')}</SheetDescription>
        </SheetHeader>

        {message && (
          <div className="mt-3 mx-1 p-2 rounded-xl bg-muted/50 border border-border text-xs text-muted-foreground truncate">
            ↗ {message.body.slice(0, 100)}
          </div>
        )}

        <div className="mt-3 space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('Search...', 'Поиск...')}
              className="pl-9 rounded-xl"
              autoFocus
            />
          </div>

          <ScrollArea className="h-[calc(70vh-240px)]">
            {isLoading ? (
              <div className="space-y-3 pr-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            ) : filtered.length > 0 ? (
              <div className="space-y-1 pr-3">
                {filtered.map((u) => (
                  <button
                    key={u.id}
                    disabled={!!sending}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-muted/40 active:scale-[0.98] text-left ${sending && sending !== u.id ? 'opacity-50' : ''}`}
                    onClick={() => handleForward(u)}
                  >
                    {u.avatar_url ? (
                      <img src={u.avatar_url} className="w-10 h-10 rounded-full object-cover shrink-0" alt="" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">
                        {u.full_name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <p className="font-semibold text-sm text-foreground truncate flex-1">{u.full_name}</p>
                    {sending === u.id && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-6">
                {t('No users found', 'Пользователи не найдены')}
              </p>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
