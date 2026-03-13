import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Waves,
  TrendingUp,
  Award,
  ChevronRight,
  Droplets,
  Timer,
  Wind,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───
interface SkillAssessment {
  id: string;
  skill_category: string;
  skill_name: string;
  level_before: number;
  level_after: number;
  notes: string | null;
  created_at: string;
  coach_name?: string;
}

interface StudentInfo {
  swim_belt: string;
  swim_belt_earned_at: string | null;
}

// ─── Skill Categories ───
const SKILL_CATEGORIES: Record<string, { label: string; labelRu: string; icon: string; color: string }> = {
  water_comfort: { label: 'Water Comfort', labelRu: 'Комфорт в воде', icon: '💧', color: 'bg-cyan-500' },
  freestyle: { label: 'Freestyle', labelRu: 'Кроль', icon: '🏊', color: 'bg-blue-500' },
  backstroke: { label: 'Backstroke', labelRu: 'На спине', icon: '🔄', color: 'bg-indigo-500' },
  breaststroke: { label: 'Breaststroke', labelRu: 'Брасс', icon: '🐸', color: 'bg-emerald-500' },
  butterfly: { label: 'Butterfly', labelRu: 'Баттерфляй', icon: '🦋', color: 'bg-purple-500' },
  diving: { label: 'Diving', labelRu: 'Ныряние', icon: '🤿', color: 'bg-teal-500' },
  turns: { label: 'Turns', labelRu: 'Повороты', icon: '🔁', color: 'bg-orange-500' },
  breathing: { label: 'Breathing', labelRu: 'Дыхание', icon: '💨', color: 'bg-sky-500' },
  endurance: { label: 'Endurance', labelRu: 'Выносливость', icon: '💪', color: 'bg-red-500' },
  baby_aquatics: { label: 'Baby Aquatics', labelRu: 'Малыши', icon: '👶', color: 'bg-pink-500' },
};

const BELT_INFO: Record<string, { label: string; labelRu: string; color: string; next: string | null }> = {
  white: { label: 'White Belt', labelRu: 'Белый пояс', color: 'bg-gray-200 text-gray-800', next: 'sky_blue' },
  sky_blue: { label: 'Sky Blue Belt', labelRu: 'Голубой пояс', color: 'bg-sky-400 text-white', next: 'green' },
  green: { label: 'Green Belt', labelRu: 'Зелёный пояс', color: 'bg-emerald-500 text-white', next: 'yellow' },
  yellow: { label: 'Yellow Belt', labelRu: 'Жёлтый пояс', color: 'bg-yellow-400 text-gray-800', next: 'orange' },
  orange: { label: 'Orange Belt', labelRu: 'Оранжевый пояс', color: 'bg-orange-500 text-white', next: 'red' },
  red: { label: 'Red Belt', labelRu: 'Красный пояс', color: 'bg-red-500 text-white', next: 'black' },
  black: { label: 'Black Belt', labelRu: 'Чёрный пояс', color: 'bg-gray-900 text-white', next: null },
};

const BELT_ORDER = ['white', 'sky_blue', 'green', 'yellow', 'orange', 'red', 'black'];

