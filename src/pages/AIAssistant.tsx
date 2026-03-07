import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Send, Sparkles, Loader2, Trash2, Lock, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ROLE_CONFIG, DEFAULT_ROLE_CONFIG, MODE_LABELS, MODE_PROMPTS, type AIMode } from '@/lib/ai-config';

type Msg = { role: 'user' | 'assistant'; content: string; mode?: AIMode };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

// --- Daily insight generation ---
function generateInsight(lang: 'en' | 'ru', lastLessonDaysAgo?: number): { text: string; cta: string } | null {
  if (lastLessonDaysAgo != null && lastLessonDaysAgo > 5) {
    return {
      text: lang === 'ru'
        ? `Прошло ${lastLessonDaysAgo} дней с последнего урока. Регулярная практика повышает результаты на 40%.`
        : `It's been ${lastLessonDaysAgo} days since the last lesson. Regular practice improves retention by 40%.`,
      cta: lang === 'ru' ? 'Записаться на урок →' : 'Book a lesson →',
    };
  }
  // Fallback motivational
  const tips = lang === 'ru'
    ? [
        { text: 'Совет дня: Регулярная разминка перед уроком снижает риск травм на 60%.', cta: 'Узнать больше →' },
        { text: 'Отличный день для плавания! ☀️ Погода идеально подходит для бассейна.', cta: 'Посмотреть расписание →' },
      ]
    : [
        { text: 'Tip: Regular warm-up before lessons reduces injury risk by 60%.', cta: 'Learn more →' },
        { text: 'Great day for swimming! ☀️ Perfect pool weather today.', cta: 'View schedule →' },
      ];
  return tips[new Date().getDate() % tips.length];
}

