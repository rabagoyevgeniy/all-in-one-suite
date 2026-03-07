import { useNotifications } from '@/hooks/useNotifications';
import { PageHeader } from '@/components/layout/PageHeader';
import { Bell, CreditCard, Trophy, Swords, MessageCircle, AlertCircle, Star, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

const TYPE_CONFIG: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  lesson_reminder:      { icon: Bell,          color: 'text-primary',      bg: 'bg-primary/10' },
  lesson_cancelled:     { icon: AlertCircle,   color: 'text-destructive',  bg: 'bg-destructive/10' },
  lesson_confirmed:     { icon: Check,         color: 'text-success',      bg: 'bg-success/10' },
  lesson_completed:     { icon: Check,         color: 'text-success',      bg: 'bg-success/10' },
  payment_received:     { icon: CreditCard,    color: 'text-success',      bg: 'bg-success/10' },
  payment_due:          { icon: CreditCard,    color: 'text-warning',      bg: 'bg-warning/10' },
  coach_arriving:       { icon: Bell,          color: 'text-primary',      bg: 'bg-primary/10' },
  achievement_unlocked: { icon: Trophy,        color: 'text-coin',         bg: 'bg-coin/10' },
  achievement_earned:   { icon: Trophy,        color: 'text-coin',         bg: 'bg-coin/10' },
  achievement:          { icon: Trophy,        color: 'text-coin',         bg: 'bg-coin/10' },
  belt_upgraded:        { icon: Star,          color: 'text-primary',      bg: 'bg-primary/10' },
  duel_challenge:       { icon: Swords,        color: 'text-destructive',  bg: 'bg-destructive/10' },
  new_message:          { icon: MessageCircle, color: 'text-primary',      bg: 'bg-primary/10' },
  subscription_warning: { icon: AlertCircle,   color: 'text-warning',      bg: 'bg-warning/10' },
  subscription_penalty: { icon: AlertCircle,   color: 'text-destructive',  bg: 'bg-destructive/10' },
  system:               { icon: Bell,          color: 'text-muted-foreground', bg: 'bg-muted' },
};

function timeAgo(dateStr: string) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

export default function NotificationsPage() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  return (
    <div className="min-h-screen bg-gradient-operations">
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        gradient
        actions={
          unreadCount > 0 ? (
            <button
              onClick={() => markAllRead.mutate()}
              className="text-primary-foreground/70 text-xs hover:text-primary-foreground transition-colors"
            >
              Mark all read
            </button>
          ) : undefined
        }
      />

      <div className="px-4 py-4 space-y-2 pb-28">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-display font-semibold text-foreground">No notifications yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              We'll notify you about lessons, payments & achievements
            </p>
          </div>
        ) : (
          notifications.map((notif, i) => {
            const config = TYPE_CONFIG[notif.type || ''] || TYPE_CONFIG.system;
            const Icon = config.icon;
            return (
              <motion.button
                key={notif.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => !notif.is_read && markRead.mutate(notif.id)}
                className={cn(
                  "w-full text-left p-4 rounded-2xl border transition-all",
                  notif.is_read
                    ? "bg-card border-border opacity-60"
                    : "bg-card border-primary/20 shadow-sm"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", config.bg)}>
                    <Icon size={18} className={config.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {notif.body}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {timeAgo(notif.sent_at)}
                    </p>
                  </div>
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}
