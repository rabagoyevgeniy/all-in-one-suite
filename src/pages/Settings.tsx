import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const setLanguage = async (lang: 'en' | 'ru') => {
    if (!user?.id) return;
    await supabase.from('profiles').update({ language: lang }).eq('id', user.id);
    queryClient.invalidateQueries({ queryKey: ['user-language'] });
    toast({ title: lang === 'ru' ? 'Язык изменён' : 'Language updated', duration: 1500 });
  };

  return (
    <div className="space-y-6 px-4 py-4">
      {/* Language */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          🌐 Language / Язык
        </h2>
        <div className="bg-card rounded-2xl border border-border divide-y divide-border">
          {[
            { code: 'en' as const, label: 'English', flag: '🇬🇧' },
            { code: 'ru' as const, label: 'Русский', flag: '🇷🇺' },
          ].map(({ code, label, flag }) => (
            <button
              key={code}
              onClick={() => setLanguage(code)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{flag}</span>
                <span className="text-sm font-medium">{label}</span>
              </div>
              {language === code && <Check className="w-4 h-4 text-primary" />}
            </button>
          ))}
        </div>
      </section>

      {/* Notifications */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          🔔 Notifications
        </h2>
        <div className="bg-card rounded-2xl border border-border divide-y divide-border">
          {[
            { key: 'lessons', label: 'Lesson reminders' },
            { key: 'payments', label: 'Payment alerts' },
            { key: 'messages', label: 'New messages' },
            { key: 'achievements', label: 'Achievements & belts' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm">{label}</span>
              <Switch defaultChecked />
            </div>
          ))}
        </div>
      </section>

      {/* Appearance */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          🎨 Appearance
        </h2>
        <div className="bg-card rounded-2xl border border-border divide-y divide-border">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm">Dark mode</span>
            <Switch />
          </div>
        </div>
      </section>

      {/* Account */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          👤 Account
        </h2>
        <div className="bg-card rounded-2xl border border-border divide-y divide-border">
          <button
            onClick={() => {
              const { role } = useAuthStore.getState();
              const profileRoute = role === 'coach' ? '/coach/profile'
                : role === 'student' ? '/student/profile'
                : role === 'pro_athlete' ? '/pro/profile'
                : '/';
              navigate(profileRoute);
            }}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 first:rounded-t-2xl"
          >
            <span className="text-sm">Edit Profile</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </section>

      {/* App info */}
      <section>
        <div className="bg-card rounded-2xl border border-border px-4 py-3 text-center space-y-1">
          <p className="text-sm font-semibold">ProFit Swimming Academy</p>
          <p className="text-xs text-muted-foreground">Version 1.0.0</p>
          <p className="text-xs text-muted-foreground">Dubai & Baku</p>
        </div>
      </section>
    </div>
  );
}
