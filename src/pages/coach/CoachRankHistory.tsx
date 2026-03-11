import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, CheckCircle, AlertCircle, Crown, Shield, Award, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/hooks/useLanguage';
import { COACH_RANKS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const RANK_REQUIREMENTS: Record<string, { lessons: number; rating: number; perks: string[] }> = {
  trainee: { lessons: 0, rating: 0, perks: ['Basic scheduling', 'Chat access'] },
  junior: { lessons: 50, rating: 3.5, perks: ['Student management', 'GPS tracking', 'Coin rewards'] },
  middle: { lessons: 150, rating: 4.0, perks: ['Priority bookings', 'Higher pay rate', 'Education content'] },
  senior: { lessons: 300, rating: 4.5, perks: ['Seconding feature', 'Premium students', 'Shop discounts'] },
  elite: { lessons: 500, rating: 4.7, perks: ['Top pay tier', 'Mentoring juniors', 'Exclusive events', 'Ray-Ban Meta'] },
  master: { lessons: 1000, rating: 4.9, perks: ['Revenue share', 'Brand ambassador', 'Custom profile frame'] },
};

const RANK_ORDER = ['trainee', 'junior', 'middle', 'senior', 'elite', 'master'];

export default function CoachRankHistory() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const { data: coachData, isLoading } = useQuery({
    queryKey: ['coach-rank-detail', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('coaches')
        .select('id, rank, avg_rating, total_lessons_completed, rank_history, created_at')
        .eq('id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: leaderboardPos } = useQuery({
    queryKey: ['coach-leaderboard-position', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('coaches')
        .select('id, total_lessons_completed')
        .order('total_lessons_completed', { ascending: false });
      const pos = (data || []).findIndex(c => c.id === user!.id) + 1;
      return { position: pos, total: data?.length || 0 };
    },
    enabled: !!user?.id,
  });

  const currentRank = coachData?.rank || 'trainee';
  const currentIdx = RANK_ORDER.indexOf(currentRank);
  const nextRank = currentIdx < RANK_ORDER.length - 1 ? RANK_ORDER[currentIdx + 1] : null;
  const nextReqs = nextRank ? RANK_REQUIREMENTS[nextRank] : null;
  const currentRankInfo = COACH_RANKS.find(r => r.id === currentRank);
  const nextRankInfo = nextRank ? COACH_RANKS.find(r => r.id === nextRank) : null;

  const lessons = coachData?.total_lessons_completed || 0;
  const rating = Number(coachData?.avg_rating || 0);

  const rankHistory = Array.isArray(coachData?.rank_history) ? coachData.rank_history as { rank: string; achieved_at: string }[] : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
        <button onClick={() => navigate('/coach')} className="p-1">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-bold text-foreground">{t('Rank & Career', 'Ранг и карьера')}</h1>
      </div>

      <div className="px-4 py-4 space-y-5 pb-28">
        {/* Current rank card */}
        <div className="bg-card rounded-2xl p-5 border border-border text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center"
               style={{ backgroundColor: (currentRankInfo?.color || '#6366f1') + '20' }}>
            <Crown size={28} style={{ color: currentRankInfo?.color }} />
          </div>
          <Badge className="text-sm px-3 py-1 mb-2" style={{
            backgroundColor: (currentRankInfo?.color || '#6366f1') + '20',
            color: currentRankInfo?.color,
            borderColor: currentRankInfo?.color,
          }}>
            {currentRankInfo?.label || currentRank}
          </Badge>
          <p className="text-sm text-muted-foreground mt-2">
            {lessons} {t('lessons', 'уроков')} · ★ {rating.toFixed(1)}
          </p>
          {leaderboardPos && (
            <p className="text-xs text-muted-foreground mt-1">
              🏆 #{leaderboardPos.position} {t('of', 'из')} {leaderboardPos.total} {t('coaches', 'тренеров')}
            </p>
          )}
        </div>

        {/* Progress to next rank */}
        {nextRank && nextReqs && (
          <div className="bg-card rounded-2xl p-4 border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-foreground">{t('Next Rank', 'Следующий ранг')}</h3>
              <Badge variant="outline" className="text-[10px]" style={{ borderColor: nextRankInfo?.color, color: nextRankInfo?.color }}>
                {nextRankInfo?.label || nextRank}
              </Badge>
            </div>

            {/* Lessons progress */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{t('Lessons', 'Уроки')}</span>
                <span className={cn("font-medium", lessons >= nextReqs.lessons ? "text-emerald-600" : "text-foreground")}>
                  {lessons} / {nextReqs.lessons}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all"
                     style={{ width: `${Math.min((lessons / nextReqs.lessons) * 100, 100)}%` }} />
              </div>
            </div>

            {/* Rating */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{t('Rating', 'Рейтинг')}</span>
                <span className={cn("font-medium", rating >= nextReqs.rating ? "text-emerald-600" : "text-foreground")}>
                  ★ {rating.toFixed(1)} / {nextReqs.rating}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all"
                     style={{ width: `${Math.min((rating / nextReqs.rating) * 100, 100)}%` }} />
              </div>
            </div>

            {/* Requirements checklist */}
            <div className="space-y-2 pt-1">
              {[
                { label: `${nextReqs.lessons} ${t('lessons', 'уроков')}`, done: lessons >= nextReqs.lessons },
                { label: `★ ${nextReqs.rating}+ ${t('rating', 'рейтинг')}`, done: rating >= nextReqs.rating },
              ].map(req => (
                <div key={req.label} className="flex items-center gap-2">
                  {req.done
                    ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                    : <AlertCircle className="w-4 h-4 text-amber-500" />}
                  <span className="text-xs text-muted-foreground">{req.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Perks at current rank */}
        <div className="bg-card rounded-2xl p-4 border border-border">
          <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-1.5">
            <Shield size={14} className="text-primary" />
            {t('Current Perks', 'Текущие привилегии')}
          </h3>
          <div className="space-y-2">
            {(RANK_REQUIREMENTS[currentRank]?.perks || []).map(perk => (
              <div key={perk} className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-sm text-foreground">{perk}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rank timeline */}
        <div className="bg-card rounded-2xl p-4 border border-border">
          <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-1.5">
            <Award size={14} className="text-primary" />
            {t('Rank Timeline', 'История рангов')}
          </h3>
          <div className="space-y-3">
            {rankHistory.length > 0 ? (
              rankHistory.map((entry, i) => {
                const info = COACH_RANKS.find(r => r.id === entry.rank);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center"
                         style={{ backgroundColor: (info?.color || '#6366f1') + '20' }}>
                      <Trophy size={14} style={{ color: info?.color }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{info?.label || entry.rank}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {entry.achieved_at ? format(new Date(entry.achieved_at), 'MMM d, yyyy') : ''}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                     style={{ backgroundColor: (currentRankInfo?.color || '#6366f1') + '20' }}>
                  <Trophy size={14} style={{ color: currentRankInfo?.color }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{currentRankInfo?.label || currentRank}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {coachData?.created_at ? format(new Date(coachData.created_at), 'MMM d, yyyy') : t('Since joining', 'С начала работы')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* All ranks overview */}
        <div className="bg-card rounded-2xl p-4 border border-border">
          <h3 className="font-semibold text-sm text-foreground mb-3">{t('All Ranks', 'Все ранги')}</h3>
          <div className="space-y-2">
            {RANK_ORDER.map((rank, i) => {
              const info = COACH_RANKS.find(r => r.id === rank);
              const reqs = RANK_REQUIREMENTS[rank];
              const isCurrentOrPast = i <= currentIdx;
              return (
                <div key={rank} className={cn(
                  "flex items-center gap-3 p-2 rounded-lg",
                  rank === currentRank ? "bg-primary/5 border border-primary/20" : ""
                )}>
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                    isCurrentOrPast ? "" : "opacity-40"
                  )} style={{ backgroundColor: (info?.color || '#6366f1') + '20', color: info?.color }}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className={cn("text-sm font-medium", isCurrentOrPast ? "text-foreground" : "text-muted-foreground")}>
                      {info?.label || rank}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {reqs.lessons > 0 ? `${reqs.lessons} lessons · ★${reqs.rating}` : t('Starting rank', 'Начальный ранг')}
                    </p>
                  </div>
                  {rank === currentRank && (
                    <Badge className="text-[10px] bg-primary/10 text-primary border-primary/30">{t('Current', 'Текущий')}</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
