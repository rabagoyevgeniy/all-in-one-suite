import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Flame,
  Coins,
  Swords,
  Medal,
  Crown,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───
interface LeaderboardEntry {
  id: string;
  full_name: string;
  avatar_url: string | null;
  coin_balance: number;
  total_coins_earned: number;
  wins: number;
  losses: number;
  current_streak: number;
  longest_streak: number;
  swim_belt: string;
  avatar_frame: string;
}

type TabId = 'coins' | 'wins' | 'streak';

// ─── Belt Colors ───
const BELT_COLORS: Record<string, { bg: string; label: string; labelRu: string }> = {
  white: { bg: 'bg-gray-200', label: 'White', labelRu: 'Белый' },
  sky_blue: { bg: 'bg-sky-400', label: 'Sky Blue', labelRu: 'Голубой' },
  green: { bg: 'bg-emerald-500', label: 'Green', labelRu: 'Зелёный' },
  yellow: { bg: 'bg-yellow-400', label: 'Yellow', labelRu: 'Жёлтый' },
  orange: { bg: 'bg-orange-500', label: 'Orange', labelRu: 'Оранжевый' },
  red: { bg: 'bg-red-500', label: 'Red', labelRu: 'Красный' },
  black: { bg: 'bg-gray-900', label: 'Black', labelRu: 'Чёрный' },
};

