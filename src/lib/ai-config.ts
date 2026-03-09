export type AIMode = 'general' | 'scheduling' | 'progress' | 'lesson_plan' | 'translation';

export const MODE_LABELS: Record<AIMode, { icon: string; en: string; ru: string }> = {
  general:     { icon: '💬', en: 'General',     ru: 'Общий' },
  scheduling:  { icon: '📅', en: 'Schedule',    ru: 'Расписание' },
  progress:    { icon: '📊', en: 'Progress',    ru: 'Прогресс' },
  lesson_plan: { icon: '🏊', en: 'Lesson Plan', ru: 'План урока' },
  translation: { icon: '🌐', en: 'Translate',   ru: 'Перевод' },
};

/** Mode-specific quick prompts */
export const MODE_PROMPTS: Record<AIMode, { en: string[]; ru: string[] }> = {
  general: {
    en: [
      "How is my child progressing?",
      "What should my child practice at home?",
      "Tell me about ProFit belts system",
      "How many lessons until next belt test?",
    ],
    ru: [
      "Как прогрессирует мой ребёнок?",
      "Что практиковать дома?",
      "Расскажите о системе поясов ProFit",
      "Сколько уроков до следующего теста?",
    ],
  },
  scheduling: {
    en: [
      "Book a lesson for next week",
      "Show my upcoming lessons",
      "Cancel tomorrow's lesson",
      "What time slots are available this week?",
    ],
    ru: [
      "Записать на урок на следующей неделе",
      "Показать мои предстоящие уроки",
      "Отменить завтрашний урок",
      "Какие слоты свободны на этой неделе?",
    ],
  },
  progress: {
    en: [
      "Show Emma's progress this month",
      "What skills are left for next belt?",
      "Compare this month vs last month",
      "Generate a progress report",
    ],
    ru: [
      "Показать прогресс Эммы за этот месяц",
      "Какие навыки остались для нового пояса?",
      "Сравнить этот и прошлый месяц",
      "Сгенерировать отчёт о прогрессе",
    ],
  },
  lesson_plan: {
    en: [
      "Create a lesson plan for a beginner",
      "Warm-up drills for 7-year olds",
      "Freestyle technique progression",
      "Cool-down routine for group lesson",
    ],
    ru: [
      "Создай план урока для новичка",
      "Разминка для 7 лет",
      "Прогрессия техники вольного стиля",
      "Заминка для группового урока",
    ],
  },
  translation: {
    en: [
      "Translate to Arabic",
      "Translate to Russian",
      "How do you say 'freestyle' in Arabic?",
      "Translate my last message",
    ],
    ru: [
      "Перевести на арабский",
      "Перевести на английский",
      "Как сказать 'кроль' по-арабски?",
      "Перевести моё последнее сообщение",
    ],
  },
};

export interface RoleConfig {
  greeting: string;
  subtitle: { en: string; ru: string };
  color: string;
  suggestions: { en: string[]; ru: string[] };
  modes: AIMode[];
  dailyLimit: number;
}

