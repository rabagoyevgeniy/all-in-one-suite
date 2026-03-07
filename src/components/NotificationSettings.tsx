import { useState } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

const NOTIFICATION_OPTIONS: { key: string; label: string }[] = [
  { key: 'lesson_reminders', label: '🏊 Lesson reminders (24h & 1h)' },
  { key: 'payment_alerts', label: '💳 Payment alerts' },
  { key: 'achievements', label: '🏆 Achievements & belts' },
  { key: 'messages', label: '💬 New messages' },
  { key: 'duels', label: '⚔️ Duel challenges' },
  { key: 'promotions', label: '🎁 Promotions & offers' },
];

export function NotificationSettings() {
  const [settings, setSettings] = useState<Record<string, boolean>>({
    lesson_reminders: true,
    payment_alerts: true,
    achievements: true,
    messages: true,
    duels: true,
    promotions: false,
  });

  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
      <h3 className="font-display font-semibold text-sm text-foreground flex items-center gap-2">
        <Bell size={16} className="text-primary" />
        Notifications
      </h3>

      <div className="space-y-2">
        {NOTIFICATION_OPTIONS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between py-1.5">
            <span className="text-sm text-foreground">{label}</span>
            <button
              onClick={() => setSettings(s => ({ ...s, [key]: !s[key] }))}
              className={cn(
                "w-11 h-6 rounded-full transition-colors relative",
                settings[key] ? "bg-primary" : "bg-muted"
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform",
                  settings[key] ? "translate-x-[22px]" : "translate-x-0.5"
                )}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
