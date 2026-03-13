import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Gift,
  Users,
  Copy,
  Share2,
  Trophy,
  Star,
  ChevronRight,
  Coins,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───
interface ReferralInfo {
  referral_code: string | null;
  loyalty_rank: string;
  coin_balance: number;
  total_coins_earned: number;
}

interface ReferredUser {
  id: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
}

// ─── Hooks ───
function useReferralInfo(userId: string | undefined) {
  return useQuery({
    queryKey: ['referral-info', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parents')
        .select('referral_code, loyalty_rank, coin_balance, total_coins_earned')
        .eq('id', userId!)
        .single();
      if (error) throw error;
      return data as ReferralInfo;
    },
    enabled: !!userId,
  });
}

function useReferredUsers(userId: string | undefined) {
  return useQuery({
    queryKey: ['referred-users', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parents')
        .select('id, profiles!inner(full_name, avatar_url, created_at)')
        .eq('referred_by', userId!);
      if (error) throw error;
      return (data || []).map((item: Record<string, unknown>) => {
        const profile = item.profiles as Record<string, unknown>;
        return {
          id: item.id as string,
          full_name: (profile?.full_name as string) || 'Unknown',
          avatar_url: (profile?.avatar_url as string) || null,
          created_at: (profile?.created_at as string) || '',
        };
      }) as ReferredUser[];
    },
    enabled: !!userId,
  });
}

// ─── Loyalty Ranks ───
const LOYALTY_RANKS: Record<string, { label: string; labelRu: string; color: string; icon: string; minReferrals: number }> = {
  aqua: { label: 'Aqua', labelRu: 'Аква', color: 'bg-cyan-500', icon: '💧', minReferrals: 0 },
  loyal: { label: 'Loyal', labelRu: 'Лояльный', color: 'bg-blue-500', icon: '💎', minReferrals: 3 },
  champion: { label: 'Champion', labelRu: 'Чемпион', color: 'bg-purple-500', icon: '🏆', minReferrals: 7 },
  elite_family: { label: 'Elite Family', labelRu: 'Элит', color: 'bg-amber-500', icon: '👑', minReferrals: 15 },
  profitfamily_legend: { label: 'Legend', labelRu: 'Легенда', color: 'bg-gradient-to-r from-amber-500 to-red-500', icon: '🌟', minReferrals: 30 },
};

const RANK_ORDER = ['aqua', 'loyal', 'champion', 'elite_family', 'profitfamily_legend'];

// ─── Rewards ───
const REWARDS = [
  { referrals: 1, reward: '50 coins', rewardRu: '50 монет', icon: '🪙' },
  { referrals: 3, reward: 'Loyal rank + 150 coins', rewardRu: 'Ранг Лояльный + 150 монет', icon: '💎' },
  { referrals: 5, reward: '1 Free lesson', rewardRu: '1 бесплатное занятие', icon: '🏊' },
  { referrals: 7, reward: 'Champion rank + 300 coins', rewardRu: 'Ранг Чемпион + 300 монет', icon: '🏆' },
  { referrals: 10, reward: '5% discount forever', rewardRu: 'Скидка 5% навсегда', icon: '🎉' },
  { referrals: 15, reward: 'Elite Family rank + 500 coins', rewardRu: 'Ранг Элит + 500 монет', icon: '👑' },
  { referrals: 30, reward: 'Legend rank + VIP perks', rewardRu: 'Ранг Легенда + VIP привилегии', icon: '🌟' },
];

