import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Star, QrCode, CheckCircle, AlertCircle, Settings, LogOut, Glasses } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CoinBalance } from '@/components/CoinBalance';
import { PageHeader } from '@/components/layout/PageHeader';
import { NotificationSettings } from '@/components/NotificationSettings';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { COACH_RANKS } from '@/lib/constants';
import QRProfileSheet from '@/components/QRProfileSheet';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

export default function CoachProfile() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [qrOpen, setQrOpen] = useState(false);

  const { data: coachData, isLoading } = useQuery({
    queryKey: ['coach-full-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaches')
        .select('*, profiles!coaches_id_fkey(full_name, city, phone, avatar_url)')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const profile = coachData?.profiles as any;
  const rankInfo = COACH_RANKS.find(r => r.id === coachData?.rank);
  const rankIndex = COACH_RANKS.findIndex(r => r.id === coachData?.rank);
  const nextRank = COACH_RANKS[Math.min(rankIndex + 1, COACH_RANKS.length - 1)];
  const totalLessons = coachData?.total_lessons_completed || 0;
  const rating = Number(coachData?.avg_rating || 0);

  // Career progress requirements (example thresholds)
  const nextRankLessons = rankIndex === 0 ? 50 : rankIndex === 1 ? 150 : rankIndex === 2 ? 500 : 1000;
  const nextRankRating = rankIndex <= 1 ? 4.0 : 4.5;
  const lessonsProgress = Math.min((totalLessons / nextRankLessons) * 100, 100);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-5 pb-28">
      <PageHeader title={t('My Profile', 'Мой профиль')} backRoute="/coach" />

      {/* Profile Card */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-2xl p-6 text-center relative border border-border shadow-sm">
        <button
          onClick={() => setQrOpen(true)}
          className="absolute top-4 right-4 p-2 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors"
        >
          <QrCode className="w-5 h-5 text-primary" />
        </button>

        <div className="w-20 h-20 mx-auto rounded-full bg-primary/15 flex items-center justify-center text-3xl font-bold text-primary mb-3" style={{ borderColor: rankInfo?.color, borderWidth: 3, borderStyle: 'solid' }}>
          {profile?.full_name?.[0] || '?'}
        </div>
        <h2 className="font-bold text-xl text-foreground">{profile?.full_name || 'Coach'}</h2>
        <p className="text-sm text-muted-foreground">{profile?.city || '—'}</p>
        <div className="flex items-center justify-center gap-3 mt-3">
          <Badge variant="outline" style={{ borderColor: rankInfo?.color, color: rankInfo?.color }}>
            {rankInfo?.label || 'Trainee'}
          </Badge>
          <div className="flex items-center gap-1">
            <Star size={14} className="text-amber-500 fill-amber-500" />
            <span className="text-sm font-bold text-foreground">{rating.toFixed(1)}</span>
          </div>
          <CoinBalance amount={coachData?.coin_balance || 0} size="sm" />
        </div>
      </motion.div>

      {/* Career Progress */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl p-4 border border-border shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-sm text-foreground">{t('Career Progress', 'Карьерный рост')}</h3>
          <span className="text-xs text-muted-foreground">
            {rankInfo?.label || 'Trainee'} → {nextRank.label}
          </span>
        </div>

        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">{t('Lessons completed', 'Уроков проведено')}</span>
            <span className="font-medium text-foreground">{totalLessons} / {nextRankLessons}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all" style={{ width: `${lessonsProgress}%` }} />
          </div>
        </div>

        <div className="space-y-2">
          {[
            { label: t(`Lessons (${nextRankLessons} required)`, `Уроки (нужно ${nextRankLessons})`), done: totalLessons >= nextRankLessons, value: `${totalLessons}/${nextRankLessons}` },
            { label: t(`Rating (${nextRankRating}+ required)`, `Рейтинг (нужно ${nextRankRating}+)`), done: rating >= nextRankRating, value: `${rating.toFixed(1)}/${nextRankRating}` },
          ].map(req => (
            <div key={req.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {req.done
                  ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                  : <AlertCircle className="w-4 h-4 text-amber-500" />
                }
                <span className="text-xs text-muted-foreground">{req.label}</span>
              </div>
              <span className={cn("text-xs font-medium", req.done ? "text-emerald-600" : "text-amber-600")}>
                {req.value}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card rounded-2xl p-4 border border-border shadow-sm space-y-3">
        <h3 className="font-semibold text-sm text-foreground">{t('Stats', 'Статистика')}</h3>
        <div className="grid grid-cols-2 gap-3">
          <Stat label={t('Total Lessons', 'Всего уроков')} value={totalLessons} />
          <Stat label={t('Hourly Rate', 'Ставка/час')} value={`${coachData?.hourly_rate_aed || 0} AED`} />
          <Stat label={t('Specializations', 'Специализации')} value={(coachData?.specializations || []).join(', ') || '—'} />
        </div>

        {/* Ray-Ban */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
          <div className="flex items-center gap-2">
            <Glasses className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Ray-Ban Meta</span>
          </div>
          <span className={cn(
            "text-xs px-2 py-1 rounded-full font-medium",
            coachData?.has_rayban_meta
              ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              : "bg-muted text-muted-foreground"
          )}>
            {coachData?.has_rayban_meta ? t('✅ Connected', '✅ Подключено') : t('Not connected', 'Не подключено')}
          </span>
        </div>
      </motion.div>

      {/* Notifications */}
      <NotificationSettings />

      {/* Settings + Logout */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/settings')}
          className="flex-1 py-3 border border-border rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-card hover:bg-muted/50 transition-colors"
        >
          <Settings className="w-4 h-4" />
          {t('Settings', 'Настройки')}
        </button>
        <button
          onClick={handleLogout}
          className="flex-1 py-3 bg-destructive/10 text-destructive rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-destructive/20 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t('Logout', 'Выйти')}
        </button>
      </div>

      <QRProfileSheet open={qrOpen} onOpenChange={setQrOpen} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-muted/50 rounded-xl p-3">
      <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
      <p className="font-bold text-sm text-foreground">{value}</p>
    </div>
  );
}