// ─── Hooks ───
function useStudentSkills(userId: string | undefined) {
  return useQuery({
    queryKey: ['student-skills', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skill_assessments')
        .select('id, skill_category, skill_name, level_before, level_after, notes, created_at')
        .eq('student_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SkillAssessment[];
    },
    enabled: !!userId,
  });
}

function useStudentInfo(userId: string | undefined) {
  return useQuery({
    queryKey: ['student-info', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('swim_belt, swim_belt_earned_at')
        .eq('id', userId!)
        .single();
      if (error) throw error;
      return data as StudentInfo;
    },
    enabled: !!userId,
  });
}

// ─── Component ───
export default function StudentSkills() {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: assessments, isLoading: skillsLoading } = useStudentSkills(user?.id);
  const { data: studentInfo, isLoading: infoLoading } = useStudentInfo(user?.id);

  const isLoading = skillsLoading || infoLoading;

  // Calculate latest level per category
  const categoryLevels = useMemo(() => {
    if (!assessments) return {};
    const levels: Record<string, { level: number; count: number; trend: number }> = {};
    const seen: Record<string, boolean> = {};

    for (const a of assessments) {
      if (!seen[a.skill_category]) {
        seen[a.skill_category] = true;
        levels[a.skill_category] = {
          level: a.level_after,
          count: assessments.filter(x => x.skill_category === a.skill_category).length,
          trend: a.level_after - a.level_before,
        };
      }
    }
    return levels;
  }, [assessments]);

  // Overall average
  const overallAvg = useMemo(() => {
    const values = Object.values(categoryLevels);
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, v) => sum + v.level, 0) / values.length * 10) / 10;
  }, [categoryLevels]);

  // Filtered assessments for selected category
  const filteredAssessments = useMemo(() => {
    if (!selectedCategory || !assessments) return [];
    return assessments.filter(a => a.skill_category === selectedCategory);
  }, [assessments, selectedCategory]);

  const belt = studentInfo?.swim_belt || 'white';
  const beltInfo = BELT_INFO[belt] || BELT_INFO.white;
  const beltIdx = BELT_ORDER.indexOf(belt);
  const beltProgress = ((beltIdx + 1) / BELT_ORDER.length) * 100;

  return (
    <div className="px-4 py-4 space-y-4 pb-28">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <PageHeader
          title={t('My Skills', 'Мои навыки')}
          subtitle={t('Track your swimming progress', 'Отслеживай прогресс в плавании')}
          backRoute="/student"
        />
      </motion.div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Belt Progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl border border-primary/20 p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', beltInfo.color)}>
                  <Award size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{t(beltInfo.label, beltInfo.labelRu)}</p>
                  {studentInfo?.swim_belt_earned_at && (
                    <p className="text-[10px] text-muted-foreground">
                      {t('Earned', 'Получен')} {new Date(studentInfo.swim_belt_earned_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">{overallAvg}</p>
                <p className="text-[10px] text-muted-foreground">{t('Avg Level', 'Ср. уровень')}</p>
              </div>
            </div>

            {/* Belt progress bar */}
            <div className="flex gap-1 mb-1">
              {BELT_ORDER.map((b, idx) => (
                <div
                  key={b}
                  className={cn(
                    'h-2 flex-1 rounded-full transition-all',
                    idx <= beltIdx
                      ? BELT_INFO[b]?.color.split(' ')[0] || 'bg-gray-200'
                      : 'bg-muted'
                  )}
                />
              ))}
            </div>
            {beltInfo.next && (
              <p className="text-[10px] text-muted-foreground text-right">
                {t('Next', 'Далее')}: {t(BELT_INFO[beltInfo.next]?.label || '', BELT_INFO[beltInfo.next]?.labelRu || '')}
              </p>
            )}
          </motion.div>

          {/* Skill Radar (simplified as bars) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {t('Skills Overview', 'Обзор навыков')}
            </h3>

            {Object.keys(categoryLevels).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(SKILL_CATEGORIES).map(([key, cat]) => {
                  const data = categoryLevels[key];
                  if (!data) return null;
                  const isSelected = selectedCategory === key;

                  return (
                    <motion.button
                      key={key}
                      onClick={() => setSelectedCategory(isSelected ? null : key)}
                      className={cn(
                        'w-full text-left p-3 rounded-xl border transition-all',
                        isSelected ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'
                      )}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg">{cat.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground">{t(cat.label, cat.labelRu)}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-bold text-foreground">{data.level}/10</span>
                              {data.trend > 0 && (
                                <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 text-[9px] px-1">
                                  +{data.trend}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {data.count} {t('assessments', 'оценок')}
                          </p>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className={cn('h-full rounded-full', cat.color)}
                          initial={{ width: 0 }}
                          animate={{ width: `${(data.level / 10) * 100}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-card rounded-xl border border-border">
                <Waves size={28} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">{t('No skill assessments yet', 'Оценок навыков пока нет')}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('Your coach will assess your skills during lessons', 'Тренер оценит ваши навыки на занятиях')}
                </p>
              </div>
            )}
          </motion.div>

          {/* Assessment History for selected category */}
          <AnimatePresence>
            {selectedCategory && filteredAssessments.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {t('Assessment History', 'История оценок')} — {t(
                    SKILL_CATEGORIES[selectedCategory]?.label || '',
                    SKILL_CATEGORIES[selectedCategory]?.labelRu || ''
                  )}
                </h3>
                <div className="space-y-2">
                  {filteredAssessments.map((a, idx) => (
                    <div key={a.id} className="bg-card rounded-xl border border-border p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-foreground">{a.skill_name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(a.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] bg-muted">
                          {a.level_before}/10
                        </Badge>
                        <ChevronRight size={12} className="text-muted-foreground" />
                        <Badge variant="outline" className={cn(
                          'text-[10px]',
                          a.level_after > a.level_before
                            ? 'bg-emerald-500/15 text-emerald-600'
                            : a.level_after < a.level_before
                            ? 'bg-red-500/15 text-red-600'
                            : 'bg-muted'
                        )}>
                          {a.level_after}/10
                        </Badge>
                        {a.level_after > a.level_before && (
                          <TrendingUp size={12} className="text-emerald-500" />
                        )}
                      </div>
                      {a.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">"{a.notes}"</p>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Unassessed Skills */}
          {Object.keys(categoryLevels).length > 0 && Object.keys(categoryLevels).length < Object.keys(SKILL_CATEGORIES).length && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {t('Not Yet Assessed', 'Ещё не оценены')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(SKILL_CATEGORIES)
                  .filter(([key]) => !categoryLevels[key])
                  .map(([key, cat]) => (
                    <Badge key={key} variant="outline" className="text-xs bg-muted/50 text-muted-foreground">
                      {cat.icon} {t(cat.label, cat.labelRu)}
                    </Badge>
                  ))}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