export const ROLE_CONFIG: Record<string, RoleConfig> = {
  admin: {
    greeting: "Hello, Director! 👑",
    subtitle: { en: "Full access to all ProFit analytics and controls", ru: "Полный доступ ко всей аналитике и управлению ProFit" },
    color: "from-red-500 to-orange-500",
    suggestions: {
      en: [
        "Show today's revenue summary",
        "Which coaches have lessons today?",
        "Students with no progress this month",
        "Generate weekly performance report",
      ],
      ru: [
        "Показать дневную выручку",
        "Какие тренеры работают сегодня?",
        "Ученики без прогресса в этом месяце",
        "Создать недельный отчёт",
      ],
    },
    modes: ['general', 'scheduling', 'progress', 'lesson_plan', 'translation'],
    dailyLimit: 9999,
  },
  head_manager: {
    greeting: "Hello, Director! 👑",
    subtitle: { en: "Full access to all ProFit analytics and controls", ru: "Полный доступ ко всей аналитике и управлению ProFit" },
    color: "from-red-500 to-orange-500",
    suggestions: {
      en: [
        "Show today's revenue summary",
        "Which coaches have lessons today?",
        "Students with no progress this month",
        "Generate weekly performance report",
      ],
      ru: [
        "Показать дневную выручку",
        "Какие тренеры работают сегодня?",
        "Ученики без прогресса в этом месяце",
        "Создать недельный отчёт",
      ],
    },
    modes: ['general', 'scheduling', 'progress', 'lesson_plan', 'translation'],
    dailyLimit: 9999,
  },
  coach: {
    greeting: "Ready to coach? 🏊",
    subtitle: { en: "Your personal training assistant", ru: "Ваш личный тренерский помощник" },
    color: "from-blue-500 to-cyan-500",
    suggestions: {
      en: [
        "Create a lesson plan for a beginner 7-year old",
        "My schedule for today",
        "Generate progress report for my students",
        "Translate: 'Please arrive 5 min early'",
      ],
      ru: [
        "Создай план урока для новичка 7 лет",
        "Моё расписание на сегодня",
        "Отчёт о прогрессе моих учеников",
        "Перевести: 'Приедьте на 5 минут раньше'",
      ],
    },
    modes: ['general', 'scheduling', 'progress', 'lesson_plan', 'translation'],
    dailyLimit: 50,
  },
  parent: {
    greeting: "Hi there! 👋",
    subtitle: { en: "Your child's swimming journey assistant", ru: "Помощник на пути вашего ребёнка в плавании" },
    color: "from-green-500 to-teal-500",
    suggestions: {
      en: [
        "How is my child progressing?",
        "Book a lesson for next week",
        "When is the next belt test?",
        "What should my child practice at home?",
      ],
      ru: [
        "Как прогрессирует мой ребёнок?",
        "Записать на урок на следующей неделе",
        "Когда следующий тест на пояс?",
        "Что практиковать дома?",
      ],
    },
    modes: ['general', 'scheduling', 'progress', 'translation'],
    dailyLimit: 25,
  },
  student: {
    greeting: "Let's swim! 🌊",
    subtitle: { en: "Your swimming adventure guide", ru: "Твой гид в мире плавания" },
    color: "from-violet-500 to-purple-500",
    suggestions: {
      en: [
        "What belt level am I?",
        "How many coins do I have?",
        "What skills do I need for next belt?",
        "Give me a practice tip for today!",
      ],
      ru: [
        "Какой у меня пояс?",
        "Сколько у меня монет?",
        "Что нужно для следующего пояса?",
        "Дай совет для тренировки!",
      ],
    },
    modes: ['general', 'progress'],
    dailyLimit: 10,
  },
  pro_athlete: {
    greeting: "Let's compete! 🏆",
    subtitle: { en: "Your performance optimization assistant", ru: "Помощник по оптимизации результатов" },
    color: "from-amber-500 to-orange-500",
    suggestions: {
      en: [
        "How to improve my 100m time?",
        "Duel strategy tips",
        "Analyze my recent performance",
        "Create a competition prep plan",
      ],
      ru: [
        "Как улучшить время на 100м?",
        "Стратегия для дуэлей",
        "Анализ моих последних результатов",
        "Создай план подготовки к соревнованию",
      ],
    },
    modes: ['general', 'progress', 'lesson_plan'],
    dailyLimit: 30,
  },
  personal_manager: {
    greeting: "Hello, Manager! 📋",
    subtitle: { en: "Client management assistant", ru: "Помощник по работе с клиентами" },
    color: "from-indigo-500 to-blue-500",
    suggestions: {
      en: [
        "Show my client list",
        "Commission summary for this month",
        "Draft follow-up message for inactive client",
        "Best practices for client retention",
      ],
      ru: [
        "Показать список клиентов",
        "Комиссия за этот месяц",
        "Написать сообщение неактивному клиенту",
        "Лучшие практики удержания клиентов",
      ],
    },
    modes: ['general', 'scheduling', 'progress', 'translation'],
    dailyLimit: 40,
  },
};

export const DEFAULT_ROLE_CONFIG: RoleConfig = ROLE_CONFIG.parent;
