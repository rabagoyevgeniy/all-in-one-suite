import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Bell, CreditCard, Trophy, Swords, MessageCircle, AlertCircle, Star, Check,
  CloudRain, BarChart2, Zap, ClipboardList, CalendarPlus, Car, MapPin,
  AlertTriangle, Clock, Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import type { AppNotification } from '@/hooks/useNotifications';

const TYPE_CONFIG: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  lesson_reminder:        { icon: Bell,          color: 'text-primary',           bg: 'bg-primary/10' },
  lesson_reminder_24h:    { icon: Bell,          color: 'text-primary',           bg: 'bg-primary/10' },
  lesson_reminder_1h:     { icon: Bell,          color: 'text-primary',           bg: 'bg-primary/10' },
  lesson_cancelled:       { icon: AlertCircle,   color: 'text-destructive',       bg: 'bg-destructive/10' },
  lesson_confirmed:       { icon: Check,         color: 'text-success',           bg: 'bg-success/10' },
  lesson_completed:       { icon: Check,         color: 'text-success',           bg: 'bg-success/10' },
  payment_received:       { icon: CreditCard,    color: 'text-success',           bg: 'bg-success/10' },
  payment_due:            { icon: AlertTriangle,  color: 'text-warning',          bg: 'bg-warning/10' },
  coach_arriving:         { icon: Car,           color: 'text-primary',           bg: 'bg-primary/10' },
  coach_arrived:          { icon: MapPin,        color: 'text-success',           bg: 'bg-success/10' },
  achievement_unlocked:   { icon: Trophy,        color: 'text-coin',             bg: 'bg-coin/10' },
  achievement_earned:     { icon: Trophy,        color: 'text-coin',             bg: 'bg-coin/10' },
  achievement:            { icon: Trophy,        color: 'text-coin',             bg: 'bg-coin/10' },
  belt_upgraded:          { icon: Award,         color: 'text-purple-500',        bg: 'bg-purple-500/10' },
  duel_challenge:         { icon: Swords,        color: 'text-destructive',       bg: 'bg-destructive/10' },
  duel_result_win:        { icon: Trophy,        color: 'text-success',           bg: 'bg-success/10' },
  new_message:            { icon: MessageCircle, color: 'text-primary',           bg: 'bg-primary/10' },
  subscription_warning:   { icon: AlertCircle,   color: 'text-warning',           bg: 'bg-warning/10' },
  subscription_expiring:  { icon: Clock,         color: 'text-warning',           bg: 'bg-warning/10' },
  subscription_penalty:   { icon: AlertCircle,   color: 'text-destructive',       bg: 'bg-destructive/10' },
  // New types
  weather_alert:          { icon: CloudRain,     color: 'text-muted-foreground',  bg: 'bg-muted' },
  new_progress_report:    { icon: BarChart2,     color: 'text-primary',           bg: 'bg-primary/10' },
  personal_best:          { icon: Zap,           color: 'text-destructive',       bg: 'bg-destructive/10' },
  coach_note:             { icon: ClipboardList, color: 'text-primary',           bg: 'bg-primary/10' },
  new_slot_available:     { icon: CalendarPlus,  color: 'text-success',           bg: 'bg-success/10' },
  system:                 { icon: Bell,          color: 'text-muted-foreground',  bg: 'bg-muted' },
};

function timeAgo(dateStr: string) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

function groupNotifications(notifications: AppNotification[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  return {
    today: notifications.filter(n => new Date(n.sent_at) >= today),
    yesterday: notifications.filter(n => {
      const d = new Date(n.sent_at);
      return d >= yesterday && d < today;
    }),
    earlier: notifications.filter(n => new Date(n.sent_at) < yesterday),
  };
}

const GROUP_LABELS: Record<string, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  earlier: 'Earlier',
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  const handleNotificationTap = (notif: AppNotification) => {
    if (!notif.is_read) {
      markRead.mutate(notif.id);
    }

    switch (notif.type) {
      case 'lesson_confirmed':
      case 'lesson_cancelled':
      case 'lesson_completed':
      case 'lesson_reminder_24h':
      case 'lesson_reminder_1h':
      case 'lesson_reminder':
      case 'weather_alert':
        navigate('/parent/booking');
        break;
      case 'new_message':
        navigate('/chat');
        break;
      case 'achievement_unlocked':
      case 'achievement_earned':
      case 'achievement':
      case 'belt_upgraded':
        navigate('/student/profile');
        break;
      case 'duel_challenge':
      case 'duel_result_win':
        navigate('/student/duels');
        break;
      case 'payment_received':
      case 'payment_due':
      case 'subscription_warning':
      case 'subscription_expiring':
      case 'subscription_penalty':
      case 'new_slot_available':
        navigate('/payment');
        break;
      case 'new_progress_report':
      case 'coach_note':
      case 'personal_best':
        navigate('/student/profile');
        break;
      default:
        break;
    }
  };

  const groups = groupNotifications(notifications);

  const renderNotification = (notif: AppNotification, i: number) => {
    const config = TYPE_CONFIG[notif.type || ''] || TYPE_CONFIG.system;
    const Icon = config.icon;
    return (
      <motion.button
        key={notif.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.03 }}
        onClick={() => handleNotificationTap(notif)}
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
  };

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

      <div className="px-4 py-4 space-y-4 pb-28">
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
          Object.entries(groups).map(([group, items]) =>
            items.length > 0 ? (
              <div key={group} className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  {GROUP_LABELS[group]}
                </p>
                {items.map((notif, i) => renderNotification(notif, i))}
              </div>
            ) : null
          )
        )}
      </div>
    </div>
  );
}
