import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Send, Sparkles, Loader2, Trash2, Lock, Mic,
  BarChart2, Users, DollarSign, Settings,
  Calendar, Target, FileText,
  TrendingUp, Home, CreditCard,
  Star, Swords, Lightbulb,
  Clock, Search, X, Copy, ChevronRight, CheckSquare,
  Menu, PanelLeftOpen, PanelLeftClose,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';
import { useAIConversation, useAIConversations } from '@/hooks/useAIConversation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ROLE_CONFIG, DEFAULT_ROLE_CONFIG } from '@/lib/ai-config';
import { AITaskPanel } from '@/components/ai/AITaskPanel';
import { AIConversationSidebar } from '@/components/ai/AIConversationSidebar';
import { useAITasks } from '@/hooks/useAITasks';
import { useIsMobile } from '@/hooks/use-mobile';

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
    greeting: { en: 'Hello{name}! 👋', ru: 'Привет{name}! 👋' },
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

// --- Simple Markdown renderer ---
function MarkdownText({ content }: { content: string }) {
  const html = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h4 class="font-semibold text-sm mt-2 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="font-semibold text-base mt-3 mb-1">$1</h3>')
    .replace(/^- (.+)$/gm, '<div class="flex gap-1.5 ml-1"><span class="text-muted-foreground">•</span><span>$1</span></div>')
    .replace(/^(\d+)\. (.+)$/gm, '<div class="flex gap-1.5 ml-1"><span class="text-muted-foreground font-medium">$1.</span><span>$2</span></div>')
    .replace(/\n/g, '<br/>');
  return <div className="leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
}

// --- Message Actions ---
function AIMessageActions({ content, role: userRole }: { content: string; role: string }) {
  const navigate = useNavigate();

  const handleQuickLink = (path: string) => {
    const currentUrl = window.location.pathname + window.location.search;
    sessionStorage.setItem('ai_return_url', currentUrl);
    const convId = sessionStorage.getItem('profit_ai_active_conversation');
    if (convId) sessionStorage.setItem('ai_conversation_id', convId);
    navigate(path, { state: { from: 'ai-assistant' } });
  };

  const actions: { label: string; onClick: () => void }[] = [];
  const lc = content.toLowerCase();

  if (lc.match(/lesson|schedule|booking|урок|расписание/)) {
    if (userRole === 'admin' || userRole === 'head_manager')
      actions.push({ label: '📅 Bookings', onClick: () => handleQuickLink('/admin/bookings') });
    if (userRole === 'coach')
      actions.push({ label: '📅 Schedule', onClick: () => handleQuickLink('/coach/schedule') });
    if (userRole === 'parent')
      actions.push({ label: '📅 My Bookings', onClick: () => handleQuickLink('/parent/booking') });
  }

  if (lc.match(/payment|aed|revenue|платёж|выручка/)) {
    if (userRole === 'admin' || userRole === 'head_manager')
      actions.push({ label: '💰 Finance', onClick: () => handleQuickLink('/admin/financial') });
    else
      actions.push({ label: '💳 Payments', onClick: () => handleQuickLink('/parent/payments') });
  }

  if (lc.includes('coach') && (userRole === 'admin' || userRole === 'head_manager'))
    actions.push({ label: '🏊 Coaches', onClick: () => handleQuickLink('/admin/coaches') });

  if (lc.match(/student|ученик/) && (userRole === 'admin' || userRole === 'head_manager'))
    actions.push({ label: '👦 Clients', onClick: () => handleQuickLink('/admin/clients') });

  const copyText = () => {
    navigator.clipboard.writeText(content);
    toast({ title: '✅ Copied to clipboard' });
  };

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={action.onClick}
          className="text-[11px] px-2.5 py-1 rounded-lg bg-muted text-muted-foreground hover:bg-accent transition-colors flex items-center gap-1"
        >
          {action.label}
          <ChevronRight className="w-3 h-3" />
        </button>
      ))}
      <button
        onClick={copyText}
        className="text-[11px] px-2.5 py-1 rounded-lg bg-muted text-muted-foreground hover:bg-accent transition-colors flex items-center gap-1"
      >
        <Copy className="w-3 h-3" /> Copy
      </button>
    </div>
  );
}

