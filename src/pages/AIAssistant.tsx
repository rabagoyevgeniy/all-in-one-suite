import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Send, Sparkles, Loader2, Trash2, Lock, Mic,
  BarChart2, Users, DollarSign, Settings,
  Calendar, Target, FileText,
  TrendingUp, Home, CreditCard,
  Star, Swords, Lightbulb
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ROLE_CONFIG, DEFAULT_ROLE_CONFIG } from '@/lib/ai-config';

interface RoleModeConfig {
  greeting: { en: string; ru: string };
  subtitle: { en: string; ru: string };
  modes: { id: string; label: string; chips: { en: string[]; ru: string[] } }[];
}

const ROLE_MODES: Record<string, RoleModeConfig> = {
  admin: {
    greeting: { en: 'Hello, Director! 👑', ru: 'Здравствуйте, Директор! 👑' },
    subtitle: { en: 'Full access to all ProFit analytics and controls', ru: 'Полный доступ ко всей аналитике и управлению ProFit' },
    modes: [
      { id: 'analytics', label: '📊 Analytics', chips: { en: ['Show revenue this month', 'Compare Dubai vs Baku performance', 'Which coach has the best rating?', 'How many active clients do we have?'], ru: ['Показать выручку за месяц', 'Сравнить Дубай и Баку', 'У какого тренера лучший рейтинг?', 'Сколько активных клиентов?'] } },
      { id: 'coaches', label: '🏊 Coaches', chips: { en: ['Who are my top performing coaches?', 'Show coach KPI summary', 'Which coach had most cancellations?', 'Suggest coach training improvements'], ru: ['Кто лучшие тренеры?', 'Показать KPI тренеров', 'У кого больше всего отмен?', 'Предложить улучшения обучения'] } },
      { id: 'finance', label: '💰 Finance', chips: { en: ['What is our monthly revenue trend?', 'Show overdue payments', 'Which plan sells best in Dubai?', 'Forecast next month revenue'], ru: ['Какой тренд выручки?', 'Показать просроченные платежи', 'Какой план продаётся лучше в Дубае?', 'Прогноз выручки'] } },
      { id: 'operations', label: '⚙️ Operations', chips: { en: ['How many lessons scheduled this week?', 'Show cancellation rate', 'Which time slots are most popular?', 'Draft announcement for all clients'], ru: ['Сколько уроков на этой неделе?', 'Показать процент отмен', 'Какие слоты популярнее?', 'Написать объявление для клиентов'] } },
    ],
  },
  head_manager: {
    greeting: { en: 'Hello, Director! 👑', ru: 'Здравствуйте, Директор! 👑' },
    subtitle: { en: 'Full access to all ProFit analytics and controls', ru: 'Полный доступ ко всей аналитике и управлению ProFit' },
    modes: [
      { id: 'analytics', label: '📊 Analytics', chips: { en: ['Show revenue this month', 'Compare Dubai vs Baku performance', 'Which coach has the best rating?', 'How many active clients do we have?'], ru: ['Показать выручку за месяц', 'Сравнить Дубай и Баку', 'У какого тренера лучший рейтинг?', 'Сколько активных клиентов?'] } },
      { id: 'coaches', label: '🏊 Coaches', chips: { en: ['Who are my top performing coaches?', 'Show coach KPI summary', 'Which coach had most cancellations?', 'Suggest coach training improvements'], ru: ['Кто лучшие тренеры?', 'Показать KPI тренеров', 'У кого больше всего отмен?', 'Предложить улучшения обучения'] } },
      { id: 'finance', label: '💰 Finance', chips: { en: ['What is our monthly revenue trend?', 'Show overdue payments', 'Which plan sells best in Dubai?', 'Forecast next month revenue'], ru: ['Какой тренд выручки?', 'Показать просроченные платежи', 'Какой план продаётся лучше в Дубае?', 'Прогноз выручки'] } },
      { id: 'operations', label: '⚙️ Operations', chips: { en: ['How many lessons scheduled this week?', 'Show cancellation rate', 'Which time slots are most popular?', 'Draft announcement for all clients'], ru: ['Сколько уроков на этой неделе?', 'Показать процент отмен', 'Какие слоты популярнее?', 'Написать объявление для клиентов'] } },
    ],
  },
  coach: {
    greeting: { en: 'Hello, Coach! 🏊', ru: 'Привет, Тренер! 🏊' },
    subtitle: { en: 'Your students, schedule and teaching tools', ru: 'Ваши ученики, расписание и инструменты' },
    modes: [
      { id: 'students', label: '👦 Students', chips: { en: ['Summarize my students progress', 'Who needs extra attention this week?', 'Which student is closest to next belt?', 'Generate progress report for a student'], ru: ['Прогресс моих учеников', 'Кому нужно больше внимания?', 'Кто ближе всего к новому поясу?', 'Создать отчёт о прогрессе'] } },
      { id: 'schedule', label: '📅 Schedule', chips: { en: ['Show my lessons for today', 'What is my route tomorrow?', 'Any cancellations this week?', 'Help me reschedule a lesson'], ru: ['Мои уроки на сегодня', 'Какой маршрут завтра?', 'Есть отмены на этой неделе?', 'Помоги перенести урок'] } },
      { id: 'technique', label: '🎯 Technique', chips: { en: ['Drills for teaching freestyle to beginners', 'How to fix breathing technique?', 'Backstroke correction tips', 'Exercises for 5-year-old swimmers'], ru: ['Упражнения для обучения кролю новичков', 'Как исправить технику дыхания?', 'Советы по коррекции на спине', 'Упражнения для 5-летних'] } },
      { id: 'reports', label: '📝 Reports', chips: { en: ['Help write a lesson report', 'Suggest goals for next lesson', 'Write parent feedback message', "Summarize this week's sessions"], ru: ['Помоги написать отчёт об уроке', 'Предложи цели на следующий урок', 'Написать сообщение родителю', 'Итоги за неделю'] } },
    ],
  },
  parent: {
    greeting: { en: 'Hello! 👋', ru: 'Привет! 👋' },
    subtitle: { en: "Track your child's swimming journey", ru: 'Следите за прогрессом вашего ребёнка' },
    modes: [
      { id: 'progress', label: '📈 Progress', chips: { en: ['How is my child progressing?', 'What belt level is my child at?', 'How many lessons until next belt test?', 'Show recent achievements'], ru: ['Как прогрессирует мой ребёнок?', 'Какой пояс у моего ребёнка?', 'Сколько уроков до следующего теста?', 'Показать последние достижения'] } },
      { id: 'schedule', label: '📅 Schedule', chips: { en: ['When is the next lesson?', 'How many lessons are left in my pack?', "Can I reschedule tomorrow's lesson?", 'What time does the coach arrive?'], ru: ['Когда следующий урок?', 'Сколько уроков осталось в пакете?', 'Можно перенести завтрашний урок?', 'Во сколько приедет тренер?'] } },
      { id: 'practice', label: '🏠 Practice', chips: { en: ['What should my child practice at home?', 'Water safety tips for kids', 'How to make practice fun?', 'Breathing exercises between lessons'], ru: ['Что практиковать дома?', 'Советы по безопасности на воде', 'Как сделать практику веселее?', 'Дыхательные упражнения'] } },
      { id: 'billing', label: '💳 Billing', chips: { en: ['How many lessons do I have left?', 'What packages are available?', 'How do I pay for more lessons?', 'Show my payment history'], ru: ['Сколько уроков осталось?', 'Какие пакеты доступны?', 'Как оплатить ещё уроки?', 'Показать историю оплат'] } },
    ],
  },
  student: {
    greeting: { en: 'Hey, Champion! 🏆', ru: 'Привет, Чемпион! 🏆' },
    subtitle: { en: 'Level up your swimming skills!', ru: 'Прокачай свои навыки плавания!' },
    modes: [
      { id: 'progress', label: '⭐ My Level', chips: { en: ['How many XP to next belt?', 'Show my achievements', "What's my current rank?", 'How do I earn more coins?'], ru: ['Сколько XP до следующего пояса?', 'Покажи мои достижения', 'Какой у меня ранг?', 'Как заработать больше монет?'] } },
      { id: 'duels', label: '⚔️ Duels', chips: { en: ['How do I challenge someone?', 'What are the duel rules?', 'Show my duel history', 'Who can I challenge now?'], ru: ['Как бросить вызов?', 'Какие правила дуэлей?', 'Покажи историю дуэлей', 'Кому можно бросить вызов?'] } },
      { id: 'tips', label: '💡 Tips', chips: { en: ['Breathing tips for freestyle', 'How to swim faster?', 'Tips for my next belt test', 'Fun swimming challenges'], ru: ['Советы по дыханию для кроля', 'Как плавать быстрее?', 'Советы для теста на пояс', 'Весёлые задания по плаванию'] } },
      { id: 'goals', label: '🎯 Goals', chips: { en: ['Set a swimming goal for this week', 'What should I focus on?', 'How to prepare for belt test?', 'Motivate me to practice!'], ru: ['Поставить цель на неделю', 'На чём сосредоточиться?', 'Как подготовиться к тесту?', 'Мотивируй меня!'] } },
    ],
  },
  pro_athlete: {
    greeting: { en: "Let's compete! 🏆", ru: 'Вперёд к победе! 🏆' },
    subtitle: { en: 'Your performance optimization assistant', ru: 'Помощник по оптимизации результатов' },
    modes: [
      { id: 'performance', label: '📊 Performance', chips: { en: ['Analyze my recent race times', 'How to improve my 100m freestyle?', 'Compare my progress month over month', 'What are my weaknesses?'], ru: ['Анализ моих результатов', 'Как улучшить 100м кролем?', 'Сравнить прогресс по месяцам', 'Какие у меня слабые стороны?'] } },
      { id: 'duels', label: '⚔️ Duels', chips: { en: ['Duel strategy tips', 'Who should I challenge next?', 'Show my win/loss record', 'How to prepare for a duel?'], ru: ['Стратегия для дуэлей', 'Кому бросить вызов?', 'Мои победы и поражения', 'Как подготовиться к дуэлю?'] } },
      { id: 'training', label: '🏋️ Training', chips: { en: ['Create a competition prep plan', 'Dryland exercises for swimmers', 'Recovery routine after training', 'Nutrition tips for race day'], ru: ['План подготовки к соревнованию', 'Упражнения на суше', 'Восстановление после тренировки', 'Питание в день соревнований'] } },
      { id: 'goals', label: '🎯 Goals', chips: { en: ['Set a new personal best target', 'What records can I break?', 'Plan my season goals', 'Track my progression'], ru: ['Новая цель по времени', 'Какие рекорды побить?', 'Цели на сезон', 'Отслеживать прогресс'] } },
    ],
  },
  personal_manager: {
    greeting: { en: 'Hello, Manager! 📋', ru: 'Привет, Менеджер! 📋' },
    subtitle: { en: 'Client management assistant', ru: 'Помощник по работе с клиентами' },
    modes: [
      { id: 'clients', label: '👥 Clients', chips: { en: ['Show my client list', 'Which clients are inactive?', 'Client retention suggestions', 'Draft follow-up message'], ru: ['Список моих клиентов', 'Кто из клиентов неактивен?', 'Советы по удержанию', 'Написать follow-up'] } },
      { id: 'commission', label: '💰 Commission', chips: { en: ['Commission summary for this month', 'Which client brings most revenue?', 'How to increase my earnings?', 'Compare this vs last month'], ru: ['Комиссия за этот месяц', 'Какой клиент приносит больше?', 'Как увеличить заработок?', 'Сравнить с прошлым месяцем'] } },
      { id: 'schedule', label: '📅 Schedule', chips: { en: ['My clients lessons this week', 'Any upcoming cancellations?', 'Help schedule a new client', 'Booking reminders to send'], ru: ['Уроки клиентов на неделе', 'Есть ли отмены?', 'Записать нового клиента', 'Напоминания о бронировании'] } },
      { id: 'reports', label: '📝 Reports', chips: { en: ['Generate weekly client report', 'Best practices for client retention', 'Draft communication to parent', 'Summarize client feedback'], ru: ['Недельный отчёт по клиентам', 'Лучшие практики удержания', 'Написать сообщение родителю', 'Итоги отзывов клиентов'] } },
    ],
  },
};

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

  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    if (permLoading || authLoading) {
      const timer = setTimeout(() => setLoadingTimeout(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [permLoading, authLoading]);

  if ((permLoading || authLoading) && !loadingTimeout) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadingTimeout || !effectiveRole) {
    return (
      <div className="flex items-center justify-center h-screen px-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="font-bold text-foreground text-lg">AI Assistant unavailable</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            The AI service is temporarily unavailable. Please try again in a moment.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-medium"
          >
            Try Again
          </button>
        </div>
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

          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center justify-center gap-2 py-1.5 bg-destructive/5">
              <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-xs text-destructive font-medium">
                {t('Recording... tap to stop', 'Запись... нажмите для остановки')}
              </span>
            </div>
          )}

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
