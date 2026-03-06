import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string | null;
  is_read: boolean;
  sent_at: string;
  reference_id: string | null;
}

const TYPE_ICONS: Record<string, string> = {
  lesson_completed: '✅',
  duel_challenge: '⚔️',
  coin_earned: '🪙',
  coin_received: '🪙',
  achievement: '🏆',
  booking_confirmed: '📅',
  subscription_warning: '⏰',
  subscription_penalty: '🚨',
};

export function NotificationBell() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    // Initial load
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(15)
      .then(({ data }) => {
        const items = (data || []) as Notification[];
        setNotifications(items);
        setUnreadCount(items.filter(n => !n.is_read).length);
      });

    // Realtime
    const channel = supabase
      .channel('user-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const newNotif = payload.new as Notification;
        setNotifications(prev => [newNotif, ...prev].slice(0, 20));
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const markAllRead = async () => {
    if (!user?.id) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const timeAgo = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h`;
    return `${Math.floor(mins / 1440)}d`;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-muted transition-colors">
          <Bell size={20} className="text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 max-h-[400px] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-display font-semibold text-sm text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <div className="overflow-y-auto max-h-[340px]">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                className={`px-4 py-3 border-b border-border last:border-0 ${!n.is_read ? 'bg-primary/5' : ''}`}
              >
              <div className="flex items-start gap-2">
                  <span className="text-base mt-0.5">{TYPE_ICONS[n.type || ''] || '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className={`text-xs mt-0.5 line-clamp-2 ${n.type === 'subscription_penalty' ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>{n.body}</p>
                    {n.type === 'subscription_warning' && (
                      <button
                        onClick={() => window.location.href = '/parent/payments'}
                        className="text-[11px] font-semibold text-primary mt-1 hover:underline"
                      >
                        Renew →
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(n.sent_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