export default function AIAssistant() {
  const navigate = useNavigate();
  const { role, session, user, isLoading: authLoading } = useAuthStore();
  const { language, t } = useLanguage();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<AIMode>('general');
  const [isRecording, setIsRecording] = useState(false);
  const [insightDismissed, setInsightDismissed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const effectiveRole = role || null;
  const config = effectiveRole ? (ROLE_CONFIG[effectiveRole] || DEFAULT_ROLE_CONFIG) : DEFAULT_ROLE_CONFIG;
  const lang = language === 'ru' ? 'ru' : 'en';

  // Fetch AI permissions
  const { data: permissions, isLoading: permLoading } = useQuery({
    queryKey: ['ai-permissions', role],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_permissions')
        .select('*')
        .eq('role', role!)
        .eq('subscription_tier', 'basic')
        .single();
      return data;
    },
    enabled: !!role,
  });

  // Fetch today's usage
  const { data: usage, refetch: refetchUsage } = useQuery({
    queryKey: ['ai-usage-today', user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('ai_usage_log')
        .select('message_count')
        .eq('user_id', user!.id)
        .eq('usage_date', today)
        .single();
      return data?.message_count || 0;
    },
    enabled: !!user?.id,
  });

  // Fetch last lesson for insight
  const { data: lastLessonDaysAgo } = useQuery({
    queryKey: ['last-lesson-days', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('bookings')
        .select('created_at')
        .or(`parent_id.eq.${user!.id},student_id.eq.${user!.id}`)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (!data?.created_at) return undefined;
      const diff = Math.floor((Date.now() - new Date(data.created_at).getTime()) / 86400000);
      return diff;
    },
    enabled: !!user?.id,
  });

  const dailyLimit = permissions?.daily_message_limit || config.dailyLimit;
  const messagesUsed = typeof usage === 'number' ? usage : 0;
  const messagesRemaining = Math.max(0, dailyLimit - messagesUsed);
  const canUseAI = permissions?.can_use_ai !== false;
  const allowedModes = config.modes;

  // Mode-specific suggestions
  const currentSuggestions = useMemo(() => {
    const modePrompts = MODE_PROMPTS[activeMode];
    return modePrompts?.[lang] || config.suggestions[lang];
  }, [activeMode, lang, config.suggestions]);

  const insight = useMemo(() => {
    if (insightDismissed) return null;
    return generateInsight(lang, lastLessonDaysAgo);
  }, [lang, lastLessonDaysAgo, insightDismissed]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const incrementUsage = useCallback(async () => {
    if (!user?.id) return;
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('ai_usage_log')
      .select('id, message_count')
      .eq('user_id', user.id)
      .eq('usage_date', today)
      .single();
    if (existing) {
      await supabase.from('ai_usage_log').update({ message_count: existing.message_count + 1 }).eq('id', existing.id);
    } else {
      await supabase.from('ai_usage_log').insert({ user_id: user.id, message_count: 1, usage_date: today });
    }
    refetchUsage();
  }, [user?.id, refetchUsage]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    if (messagesRemaining <= 0) {
      toast({ title: t('Daily limit reached', 'Лимит исчерпан'), description: t(`You've used all ${dailyLimit} messages for today`, `Вы использовали все ${dailyLimit} сообщений на сегодня`), variant: 'destructive' });
      return;
    }

    const userMsg: Msg = { role: 'user', content: text, mode: activeMode };
    setInput('');
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    let assistantSoFar = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ messages: [...messages, userMsg], mode: activeMode }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Unknown error' }));
        if (err.error === 'daily_limit_reached') {
          toast({ title: t('Daily limit reached', 'Лимит исчерпан'), variant: 'destructive' });
          setMessages(prev => prev.slice(0, -1));
          return;
        }
        if (err.error === 'mode_not_allowed') {
          toast({ title: t('Mode not available', 'Режим недоступен'), variant: 'destructive' });
          setMessages(prev => prev.slice(0, -1));
          return;
        }
        throw new Error(err.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error('No response body');
      await incrementUsage();

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
          }
          return [...prev, { role: 'assistant', content: assistantSoFar, mode: activeMode }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ') || line.trim() === '') continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              upsertAssistant(parsed.delta.text);
            }
          } catch { /* partial JSON */ }
        }
      }
    } catch (e: any) {
      console.error('AI chat error:', e);
      toast({ title: 'AI Error', description: e.message, variant: 'destructive' });
      if (!assistantSoFar) setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, session?.access_token, messagesRemaining, incrementUsage, activeMode, dailyLimit, t]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Voice input
  const toggleVoice = useCallback(() => {
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: t('Not supported', 'Не поддерживается'), description: t('Voice input is not supported in this browser', 'Голосовой ввод не поддерживается в этом браузере'), variant: 'destructive' });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = language === 'ru' ? 'ru-RU' : 'en-US';
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(prev => prev ? prev + ' ' + transcript : transcript);
      setIsRecording(false);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [isRecording, language, t]);

  if (permLoading || authLoading || !effectiveRole) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const limitSegments = Math.min(dailyLimit, 10);
  const segmentRatio = dailyLimit < 9999 ? dailyLimit / limitSegments : 0;

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-violet-50 to-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className={cn("w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center", config.color)}>
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-foreground text-sm">ProFit AI</h1>
            <p className="text-[11px] text-muted-foreground truncate">{config.subtitle[lang]}</p>
          </div>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Mode pills */}
        {canUseAI && allowedModes.length > 1 && (
          <div className="max-w-lg mx-auto mt-2">
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {allowedModes.map(mode => {
                const label = MODE_LABELS[mode];
                return (
                  <button
                    key={mode}
                    onClick={() => setActiveMode(mode)}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                      activeMode === mode
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    <span>{label.icon}</span>
                    <span>{label[lang]}</span>
                  </button>
                );
              })}
            </div>

            {/* Visual message limit bar */}
            {dailyLimit < 9999 && (
              <div className="flex items-center gap-2 px-1 mt-2">
                <div className="flex gap-0.5 flex-1">
                  {Array.from({ length: limitSegments }).map((_, i) => {
                    const filledUpTo = segmentRatio > 0 ? Math.ceil(messagesUsed / segmentRatio) : 0;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex-1 h-1.5 rounded-full transition-colors",
                          i < filledUpTo ? "bg-primary" : "bg-muted"
                        )}
                      />
                    );
                  })}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {messagesUsed}/{dailyLimit} {t('today', 'сегодня')}
                </span>
                {messagesUsed >= dailyLimit * 0.8 && (
                  <span className="text-xs bg-warning/20 text-warning-foreground px-2 py-0.5 rounded-full font-medium animate-pulse">
                    ⭐ {t('Go Premium', 'Премиум')}
                  </span>
                )}
              </div>
            )}
            {dailyLimit >= 9999 && (
              <div className="flex items-center gap-2 px-1 mt-2">
                <span className="text-muted-foreground text-xs">
                  {messagesUsed} / ∞ {t('messages today', 'сообщений сегодня')}
                </span>
              </div>
            )}
          </div>
        )}
      </header>

      {!canUseAI ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-bold text-foreground mb-2">{t('AI Assistant — Premium', 'AI Помощник — Премиум')}</h3>
          <p className="text-muted-foreground text-sm mb-6">
            {t('Upgrade to Basic or higher to access ProFit AI', 'Обновитесь до Basic или выше для доступа к ProFit AI')}
          </p>
          <button className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-2xl font-medium">
            {t('Upgrade Plan', 'Улучшить план')}
          </button>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full space-y-4">
            {/* Daily insight card */}
            {messages.length === 0 && insight && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-4 text-white"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 text-lg">
                    💡
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm mb-1">{t("Today's Insight", 'Совет дня')}</div>
                    <div className="text-white/90 text-sm leading-relaxed">{insight.text}</div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => { setInput(insight.cta.replace(' →', '')); inputRef.current?.focus(); }}
                        className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1 rounded-full transition-colors"
                      >
                        {insight.cta}
                      </button>
                      <button
                        onClick={() => setInsightDismissed(true)}
                        className="text-white/50 hover:text-white/80 text-xs px-2 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center gap-4 py-12">
                <div className={cn("w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg", config.color)}>
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-foreground">{config.greeting}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{config.subtitle[lang]}</p>
                </div>

                {/* Animated mode-specific suggestions */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeMode}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-1 gap-2 w-full max-w-xs"
                  >
                    {currentSuggestions.map((s, i) => (
                      <motion.button
                        key={s}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => { setInput(s); inputRef.current?.focus(); }}
                        className="text-left text-xs px-3 py-2.5 rounded-xl bg-background border border-border text-foreground hover:border-primary/40 transition-colors"
                      >
                        {s}
                      </motion.button>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%]">
                  {msg.role === 'assistant' && msg.mode && msg.mode !== 'general' && (
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[10px] bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full font-medium">
                        {MODE_LABELS[msg.mode]?.icon} {MODE_LABELS[msg.mode]?.[lang]}
                      </span>
                    </div>
                  )}
                  {msg.role === 'assistant' && (role === 'admin' || role === 'head_manager') && i === 1 && (
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                        👑 ADMIN ACCESS
                      </span>
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                      msg.role === 'user'
                        ? cn("bg-gradient-to-br text-white rounded-br-md", config.color)
                        : "bg-background border border-border text-foreground rounded-bl-md shadow-sm"
                    )}
                  >
                    {msg.content}
                    {msg.role === 'assistant' && isLoading && i === messages.length - 1 && (
                      <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5 rounded-full align-middle" />
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="bg-background border border-border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border bg-background px-4 py-3">
            <div className="max-w-lg mx-auto flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('Ask ProFit AI...', 'Спросите ProFit AI...')}
                rows={1}
                className="flex-1 resize-none rounded-2xl border border-border bg-muted/50 px-4 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                           max-h-32 overflow-y-auto"
                style={{ minHeight: '42px' }}
              />
              {/* Voice input */}
              <button
                onClick={toggleVoice}
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                  isRecording
                    ? "bg-destructive scale-110 shadow-lg shadow-destructive/30"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {isRecording ? (
                  <div className="w-3 h-3 bg-destructive-foreground rounded-sm" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
              {/* Send */}
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading || messagesRemaining <= 0}
                className={cn(
                  "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white disabled:opacity-40 transition-opacity flex-shrink-0",
                  config.color
                )}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