// ─── Component ───
export default function ParentReferrals() {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const { data: info, isLoading: infoLoading } = useReferralInfo(user?.id);
  const { data: referrals, isLoading: refLoading } = useReferredUsers(user?.id);

  const isLoading = infoLoading || refLoading;
  const referralCount = referrals?.length || 0;
  const currentRank = info?.loyalty_rank || 'aqua';
  const rankInfo = LOYALTY_RANKS[currentRank] || LOYALTY_RANKS.aqua;
  const currentRankIdx = RANK_ORDER.indexOf(currentRank);
  const nextRank = currentRankIdx < RANK_ORDER.length - 1 ? LOYALTY_RANKS[RANK_ORDER[currentRankIdx + 1]] : null;

  const handleCopy = async () => {
    if (!info?.referral_code) return;
    try {
      await navigator.clipboard.writeText(info.referral_code);
      setCopied(true);
      toast.success(t('Copied!', 'Скопировано!'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('Failed to copy', 'Не удалось скопировать'));
    }
  };

  const handleShare = async () => {
    if (!info?.referral_code) return;
    const text = t(
      `Join ProFit Swimming with my referral code: ${info.referral_code} and get a bonus!`,
      `Присоединяйся к ProFit Swimming по моему коду: ${info.referral_code} и получи бонус!`
    );
    if (navigator.share) {
      try {
        await navigator.share({ title: 'ProFit Swimming', text });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success(t('Link copied!', 'Ссылка скопирована!'));
    }
  };

  return (
    <div className="px-4 py-4 space-y-4 pb-28">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <PageHeader
          title={t('Referrals', 'Рефералы')}
          subtitle={t('Invite friends & earn rewards', 'Приглашай друзей и получай награды')}
          backRoute="/parent"
        />
      </motion.div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Referral Code Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl border border-primary/20 p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Gift size={18} className="text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                {t('Your Referral Code', 'Ваш реферальный код')}
              </span>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 bg-card rounded-xl border-2 border-dashed border-primary/30 px-4 py-3 text-center">
                <span className="text-2xl font-bold tracking-[0.3em] text-foreground">
                  {info?.referral_code || '--------'}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all',
                  copied
                    ? 'bg-emerald-500 text-white'
                    : 'bg-primary text-primary-foreground'
                )}
              >
                {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                {copied ? t('Copied', 'Скопировано') : t('Copy', 'Копировать')}
              </button>
              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-card border border-border text-sm font-medium"
              >
                <Share2 size={16} />
                {t('Share', 'Поделиться')}
              </button>
            </div>
          </motion.div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-3 gap-3"
          >
            <div className="bg-card rounded-xl border border-border p-3 text-center">
              <Users size={18} className="mx-auto text-primary mb-1" />
              <p className="text-lg font-bold text-foreground">{referralCount}</p>
              <p className="text-[10px] text-muted-foreground">{t('Invited', 'Приглашено')}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-3 text-center">
              <Coins size={18} className="mx-auto text-amber-500 mb-1" />
              <p className="text-lg font-bold text-foreground">{info?.coin_balance || 0}</p>
              <p className="text-[10px] text-muted-foreground">{t('Coins', 'Монеты')}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-3 text-center">
              <span className="text-lg block mb-1">{rankInfo.icon}</span>
              <p className="text-xs font-bold text-foreground">{t(rankInfo.label, rankInfo.labelRu)}</p>
              <p className="text-[10px] text-muted-foreground">{t('Rank', 'Ранг')}</p>
            </div>
          </motion.div>

          {/* Progress to Next Rank */}
          {nextRank && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card rounded-2xl border border-border p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('Next Rank', 'Следующий ранг')}
                </span>
                <span className="text-xs text-muted-foreground">
                  {referralCount} / {nextRank.minReferrals}
                </span>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{nextRank.icon}</span>
                <div>
                  <p className="text-sm font-bold text-foreground">{t(nextRank.label, nextRank.labelRu)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {t(
                      `${nextRank.minReferrals - referralCount} more referrals needed`,
                      `Ещё ${nextRank.minReferrals - referralCount} приглашений`
                    )}
                  </p>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min((referralCount / nextRank.minReferrals) * 100, 100)}%` }}
                />
              </div>
            </motion.div>
          )}

          {/* Rewards Roadmap */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {t('Rewards Roadmap', 'Карта наград')}
            </h3>
            <div className="space-y-2">
              {REWARDS.map((reward, idx) => {
                const achieved = referralCount >= reward.referrals;
                return (
                  <div
                    key={idx}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border transition-all',
                      achieved
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : 'bg-card border-border'
                    )}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-lg',
                      achieved ? 'bg-emerald-500/15' : 'bg-muted'
                    )}>
                      {achieved ? '✅' : reward.icon}
                    </div>
                    <div className="flex-1">
                      <p className={cn('text-sm font-medium', achieved ? 'text-emerald-600' : 'text-foreground')}>
                        {t(reward.reward, reward.rewardRu)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {reward.referrals} {t('referrals', 'приглашений')}
                      </p>
                    </div>
                    {achieved && <CheckCircle2 size={16} className="text-emerald-500" />}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Referred Users */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {t('Invited Friends', 'Приглашённые друзья')} ({referralCount})
            </h3>
            {referralCount > 0 ? (
              <div className="space-y-2">
                {(referrals || []).map(ref => (
                  <div key={ref.id} className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {ref.avatar_url ? (
                        <img src={ref.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-primary">
                          {ref.full_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{ref.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {t('Joined', 'Присоединился')} {new Date(ref.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <CheckCircle2 size={14} className="text-emerald-500" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-card rounded-xl border border-border">
                <Users size={28} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">{t('No referrals yet', 'Пока нет приглашений')}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('Share your code to start earning rewards!', 'Поделитесь кодом и начните получать награды!')}
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}
