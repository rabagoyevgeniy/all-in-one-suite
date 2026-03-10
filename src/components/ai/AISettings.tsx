import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Trash2, Download, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AIPreferences {
  responseStyle: 'concise' | 'balanced' | 'detailed';
  responseLanguage: 'auto' | 'en' | 'ru';
  showSuggestions: boolean;
  showModeTabs: boolean;
  autoScroll: boolean;
  soundEnabled: boolean;
  dailyBriefing: boolean;
  taskReminders: boolean;
  proactiveInsights: boolean;
}

const DEFAULT_PREFS: AIPreferences = {
  responseStyle: 'balanced',
  responseLanguage: 'auto',
  showSuggestions: true,
  showModeTabs: true,
  autoScroll: true,
  soundEnabled: false,
  dailyBriefing: true,
  taskReminders: true,
  proactiveInsights: false,
};

const PREFS_KEY = 'profit_ai_preferences';

export function useAIPreferences() {
  const [prefs, setPrefs] = useState<AIPreferences>(() => {
    try {
      const saved = localStorage.getItem(PREFS_KEY);
      return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS;
    } catch {
      return DEFAULT_PREFS;
    }
  });

  const updatePref = <K extends keyof AIPreferences>(key: K, value: AIPreferences[K]) => {
    setPrefs(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      return next;
    });
  };

  return { prefs, updatePref };
}

interface AISettingsProps {
  isOpen: boolean;
  onClose: () => void;
  messagesUsed: number;
  dailyLimit: number;
  activeConversationId: string | null;
  onClearConversation: () => void;
}

export default function AISettings({
  isOpen,
  onClose,
  messagesUsed,
  dailyLimit,
  activeConversationId,
  onClearConversation,
}: AISettingsProps) {
  const { t } = useLanguage();
  const { role } = useAuthStore();
  const { prefs, updatePref } = useAIPreferences();
  const [clearing, setClearing] = useState(false);

  const handleClearHistory = async () => {
    if (!activeConversationId) return;
    setClearing(true);
    try {
      await supabase.from('ai_messages').delete().eq('conversation_id', activeConversationId);
      onClearConversation();
      toast({ title: t('Conversation cleared', 'Диалог очищен') });
      onClose();
    } catch {
      toast({ title: t('Error', 'Ошибка'), variant: 'destructive' });
    } finally {
      setClearing(false);
    }
  };

  const styleOptions: { value: AIPreferences['responseStyle']; label: string }[] = [
    { value: 'concise', label: t('Concise', 'Кратко') },
    { value: 'balanced', label: t('Balanced', 'Баланс') },
    { value: 'detailed', label: t('Подробно', 'Detailed') },
  ];

  const langOptions: { value: AIPreferences['responseLanguage']; label: string }[] = [
    { value: 'auto', label: t('Auto', 'Авто') },
    { value: 'en', label: 'English' },
    { value: 'ru', label: 'Русский' },
  ];

  const planLabel = (() => {
    if (dailyLimit >= 9999) return t('Unlimited', 'Безлимит');
    return `${dailyLimit} ${t('messages/day', 'сообщ./день')}`;
  })();

  const roleLabel = role
    ? role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' ')
    : 'User';

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2 text-lg">
            ⚙️ {t('ProFit AI Settings', 'Настройки ProFit AI')}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* AI Behavior */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              🤖 {t('AI Behavior', 'Поведение AI')}
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">{t('Response style', 'Стиль ответов')}</p>
                <div className="flex gap-1 bg-muted rounded-xl p-1">
                  {styleOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updatePref('responseStyle', opt.value)}
                      className={cn(
                        'flex-1 text-xs py-2 rounded-lg font-medium transition-colors',
                        prefs.responseStyle === opt.value
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">{t('Response language', 'Язык ответов')}</p>
                <div className="flex gap-1 bg-muted rounded-xl p-1">
                  {langOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updatePref('responseLanguage', opt.value)}
                      className={cn(
                        'flex-1 text-xs py-2 rounded-lg font-medium transition-colors',
                        prefs.responseLanguage === opt.value
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* Notifications */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              🔔 {t('Notifications', 'Уведомления')}
            </h3>
            <div className="space-y-3">
              <SettingToggle
                label={t('Daily briefing', 'Ежедневный брифинг')}
                checked={prefs.dailyBriefing}
                onChange={(v) => updatePref('dailyBriefing', v)}
              />
              <SettingToggle
                label={t('Task reminders', 'Напоминания о задачах')}
                checked={prefs.taskReminders}
                onChange={(v) => updatePref('taskReminders', v)}
              />
              <SettingToggle
                label={t('Proactive insights', 'Проактивные советы')}
                checked={prefs.proactiveInsights}
                onChange={(v) => updatePref('proactiveInsights', v)}
              />
            </div>
          </section>

          <Separator />

          {/* Chat Preferences */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              💬 {t('Chat Preferences', 'Настройки чата')}
            </h3>
            <div className="space-y-3">
              <SettingToggle
                label={t('Show suggested questions', 'Показывать подсказки')}
                checked={prefs.showSuggestions}
                onChange={(v) => updatePref('showSuggestions', v)}
              />
              <SettingToggle
                label={t('Show mode tabs', 'Показывать вкладки режимов')}
                checked={prefs.showModeTabs}
                onChange={(v) => updatePref('showModeTabs', v)}
              />
              <SettingToggle
                label={t('Auto-scroll to latest', 'Автопрокрутка')}
                checked={prefs.autoScroll}
                onChange={(v) => updatePref('autoScroll', v)}
              />
              <SettingToggle
                label={t('Sound on AI response', 'Звук при ответе AI')}
                checked={prefs.soundEnabled}
                onChange={(v) => updatePref('soundEnabled', v)}
              />
            </div>
          </section>

          <Separator />

          {/* Usage & Limits */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              📊 {t('Usage & Limits', 'Использование')}
            </h3>
            <div className="bg-muted rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('Messages today', 'Сообщений сегодня')}</span>
                <span className="font-semibold text-foreground">
                  {messagesUsed}/{dailyLimit >= 9999 ? '∞' : dailyLimit}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('Plan', 'Тариф')}</span>
                <span className="font-semibold text-foreground">{roleLabel} ({planLabel})</span>
              </div>
              {dailyLimit < 9999 && (
                <div className="w-full bg-background rounded-full h-2 mt-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (messagesUsed / dailyLimit) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          </section>

          <Separator />

          {/* Data */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              🗑️ {t('Data', 'Данные')}
            </h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 rounded-xl"
                onClick={handleClearHistory}
                disabled={clearing || !activeConversationId}
              >
                {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {t('Clear current conversation', 'Очистить текущий диалог')}
              </Button>
            </div>
          </section>

          <Separator />

          {/* About */}
          <section className="pb-6">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" /> {t('About', 'О приложении')}
            </h3>
            <div className="bg-muted rounded-xl p-4 space-y-1">
              <p className="text-sm font-medium text-foreground">ProFit AI v2.0</p>
              <p className="text-xs text-muted-foreground">Powered by Claude</p>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SettingToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