// ─── Hook ───
function useLeaderboard() {
  return useQuery({
    queryKey: ['student-leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          coin_balance,
          total_coins_earned,
          wins,
          losses,
          current_streak,
          longest_streak,
          swim_belt,
          avatar_frame,
          profiles!inner(full_name, avatar_url)
        `)
        .order('total_coins_earned', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []).map((item: Record<string, unknown>) => {
        const profile = item.profiles as Record<string, unknown>;
        return {
          id: item.id as string,
          full_name: (profile?.full_name as string) || 'Unknown',
          avatar_url: (profile?.avatar_url as string) || null,
          coin_balance: (item.coin_balance as number) || 0,
          total_coins_earned: (item.total_coins_earned as number) || 0,
          wins: (item.wins as number) || 0,
          losses: (item.losses as number) || 0,
          current_streak: (item.current_streak as number) || 0,
          longest_streak: (item.longest_streak as number) || 0,
          swim_belt: (item.swim_belt as string) || 'white',
          avatar_frame: (item.avatar_frame as string) || 'basic',
        };
      }) as LeaderboardEntry[];
    },
  });
}

// ─── Component ───
export default function StudentLeaderboard() {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabId>('coins');

  const { data: entries, isLoading } = useLeaderboard();

  const sorted = useMemo(() => {
    if (!entries) return [];
    const copy = [...entries];
    switch (activeTab) {
      case 'coins':
        return copy.sort((a, b) => b.total_coins_earned - a.total_coins_earned);
      case 'wins':
        return copy.sort((a, b) => b.wins - a.wins);
      case 'streak':
        return copy.sort((a, b) => b.longest_streak - a.longest_streak);
      default:
        return copy;
    }
  }, [entries, activeTab]);

  const myRank = useMemo(() => {
    if (!user?.id || !sorted.length) return null;
    const idx = sorted.findIndex(e => e.id === user.id);
    return idx >= 0 ? idx + 1 : null;
  }, [sorted, user?.id]);

  const myEntry = sorted.find(e => e.id === user?.id);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'coins', label: t('Coins', 'Монеты'), icon: <Coins size={14} /> },
    { id: 'wins', label: t('Wins', 'Победы'), icon: <Swords size={14} /> },
    { id: 'streak', label: t('Streak', 'Серия'), icon: <Flame size={14} /> },
  ];

  const getStatValue = (entry: LeaderboardEntry) => {
    switch (activeTab) {
      case 'coins': return entry.total_coins_earned;
      case 'wins': return entry.wins;
      case 'streak': return entry.longest_streak;
    }
  };

  const getStatLabel = () => {
    switch (activeTab) {
      case 'coins': return t('coins', 'монет');
      case 'wins': return t('wins', 'побед');
      case 'streak': return t('days', 'дней');
    }
  };

  return (
    <div className="px-4 py-4 space-y-4 pb-28">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <PageHeader
          title={t('Leaderboard', 'Таблица лидеров')}
          subtitle={t('Compete with other swimmers', 'Соревнуйся с другими пловцами')}
          backRoute="/student"
        />
      </motion.div>

      {/* Tabs */}
      <div className="flex bg-muted/50 rounded-xl p-0.5">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
              activeTab === tab.id ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
            )}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* My Position */}
          {myEntry && myRank && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">#{myRank}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">{t('Your Position', 'Ваша позиция')}</p>
                <p className="text-xs text-muted-foreground">
                  {getStatValue(myEntry)} {getStatLabel()}
                </p>
              </div>
              <div className={cn('w-4 h-4 rounded-full', BELT_COLORS[myEntry.swim_belt]?.bg || 'bg-gray-200')} />
            </motion.div>
          )}

          {/* Top 3 Podium */}
          {sorted.length >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-end justify-center gap-3 py-4"
            >
              {/* 2nd place */}
              <PodiumCard entry={sorted[1]} rank={2} statValue={getStatValue(sorted[1])} statLabel={getStatLabel()} t={t} />
              {/* 1st place */}
              <PodiumCard entry={sorted[0]} rank={1} statValue={getStatValue(sorted[0])} statLabel={getStatLabel()} t={t} isFirst />
              {/* 3rd place */}
              <PodiumCard entry={sorted[2]} rank={3} statValue={getStatValue(sorted[2])} statLabel={getStatLabel()} t={t} />
            </motion.div>
          )}

          {/* Rest of leaderboard */}
          <div className="space-y-2">
            {sorted.slice(3).map((entry, idx) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * idx }}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border',
                  entry.id === user?.id
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-card border-border'
                )}
              >
                <span className="text-sm font-bold text-muted-foreground w-6 text-center">
                  {idx + 4}
                </span>
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center relative">
                  {entry.avatar_url ? (
                    <img src={entry.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">
                      {entry.full_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className={cn(
                    'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card',
                    BELT_COLORS[entry.swim_belt]?.bg || 'bg-gray-200'
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{entry.full_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {t(BELT_COLORS[entry.swim_belt]?.label || 'White', BELT_COLORS[entry.swim_belt]?.labelRu || 'Белый')} {t('belt', 'пояс')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">{getStatValue(entry)}</p>
                  <p className="text-[10px] text-muted-foreground">{getStatLabel()}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {sorted.length === 0 && (
            <div className="text-center py-12">
              <Trophy size={32} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">{t('No students yet', 'Пока нет учеников')}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Podium Card ───
function PodiumCard({
  entry,
  rank,
  statValue,
  statLabel,
  t,
  isFirst = false,
}: {
  entry: LeaderboardEntry;
  rank: number;
  statValue: number;
  statLabel: string;
  t: (en: string, ru: string) => string;
  isFirst?: boolean;
}) {
  const medals = ['', '🥇', '🥈', '🥉'];
  const heights = ['', 'h-32', 'h-24', 'h-20'];

  return (
    <div className={cn('flex flex-col items-center', isFirst ? 'order-2' : rank === 2 ? 'order-1' : 'order-3')}>
      <div className="relative mb-2">
        <div className={cn(
          'rounded-full flex items-center justify-center border-2',
          isFirst ? 'w-16 h-16 border-amber-400' : 'w-12 h-12 border-muted',
          'bg-muted'
        )}>
          {entry.avatar_url ? (
            <img src={entry.avatar_url} alt="" className={cn('rounded-full object-cover', isFirst ? 'w-16 h-16' : 'w-12 h-12')} />
          ) : (
            <span className={cn('font-bold text-muted-foreground', isFirst ? 'text-lg' : 'text-sm')}>
              {entry.full_name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        {isFirst && <Crown size={20} className="absolute -top-3 left-1/2 -translate-x-1/2 text-amber-400" />}
      </div>
      <p className="text-xs font-medium text-foreground text-center truncate max-w-[80px]">{entry.full_name}</p>
      <span className="text-lg">{medals[rank]}</span>
      <div className={cn(
        'w-20 rounded-t-xl flex flex-col items-center justify-end pb-2',
        isFirst ? 'bg-amber-400/20' : rank === 2 ? 'bg-gray-300/20' : 'bg-orange-300/20',
        heights[rank]
      )}>
        <p className="text-sm font-bold text-foreground">{statValue}</p>
        <p className="text-[9px] text-muted-foreground">{statLabel}</p>
      </div>
    </div>
  );
}