export default function AIAssistant() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { role, session, user, isLoading: authLoading } = useAuthStore();
  const { language, t } = useLanguage();
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  const [detectedTask, setDetectedTask] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const roleModesConfig = ROLE_MODES[role || 'parent'] || ROLE_MODES.parent;
  const roleModes = roleModesConfig.modes;
  const [activeMode, setActiveMode] = useState(roleModes[0].id);

  // Conversation management
  const { createConversation, deleteConversation, refetch: refetchConversations } = useAIConversations(user?.id);

  // Active conversation ID — persisted in sessionStorage
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    return sessionStorage.getItem('profit_ai_active_conversation');
  });

  // Persist active conversation ID
  useEffect(() => {
    if (activeConversationId) {
      sessionStorage.setItem('profit_ai_active_conversation', activeConversationId);
    }
  }, [activeConversationId]);

  // Restore conversation when returning from quick-link navigation
  useEffect(() => {
    const savedId = sessionStorage.getItem('ai_conversation_id');
    if (savedId && savedId !== activeConversationId) {
      setActiveConversationId(savedId);
      sessionStorage.removeItem('ai_conversation_id');
    }
  }, []);

  const effectiveRole = role || null;
  const config = effectiveRole ? (ROLE_CONFIG[effectiveRole] || DEFAULT_ROLE_CONFIG) : DEFAULT_ROLE_CONFIG;
  const lang = language === 'ru' ? 'ru' : 'en';

  // Persistent conversation hook — keyed by activeConversationId
  const {
    messages,
    isLoading,
    isLoadingHistory,
    sendMessage,
    clearMessages,
  } = useAIConversation(activeConversationId, activeMode);

  const { urgentCount, createTask } = useAITasks();

  // Auto-create first conversation on mount if none exists
  useEffect(() => {
    if (!user?.id || activeConversationId) return;
    // Try to find an existing non-archived conversation
    supabase
      .from('ai_conversations')
      .select('id, mode')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setActiveConversationId(data.id);
          setActiveMode(data.mode || roleModes[0].id);
        } else {
          createConversation(roleModes[0].id).then((id) => {
            if (id) setActiveConversationId(id);
          });
        }
      });
  }, [user?.id]);

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

  const dailyLimit = permissions?.daily_message_limit || config.dailyLimit;
  const messagesUsed = typeof usage === 'number' ? usage : 0;
  const messagesRemaining = Math.max(0, dailyLimit - messagesUsed);
  const canUseAI = permissions?.can_use_ai !== false;

  const currentSuggestions = useMemo(() => {
    const currentMode = roleModes.find((m) => m.id === activeMode);
    return currentMode?.chips[lang] || roleModes[0].chips[lang];
  }, [activeMode, lang, roleModes]);

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

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    if (messagesRemaining <= 0) {
      toast({
        title: t('Daily limit reached', 'Лимит исчерпан'),
        description: t(`You've used all ${dailyLimit} messages for today`, `Вы использовали все ${dailyLimit} сообщений на сегодня`),
        variant: 'destructive',
      });
      return;
    }

    setInput('');
    setSuggestions([]);

    // Detect task intent
    const TASK_PATTERNS = [
      /^(?:create|add|make|set)?\s*(?:a\s+)?task[:\s]+(.+)/i,
      /^remind me to\s+(.+)/i,
      /^(?:i need to|i have to|i should)\s+(.+)/i,
      /^todo[:\s]+(.+)/i,
    ];
    let taskTitle: string | null = null;
    for (const pattern of TASK_PATTERNS) {
      const match = text.match(pattern);
      if (match) { taskTitle = match[match.length - 1].trim(); break; }
    }
    if (taskTitle) setDetectedTask(taskTitle);

    try {
      await incrementUsage();
      await sendMessage(text, (sugg) => setSuggestions(sugg));
      refetchConversations();
    } catch (e: any) {
      if (e.message === 'daily_limit_reached') {
        toast({ title: t('Daily limit reached', 'Лимит исчерпан'), variant: 'destructive' });
      } else if (e.message === 'mode_not_allowed') {
        toast({ title: t('Mode not available', 'Режим недоступен'), variant: 'destructive' });
      } else {
        toast({ title: 'AI Error', description: e.message, variant: 'destructive' });
      }
    }
  }, [input, isLoading, messagesRemaining, dailyLimit, t, incrementUsage, sendMessage, refetchConversations]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Tab switching — creates new conversation for mode if needed
  const handleTabSwitch = async (newMode: string) => {
    if (newMode === activeMode) return;
    setActiveMode(newMode);
    setSuggestions([]);

    // Find existing conversation for this mode or create one
    if (!user?.id) return;
    const { data: existing } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('user_id', user.id)
      .eq('mode', newMode)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      setActiveConversationId(existing.id);
    } else {
      const id = await createConversation(newMode);
      if (id) setActiveConversationId(id);
    }
  };

  // New conversation
  const handleNewConversation = async () => {
    const id = await createConversation(activeMode);
    if (id) {
      setActiveConversationId(id);
      clearMessages();
    }
  };

  // Select conversation from sidebar
  const handleSelectConversation = (id: string, mode: string) => {
    setActiveConversationId(id);
    setActiveMode(mode);
    setSuggestions([]);
  };

  // Clear / archive current conversation
  const handleClearConversation = async () => {
    if (!activeConversationId) return;
    await deleteConversation(activeConversationId);
    const id = await createConversation(activeMode);
    if (id) {
      setActiveConversationId(id);
      clearMessages();
    }
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
      toast({ title: t('Not supported', 'Не поддерживается'), variant: 'destructive' });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = language === 'ru' ? 'ru-RU' : 'en-US';
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      setInput((prev) => (prev ? prev + ' ' + e.results[0][0].transcript : e.results[0][0].transcript));
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
          <button onClick={() => window.location.reload()} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-medium">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const limitSegments = Math.min(dailyLimit, 10);
  const segmentRatio = dailyLimit < 9999 ? dailyLimit / limitSegments : 0;

  const briefingConfig = {
    admin: { icon: '📊', gradient: 'from-purple-500 to-indigo-600', label: 'Director Briefing' },
    head_manager: { icon: '📊', gradient: 'from-purple-500 to-indigo-600', label: 'Director Briefing' },
    coach: { icon: '🏊', gradient: 'from-blue-500 to-cyan-500', label: 'Coach Update' },
    parent: { icon: '👨‍👩‍👧', gradient: 'from-green-400 to-teal-500', label: 'Family Update' },
    student: { icon: '⭐', gradient: 'from-orange-400 to-pink-500', label: 'Your Daily Goal' },
    pro_athlete: { icon: '🏆', gradient: 'from-amber-500 to-orange-600', label: 'Training Brief' },
    personal_manager: { icon: '📋', gradient: 'from-teal-500 to-emerald-600', label: 'Client Brief' },
  }[effectiveRole] ?? { icon: '💡', gradient: 'from-blue-400 to-blue-600', label: "Today's Insight" };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <AIConversationSidebar
        userId={user?.id}
        activeConversationId={activeConversationId}
        onSelect={handleSelectConversation}
        onNewConversation={handleNewConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isMobile={isMobile}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Back to dashboard */}
            <button
              onClick={() => {
                const dashboardRoutes: Record<string, string> = {
                  admin: '/admin',
                  head_manager: '/admin',
                  coach: '/coach',
                  parent: '/parent',
                  student: '/student',
                  pro_athlete: '/pro',
                  personal_manager: '/pm',
                };
                const returnUrl = sessionStorage.getItem('ai_return_url');
                if (returnUrl) {
                  sessionStorage.removeItem('ai_return_url');
                  navigate(returnUrl);
                } else {
                  navigate(dashboardRoutes[role || 'parent'] || '/');
                }
              }}
              className="p-1 flex items-center gap-1 flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>

            {/* ALWAYS VISIBLE sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(prev => !prev)}
              className="p-2 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
              aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              {sidebarOpen
                ? <PanelLeftClose className="w-5 h-5 text-foreground" />
                : <Menu className="w-5 h-5 text-foreground" />
              }
            </button>

            <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center', config.color)}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-foreground text-sm">ProFit AI</h1>
              <p className="text-[11px] text-muted-foreground truncate">{roleModesConfig.subtitle[lang]}</p>
            </div>

            {/* Tasks button */}
            <button
              onClick={() => setShowTaskPanel(!showTaskPanel)}
              className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-muted hover:bg-accent transition-colors"
            >
              <CheckSquare className="w-4 h-4 text-muted-foreground" />
              {urgentCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center font-bold">
                  {urgentCount}
                </span>
              )}
            </button>

            {/* New conversation */}
            <button
              onClick={handleNewConversation}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-muted hover:bg-accent transition-colors"
              title="New conversation"
            >
              <PanelLeftOpen className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Clear conversation */}
            {messages.length > 0 && (
              <button onClick={handleClearConversation} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mode pills */}
          {canUseAI && roleModes.length > 1 && (
            <div className="mt-2">
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {roleModes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => handleTabSwitch(mode.id)}
                    className={cn(
                      'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                      activeMode === mode.id
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
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
                          className={cn('flex-1 h-1.5 rounded-full transition-colors', i < filledUpTo ? 'bg-primary' : 'bg-muted')}
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

        {/* Task Panel Overlay */}
        <AnimatePresence>
          {showTaskPanel && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40"
              onClick={() => setShowTaskPanel(false)}
            >
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-background shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <AITaskPanel
                  onClose={() => setShowTaskPanel(false)}
                  onAskAI={(text) => {
                    setShowTaskPanel(false);
                    setInput(text);
                    setTimeout(() => handleSend(), 100);
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 w-full space-y-4">
              {/* Loading history */}
              {isLoadingHistory && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* Empty state with briefing + chips */}
              {messages.length === 0 && !isLoadingHistory && (
                <div className="max-w-lg mx-auto">
                  {/* Daily Briefing Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn('rounded-2xl p-4 text-white bg-gradient-to-br', briefingConfig.gradient)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 text-lg">
                        {briefingConfig.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm mb-1">{briefingConfig.label}</div>
                        <div className="text-white/90 text-sm leading-relaxed">
                          {t('Tap below to get your personalized briefing for today', 'Нажмите ниже для получения персональной сводки')}
                        </div>
                        <button
                          onClick={() => {
                            setInput(t(`Give me a ${effectiveRole} briefing for today`, `Дай мне сводку для ${effectiveRole} на сегодня`));
                            inputRef.current?.focus();
                          }}
                          className="mt-2 text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors"
                        >
                          {t('Get briefing →', 'Получить сводку →')}
                        </button>
                      </div>
                    </div>
                  </motion.div>

                  {/* Greeting + Chips */}
                  <div className="flex flex-col items-center justify-center text-center gap-4 py-8">
                    <div className={cn('w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg', config.color)}>
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="font-bold text-lg text-foreground">{roleModesConfig.greeting[lang]}</h2>
                      <p className="text-sm text-muted-foreground mt-1">{roleModesConfig.subtitle[lang]}</p>
                    </div>

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
                            onClick={() => {
                              setInput(s);
                              inputRef.current?.focus();
                            }}
                            className="text-left text-xs px-3 py-2.5 rounded-xl bg-background border border-border text-foreground hover:border-primary/40 transition-colors"
                          >
                            {s}
                          </motion.button>
                        ))}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Messages list */}
              <div className="max-w-lg mx-auto space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[85%]">
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className={cn('w-5 h-5 rounded-md bg-gradient-to-br flex items-center justify-center', config.color)}>
                            <Sparkles className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-[10px] text-muted-foreground font-medium">ProFit AI</span>
                        </div>
                      )}
                      <div
                        className={cn(
                          'rounded-2xl px-4 py-2.5 text-sm',
                          msg.role === 'user'
                            ? cn('bg-gradient-to-br text-white rounded-br-md', config.color)
                            : 'bg-muted/50 border border-border text-foreground rounded-bl-md'
                        )}
                      >
                        {msg.role === 'assistant' ? (
                          <MarkdownText content={msg.content} />
                        ) : (
                          <span className="whitespace-pre-wrap">{msg.content}</span>
                        )}
                        {msg.role === 'assistant' && isLoading && i === messages.length - 1 && (
                          <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5 rounded-full align-middle" />
                        )}
                      </div>
                      {msg.role === 'assistant' && !isLoading && (
                        <AIMessageActions content={msg.content} role={effectiveRole} />
                      )}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className={cn('w-5 h-5 rounded-md bg-gradient-to-br flex items-center justify-center', config.color)}>
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <div className="bg-muted/50 border border-border rounded-2xl rounded-bl-md px-4 py-3 ml-1.5">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="w-2 h-2 rounded-full bg-primary"
                            animate={{ y: [0, -6, 0] }}
                            transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Follow-up suggestion chips */}
                {suggestions.length > 0 && !isLoading && (
                  <div className="flex flex-col gap-2 animate-in fade-in duration-300">
                    <p className="text-xs text-muted-foreground font-medium px-1">{t('Continue asking:', 'Продолжить:')}</p>
                    {suggestions.map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setInput(suggestion);
                          setSuggestions([]);
                          inputRef.current?.focus();
                        }}
                        className="text-left px-4 py-2.5 bg-background rounded-xl border border-primary/20 text-sm text-primary hover:border-primary/40 hover:bg-primary/5 transition-all shadow-sm flex items-center gap-2"
                      >
                        <span className="text-primary/40 text-xs">→</span>
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recording indicator */}
            {isRecording && (
              <div className="flex items-center justify-center gap-2 py-1.5 bg-destructive/5">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-xs text-destructive font-medium">{t('Recording... tap to stop', 'Запись... нажмите для остановки')}</span>
              </div>
            )}

            {/* Detected task prompt */}
            {detectedTask && (
              <div className="px-4 py-2 bg-primary/5 border-t border-primary/10">
                <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
                  <p className="text-xs text-foreground truncate">
                    💡 Create task: &quot;{detectedTask}&quot;?
                  </p>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => setDetectedTask(null)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      No
                    </button>
                    <button
                      onClick={async () => {
                        await createTask.mutateAsync({ title: detectedTask, priority: 'medium', steps: [] });
                        setDetectedTask(null);
                        toast({ title: '✅ Task created!' });
                      }}
                      className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-lg hover:bg-primary/90"
                    >
                      ✓ Add task
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-border bg-background px-4 py-3">
              <div className="max-w-lg mx-auto flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    if (suggestions.length > 0) setSuggestions([]);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={t('Ask ProFit AI...', 'Спросите ProFit AI...')}
                  rows={1}
                  className="flex-1 resize-none rounded-2xl border border-border bg-muted/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent max-h-32 overflow-y-auto"
                  style={{ minHeight: '42px' }}
                />
                <button
                  onClick={toggleVoice}
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                    isRecording ? 'bg-destructive scale-110 shadow-lg shadow-destructive/30' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {isRecording ? <div className="w-3 h-3 bg-destructive-foreground rounded-sm" /> : <Mic className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading || messagesRemaining <= 0}
                  className={cn(
                    'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white disabled:opacity-40 transition-opacity flex-shrink-0',
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
    </div>
  );
}
