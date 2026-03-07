import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

const DEFAULT_SETTINGS: Record<string, boolean> = {
  lesson_reminders: true,
  payment_alerts: true,
  achievements: true,
  messages: true,
  duels: true,
  promotions: false,
  progress_reports: true,
  coach_notes: true,
  personal_bests: true,
  new_slots: true,
};

const NOTIFICATION_OPTIONS: { key: string; label: string }[] = [
  { key: 'lesson_reminders', label: '🏊 Lesson reminders (24h & 1h)' },
  { key: 'payment_alerts', label: '💳 Payment alerts' },
  { key: 'achievements', label: '🏆 Achievements & belts' },
  { key: 'messages', label: '💬 New messages' },
  { key: 'duels', label: '⚔️ Duel challenges' },
  { key: 'progress_reports', label: '📊 Progress reports' },
  { key: 'coach_notes', label: '📋 Coach notes' },
  { key: 'personal_bests', label: '⚡ Personal bests' },
  { key: 'new_slots', label: '📅 New available slots' },
  { key: 'promotions', label: '🎁 Promotions & offers' },
];

export function NotificationSettings() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<Record<string, boolean>>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  // Load from profile on mount
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('notification_prefs')
        .eq('id', user.id)
        .single();
      if (data?.notification_prefs && typeof data.notification_prefs === 'object') {
        setSettings({ ...DEFAULT_SETTINGS, ...(data.notification_prefs as Record<string, boolean>) });
      }
      setLoaded(true);
    })();
  }, [user?.id]);

  const handleToggle = async (key: string) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);

    const { error } = await supabase
      .from('profiles')
      .update({ notification_prefs: newSettings } as any)
      .eq('id', user!.id);

    if (error) {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
      setSettings(settings); // revert
    } else {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    }
  };

  if (!loaded) return null;

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
              onClick={() => handleToggle(key)}
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
