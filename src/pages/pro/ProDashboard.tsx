import { motion } from 'framer-motion';
import { Trophy, Swords, Timer, TrendingUp, Loader2, ChevronRight, Flame, Target, Waves, Crown, Shield, Zap, Medal, ArrowRight, ShoppingBag } from 'lucide-react';
import { CoinBalance } from '@/components/CoinBalance';
import { NeonProgress } from '@/components/ui/neon-progress';
import { GlowCard } from '@/components/ui/glow-card';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

/* ═══ TIER CONFIG ═══ */
const TIERS = [
  { id: 'bronze', label: 'BRONZE', emoji: '🥉', minRating: 0, gradient: 'from-amber-700 via-orange-600 to-yellow-700', glow: 'rgba(217,119,6,0.4)', color: '#d97706', nextId: 'silver' },
  { id: 'silver', label: 'SILVER', emoji: '🥈', minRating: 1500, gradient: 'from-slate-400 via-gray-300 to-slate-500', glow: 'rgba(148,163,184,0.4)', color: '#94a3b8', nextId: 'gold' },
  { id: 'gold', label: 'GOLD', emoji: '🥇', minRating: 3000, gradient: 'from-yellow-500 via-amber-400 to-yellow-600', glow: 'rgba(234,179,8,0.5)', color: '#eab308', nextId: 'platinum' },
  { id: 'platinum', label: 'PLATINUM', emoji: '💎', minRating: 5000, gradient: 'from-cyan-400 via-blue-400 to-cyan-500', glow: 'rgba(6,182,212,0.5)', color: '#06b6d4', nextId: 'diamond' },
  { id: 'diamond', label: 'DIAMOND', emoji: '👑', minRating: 8000, gradient: 'from-violet-500 via-purple-400 to-fuchsia-500', glow: 'rgba(139,92,246,0.6)', color: '#8b5cf6', nextId: null },
] as const;

function getTier(rating: number) {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (rating >= TIERS[i].minRating) return TIERS[i];
  }
  return TIERS[0];
}

function getNextTier(currentTier: typeof TIERS[number]) {
  return TIERS.find(t => t.id === currentTier.nextId) || null;
}

/* ═══ MEDAL BADGES ═══ */
const STYLE_EMOJIS: Record<string, string> = {
  freestyle: '🏊', backstroke: '🔙', breaststroke: '🐸',
  butterfly: '🦋', medley: '🌀',
};

export default function ProDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const { data: proData, isLoading } = useQuery({
    queryKey: ['pro-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pro_athletes')
        .select('*, profiles!pro_athletes_id_fkey(full_name, city)')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: records } = useQuery({
    queryKey: ['pro-records', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pro_records')
        .select('*')
        .eq('athlete_id', user!.id)
        .order('fina_points', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: activeDuels } = useQuery({
    queryKey: ['pro-active-duels', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('duels')
        .select('id')
        .or(`challenger_id.eq.${user!.id},opponent_id.eq.${user!.id}`)
        .in('status', ['pending', 'accepted', 'in_progress']);
      return data;
    },
    enabled: !!user?.id,
  });

  const profile = proData?.profiles as any;
  const rating = proData?.pro_rating_points || 1000;
  const tier = getTier(rating);
  const nextTier = getNextTier(tier);
  const tierProgress = nextTier
    ? Math.min(100, ((rating - tier.minRating) / (nextTier.minRating - tier.minRating)) * 100)
    : 100;
  const wins = proData?.wins || 0;
  const losses = proData?.losses || 0;
  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
  const winStreak = proData?.win_streak || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const formatTime = (ms: number) => `${(ms / 1000).toFixed(2)}s`;

  return (
    <div className="space-y-5 pb-4 arena-hex-bg">

      {/* ═══ RANK HERO CARD ═══ */}
      <div className="mx-4 mt-2">
        <div className={cn("arena-hero-border")} style={{ boxShadow: `0 0 30px ${tier.glow}` }}>
          <div className={cn(
            "arena-hero-inner bg-gradient-to-br p-5 text-white arena-scan-line relative overflow-hidden",
            tier.gradient
          )}>
            {/* Decorative */}
            <div className="absolute top-0 right-0 w-40 h-40 opacity-10 pointer-events-none">
              <Waves className="w-full h-full" />
            </div>
            <div className="absolute bottom-0 left-0 w-24 h-24 opacity-5 pointer-events-none">
              <Shield className="w-full h-full" />
            </div>

            {/* Floating tier emblem */}
            <motion.div
              animate={{ y: [0, -6, 0], scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-4 right-4 w-18 h-18 flex items-center justify-center text-5xl z-20"
              style={{ filter: `drop-shadow(0 0 12px ${tier.glow})` }}
            >
              {tier.emoji}
            </motion.div>

            <div className="relative z-10">
              {/* Tier badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/20 backdrop-blur-sm text-[10px] font-black tracking-[0.25em] uppercase text-white/90 mb-2 border border-white/10">
                <Crown size={10} className="text-yellow-300" />
                {tier.label} {t('TIER', 'РАНГ')}
              </div>

              {/* Player name */}
              <h2 className="text-2xl font-black font-display tracking-tight">
                {profile?.full_name || t('Pro Athlete', 'Спортсмен')}
              </h2>

              {/* Rating */}
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-black font-display tabular-nums">{rating.toLocaleString()}</span>
                <span className="text-xs text-white/50 font-mono uppercase">{t('Rating Points', 'Очков рейтинга')}</span>
              </div>

              {/* Tier progress */}
              <div className="mt-4">
                <div className="flex justify-between text-[11px] text-white/60 mb-1.5 font-medium">
                  <span className="flex items-center gap-1"><TrendingUp size={10} /> {tier.label}</span>
                  <span className="font-mono">
                    {nextTier ? (
                      tierProgress >= 80 ? (
                        <span className="text-yellow-300 font-bold animate-pulse">{Math.round(tierProgress)}% — {t('PROMOTION!', 'ПОВЫШЕНИЕ!')}</span>
                      ) : (
                        <>{Math.round(tierProgress)}% → {nextTier.label}</>
                      )
                    ) : <span className="text-yellow-300 font-bold">{t('MAX RANK', 'МАКС РАНГ')}</span>}
                  </span>
                </div>
                <NeonProgress
                  value={tierProgress}
                  variant={tierProgress >= 80 ? 'gold' : 'purple'}
                  height={12}
                  duration={1.5}
                />
              </div>

              {/* Battle stats row */}
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <div className="flex items-center gap-1.5 text-sm text-white/90 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10">
                  <Trophy size={13} className="text-yellow-300" />
                  <span className="font-bold">{wins}</span>
                  <span className="text-white/40">W</span>
                  <span className="text-white/20">/</span>
                  <span className="font-bold">{losses}</span>
                  <span className="text-white/40">L</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-white/90 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10">
                  <Target size={13} className="text-cyan-300" />
                  <span className="font-bold">{winRate}%</span>
                  <span className="text-white/40 text-xs">WR</span>
                </div>
                {winStreak >= 2 && (
                  <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="flex items-center gap-1.5 text-sm text-white/90 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-orange-500/30"
                  >
                    <Flame size={13} className="text-orange-400" />
                    <span className="font-bold">{winStreak}</span>
                    <span className="text-white/40 text-xs">{t('streak', 'серия')}</span>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ QUICK ACTIONS ═══ */}
      <div className="grid grid-cols-4 gap-2 px-4">
        {[
          { icon: Swords, label: t('Ranked', 'Ранг'), path: '/pro/arena', badge: activeDuels?.length, iconColor: 'text-red-400', badgeColor: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]', glow: 'hover:shadow-[0_0_16px_rgba(239,68,68,0.3)]' },
          { icon: Timer, label: t('Records', 'Рекорды'), path: '/pro/records', iconColor: 'text-cyan-400', glow: 'hover:shadow-[0_0_16px_rgba(6,182,212,0.3)]' },
          { icon: ShoppingBag, label: t('Shop', 'Магазин'), path: '/pro/shop', iconColor: 'text-amber-400', glow: 'hover:shadow-[0_0_16px_rgba(245,158,11,0.3)]' },
          { icon: Crown, label: t('Profile', 'Профиль'), path: '/pro/profile', iconColor: 'text-violet-400', glow: 'hover:shadow-[0_0_16px_rgba(139,92,246,0.3)]' },
        ].map((action, i) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.06, type: 'spring' }}
            onClick={() => navigate(action.path)}
            className={cn("arena-action-btn rounded-xl p-3 flex flex-col items-center gap-2 relative transition-all", action.glow)}
          >
            <action.icon size={20} className={action.iconColor} />
            <span className="text-[10px] font-semibold text-foreground leading-tight text-center tracking-wide">{action.label}</span>
            {action.badge && action.badge > 0 && (
              <span className={cn("absolute -top-1 -right-1 w-5 h-5 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse", action.badgeColor)}>
                {action.badge}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      {/* ═══ WIN RATE RING + COINS ═══ */}
      <div className="grid grid-cols-2 gap-3 px-4">
        {/* Win rate ring */}
        <GlowCard glowColor={tier.glow} className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative w-14 h-14 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                <motion.circle
                  cx="18" cy="18" r="14" fill="none"
                  stroke={tier.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: '0 88' }}
                  animate={{ strokeDasharray: `${(winRate / 100) * 88} 88` }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  style={{ filter: `drop-shadow(0 0 4px ${tier.glow})` }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-foreground">
                {winRate}%
              </span>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{t('Win Rate', 'Процент побед')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{wins + losses} {t('total duels', 'всего дуэлей')}</p>
            </div>
          </div>
        </GlowCard>

        {/* Coin balance */}
        <GlowCard glowColor="rgba(234,179,8,0.3)" className="p-4">
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <div className="text-2xl font-black text-foreground tabular-nums neon-text-gold">
              🪙 {(proData?.coin_balance || 0).toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{t('Pro Coins', 'Монеты')}</p>
          </div>
        </GlowCard>
      </div>

      {/* ═══ PERSONAL RECORDS ═══ */}
      <div className="px-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-1.5">
            <Medal size={14} className="text-amber-400" />
            {t('Personal Records', 'Личные рекорды')}
          </h3>
          <button onClick={() => navigate('/pro/records')} className="text-[11px] text-primary font-medium flex items-center gap-0.5">
            {t('All', 'Все')} <ChevronRight size={12} />
          </button>
        </div>

        {records && records.length > 0 ? records.slice(0, 4).map((r: any, i: number) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.08 }}
          >
            <GlowCard
              glowColor={i === 0 ? 'rgba(234,179,8,0.4)' : i === 1 ? 'rgba(148,163,184,0.3)' : i === 2 ? 'rgba(217,119,6,0.3)' : 'rgba(100,100,100,0.2)'}
              active={i < 3}
            >
              <div className="p-3.5 flex items-center gap-3">
                {/* Medal position */}
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0",
                  i === 0 && "bg-yellow-500/20 border border-yellow-500/30",
                  i === 1 && "bg-slate-400/20 border border-slate-400/30",
                  i === 2 && "bg-orange-600/20 border border-orange-600/30",
                  i >= 3 && "bg-muted/50 border border-border/30",
                )}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-foreground capitalize flex items-center gap-1.5">
                    {STYLE_EMOJIS[r.swim_style] || '🏊'} {r.swim_style} {r.distance_meters}m
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    FINA: {r.fina_points || '—'} pts
                    {r.is_verified && <span className="text-emerald-400 ml-1">✓ verified</span>}
                  </p>
                </div>

                <div className="text-right">
                  <span className="font-display font-black text-lg text-foreground tabular-nums">{formatTime(r.time_ms)}</span>
                </div>
              </div>
            </GlowCard>
          </motion.div>
        )) : (
          <GlowCard glowColor="rgba(100,100,100,0.2)">
            <div className="p-6 text-center">
              <Timer size={32} className="mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm font-semibold text-foreground">{t('No records yet', 'Пока нет рекордов')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('Start competing to set your first record!', 'Начни соревноваться!')}</p>
              <button
                onClick={() => navigate('/pro/arena')}
                className="mt-3 text-xs font-semibold text-primary flex items-center gap-1 mx-auto"
              >
                {t('Go to Arena', 'В арену')} <ArrowRight size={12} />
              </button>
            </div>
          </GlowCard>
        )}
      </div>

      {/* ═══ RANKED DUEL CTA ═══ */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        onClick={() => navigate('/pro/arena')}
        className="mx-4 relative overflow-hidden rounded-2xl p-4 text-white text-left bg-gradient-to-r from-red-600 to-orange-500"
        style={{ boxShadow: '0 4px 24px rgba(239,68,68,0.3)' }}
      >
        <div className="absolute inset-0 animate-shimmer" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 flex-shrink-0">
            <Swords size={24} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 flex items-center gap-1">
              <Zap size={9} /> {t('CHALLENGE', 'ВЫЗОВ')}
            </div>
            <p className="text-base font-black">{t('Enter Ranked Duel', 'Войти в ранговую дуэль')}</p>
            <p className="text-[11px] text-white/60 font-medium">{t('Climb the leaderboard', 'Поднимись в рейтинге')}</p>
          </div>
          <ArrowRight size={20} className="text-white/60 flex-shrink-0" />
        </div>
      </motion.button>
    </div>
  );
}
