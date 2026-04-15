import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Waves, MapPin, Star, Calendar, Wallet, MessageSquare, Users,
  TrendingUp, ChevronRight, Loader2, Clock, CheckCircle2, Circle,
  Camera, FileText, Video, DollarSign, BarChart3, Sparkles,
  Navigation, Play, ArrowRight, Power, AlertCircle
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { NeonProgress } from '@/components/ui/neon-progress';
import { GlowCard } from '@/components/ui/glow-card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ── Profile completion steps ──
const PROFILE_STEPS = [
  { key: 'photo', label: 'Add photo', icon: Camera, check: (f: any) => !!f?.profiles?.avatar_url },
  { key: 'bio', label: 'Write bio', icon: FileText, check: (f: any) => !!f?.bio && f.bio.length > 20 },
  { key: 'specializations', label: 'Set specializations', icon: Waves, check: (f: any) => f?.specializations?.length > 0 },
  { key: 'rate', label: 'Set hourly rate', icon: DollarSign, check: (f: any) => !!f?.hourly_rate && f.hourly_rate > 0 },
  { key: 'availability', label: 'Set schedule', icon: Calendar, check: (_f: any, avail: any[]) => avail?.length > 0 },
  { key: 'certifications', label: 'Upload certifications', icon: FileText, check: (_f: any, _a: any[], certs: any[]) => certs?.length > 0 },
  { key: 'video', label: 'Add intro video', icon: Video, check: (f: any) => !!f?.video_url },
];

export default function FreelancerDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useLanguage();

  // ── Queries ──
  const { data: freelancerData, isLoading } = useQuery({
    queryKey: ['freelancer-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('freelancers')
        .select('*, profiles!freelancers_id_fkey(full_name, avatar_url, city)')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: availability } = useQuery({
    queryKey: ['freelancer-availability', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('freelancer_availability')
        .select('*')
        .eq('freelancer_id', user!.id)
        .eq('is_active', true);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: certifications } = useQuery({
    queryKey: ['freelancer-certs', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('freelancer_certifications')
        .select('*')
        .eq('freelancer_id', user!.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: requests } = useQuery({
    queryKey: ['freelancer-requests', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('freelancer_requests')
        .select('*, profiles!freelancer_requests_client_id_fkey(full_name, avatar_url), pools(name)')
        .eq('freelancer_id', user!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: todayBookings } = useQuery({
    queryKey: ['freelancer-today-bookings', user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('bookings')
        .select(`
          id, status, lesson_fee, currency, created_at,
          students(id, profiles:students_id_fkey(full_name)),
          pools(name, address),
          time_slots(date, start_time, end_time)
        `)
        .eq('coach_id', user!.id)
        .in('status', ['confirmed', 'in_progress'])
        .order('created_at');
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: monthlyStats } = useQuery({
    queryKey: ['freelancer-monthly-stats', user?.id],
    queryFn: async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data: bookings } = await supabase
        .from('bookings')
        .select('lesson_fee, currency, status')
        .eq('coach_id', user!.id)
        .gte('created_at', monthStart);

      const completed = (bookings || []).filter((b: any) => b.status === 'completed');
      const totalEarned = completed.reduce((s: number, b: any) => s + Number(b.lesson_fee || 0), 0);
      const lessonsCount = completed.length;
      const allCount = (bookings || []).length;
      const currency = bookings?.[0]?.currency || 'AED';
      return { totalEarned, lessonsCount, allCount, currency };
    },
    enabled: !!user?.id,
  });

  // ── Computed ──
  const profile = (freelancerData as any)?.profiles;
  const firstName = profile?.full_name?.split(' ')[0] || freelancerData?.profiles?.full_name?.split(' ')[0] || t('Coach', 'Тренер');
  const isLive = freelancerData?.is_live || false;
  const commissionRate = freelancerData?.commission_rate || 15;

  // Profile completion
  const completedSteps = PROFILE_STEPS.filter(step =>
    step.check(freelancerData, availability || [], certifications || [])
  );
  const completionPct = Math.round((completedSteps.length / PROFILE_STEPS.length) * 100);
  const isProfileComplete = completionPct === 100;

  // Monthly earnings after commission
  const grossEarnings = monthlyStats?.totalEarned || 0;
  const commission = Math.round(grossEarnings * (commissionRate / 100));
  const netEarnings = grossEarnings - commission;

  // Toggle live status
  const toggleLive = async () => {
    if (!user?.id) return;
    await supabase.from('freelancers').update({ is_live: !isLive } as any).eq('id', user.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-28">
      {/* ═══ FREELANCER HERO ═══ */}
      <div className="relative px-5 pt-7 pb-6 overflow-hidden" style={{ background: 'linear-gradient(160deg, #061a1f 0%, #0a2e35 30%, #0d4048 60%, #0a2e35 100%)' }}>
        <div className="absolute top-[-30px] right-[-20px] w-60 h-60 rounded-full opacity-20 pointer-events-none blur-xl" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 60%)' }} />
        <div className="absolute bottom-[-30px] left-[-20px] w-48 h-48 rounded-full opacity-10 pointer-events-none blur-2xl" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 60%)' }} />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 0.5px, transparent 0.5px)', backgroundSize: '20px 20px' }} />
        <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none" style={{ background: 'linear-gradient(to top, hsl(var(--background)), transparent)' }} />

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative">
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/70 font-medium">{t('Freelance Coach', 'Фриланс тренер')}</p>
          <h2 className="font-display font-bold text-2xl text-white mt-0.5">{firstName}</h2>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-sm text-white/80 px-3 py-1.5 rounded-xl border border-white/[0.08]" style={{ background: 'rgba(255,255,255,0.04)' }}>
              ⭐ <span className="font-bold text-white">{Number(freelancerData?.avg_rating || 0).toFixed(1)}</span>
            </span>
            <span className="text-sm text-white/80 px-3 py-1.5 rounded-xl border border-white/[0.08]" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <span className="font-bold text-white">{freelancerData?.total_lessons_completed || 0}</span> <span className="text-white/40 text-xs">{t('lessons', 'уроков')}</span>
            </span>
            {isLive && (
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                LIVE
              </span>
            )}
          </div>
        </motion.div>
      </div>

      <div className="px-4 space-y-5">

      {/* ═══ ONBOARDING PROGRESS (if < 100%) ═══ */}
      {!isProfileComplete && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlowCard glowColor="rgba(6, 182, 212, 0.3)">
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-1.5">
                  <Sparkles size={14} className="text-cyan-400" />
                  {t('Complete your profile to go live!', 'Заполните профиль чтобы стать видимым!')}
                </h3>
                <span className="text-xs font-mono font-bold text-cyan-400">{completionPct}%</span>
              </div>
              <NeonProgress value={completionPct} variant="cyan" height={8} duration={1.5} />

              <div className="grid grid-cols-2 gap-2 mt-3">
                {PROFILE_STEPS.map((step) => {
                  const done = step.check(freelancerData, availability || [], certifications || []);
                  return (
                    <button
                      key={step.key}
                      onClick={() => navigate('/freelancer/profile')}
                      className={cn(
                        "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium transition-all text-left",
                        done
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                      )}
                    >
                      {done ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                      {step.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </GlowCard>
        </motion.div>
      )}

      {/* ═══ HERO STATS CARD ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-600 via-teal-500 to-emerald-600 p-5 text-white"
      >
        <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
          <Waves className="w-full h-full" />
        </div>

        <div className="relative">
          <p className="text-xs text-white/60 font-medium">{t('Welcome back', 'С возвращением')}</p>
          <h2 className="font-display font-bold text-xl mt-0.5">{firstName} 🏊</h2>
          <p className="text-xs text-white/70 mt-0.5">{t('Freelance Swimming Coach', 'Фриланс тренер')}</p>

          {/* Live toggle */}
          <button
            onClick={toggleLive}
            className={cn(
              "mt-3 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
              isLive
                ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400/30"
                : "bg-white/15 text-white/80 border border-white/20"
            )}
          >
            <Power size={12} />
            {isLive ? t('LIVE on marketplace', 'Активен в маркетплейсе') : t('Go live →', 'Стать активным →')}
            <span className={cn("w-2 h-2 rounded-full", isLive ? "bg-emerald-400 animate-pulse" : "bg-white/40")} />
          </button>

          {/* Stats row */}
          <div className="flex items-center gap-3 mt-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-1.5 text-center">
              <p className="text-lg font-black">{freelancerData?.avg_rating ? Number(freelancerData.avg_rating).toFixed(1) : '—'}</p>
              <p className="text-[9px] text-white/60">⭐ {t('Rating', 'Рейтинг')}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-1.5 text-center">
              <p className="text-lg font-black">{monthlyStats?.lessonsCount || 0}</p>
              <p className="text-[9px] text-white/60">🏊 {t('This month', 'За месяц')}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-1.5 text-center">
              <p className="text-lg font-black">{netEarnings.toLocaleString()}</p>
              <p className="text-[9px] text-white/60">💰 {monthlyStats?.currency || 'AED'}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══ INCOMING REQUESTS ═══ */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-1.5">
            <MessageSquare size={14} className="text-amber-400" />
            {t('Incoming Requests', 'Входящие заявки')}
            {requests && requests.length > 0 && (
              <span className="w-5 h-5 bg-amber-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(245,158,11,0.4)] animate-pulse">
                {requests.length}
              </span>
            )}
          </h3>
          <button onClick={() => navigate('/freelancer/requests')} className="text-[11px] text-primary font-medium flex items-center gap-0.5">
            {t('All', 'Все')} <ChevronRight size={12} />
          </button>
        </div>

        {requests && requests.length > 0 ? requests.slice(0, 2).map((req: any, i: number) => {
          const client = req.profiles as any;
          const pool = req.pools as any;
          const timeAgo = Math.floor((Date.now() - new Date(req.created_at).getTime()) / 3600000);
          return (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-card rounded-2xl p-4 border border-border shadow-sm"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary">
                    {client?.full_name?.[0] || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{client?.full_name || t('Client', 'Клиент')}</p>
                    <p className="text-[10px] text-muted-foreground">{timeAgo < 1 ? t('Just now', 'Только что') : `${timeAgo}h ago`}</p>
                  </div>
                </div>
                {req.lesson_rate && (
                  <span className="text-xs font-bold text-emerald-500">{req.lesson_rate} {req.currency || 'AED'}</span>
                )}
              </div>
              {req.message && (
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">"{req.message}"</p>
              )}
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-3">
                {pool && <><MapPin size={10} /> {pool.name}</>}
                {req.swim_style && <> · {req.swim_style}</>}
                {req.student_age && <> · {req.student_age}yo</>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 h-8 rounded-xl text-xs bg-gradient-to-r from-cyan-500 to-blue-500 border-0">
                  {t('Accept', 'Принять')}
                </Button>
                <Button size="sm" variant="outline" className="flex-1 h-8 rounded-xl text-xs">
                  {t('Decline', 'Отклонить')}
                </Button>
                <Button size="sm" variant="outline" className="h-8 w-8 rounded-xl p-0">
                  <MessageSquare size={14} />
                </Button>
              </div>
            </motion.div>
          );
        }) : (
          <div className="bg-card rounded-2xl p-6 text-center border border-border">
            <div className="text-3xl mb-2">📩</div>
            <p className="text-sm font-medium text-foreground">{t('No requests yet', 'Пока нет заявок')}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isProfileComplete
                ? t('Clients will find you in the marketplace', 'Клиенты найдут вас в маркетплейсе')
                : t('Complete your profile to start receiving requests', 'Заполните профиль чтобы получать заявки')}
            </p>
          </div>
        )}
      </div>

      {/* ═══ TODAY'S SCHEDULE ═══ */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-1.5">
            <Calendar size={14} className="text-blue-400" />
            {t("Today's Lessons", 'Уроки сегодня')}
          </h3>
          <button onClick={() => navigate('/freelancer/schedule')} className="text-[11px] text-primary font-medium flex items-center gap-0.5">
            {t('Schedule', 'Расписание')} <ChevronRight size={12} />
          </button>
        </div>

        {todayBookings && todayBookings.length > 0 ? todayBookings.map((booking: any, i: number) => {
          const student = booking.students as any;
          const pool = booking.pools as any;
          const slot = booking.time_slots as any;
          const isLiveLesson = booking.status === 'in_progress';
          return (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={cn(
                "bg-card rounded-2xl p-4 border shadow-sm",
                isLiveLesson ? "border-emerald-400/40 shadow-emerald-500/5" : "border-border"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground">
                    {slot?.start_time?.substring(0, 5) || '--:--'}
                  </span>
                  {isLiveLesson && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-bold animate-pulse">LIVE</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {slot?.end_time?.substring(0, 5)} · {booking.lesson_fee} {booking.currency || 'AED'}
                </span>
              </div>
              <p className="text-sm font-medium text-foreground">
                🏊 {(student?.profiles as any)?.full_name || t('Student', 'Ученик')}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin size={10} /> {pool?.name || pool?.address || 'TBD'}
              </p>
              <div className="flex gap-2 mt-3">
                {isLiveLesson ? (
                  <Button size="sm" className="flex-1 h-8 rounded-xl text-xs bg-emerald-500 hover:bg-emerald-600">
                    {t('Complete → Report', 'Завершить → Отчёт')}
                  </Button>
                ) : (
                  <>
                    <Button size="sm" className="flex-1 h-8 rounded-xl text-xs">
                      <Play size={12} className="mr-1" /> {t('Start', 'Старт')}
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 rounded-xl text-xs px-3">
                      <Navigation size={12} />
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 rounded-xl text-xs px-3">
                      <MessageSquare size={12} />
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          );
        }) : (
          <div className="bg-card rounded-2xl p-5 text-center border border-border">
            <div className="text-3xl mb-2">🏖️</div>
            <p className="text-sm font-medium text-foreground">{t('Free day!', 'Свободный день!')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('No lessons scheduled for today', 'На сегодня нет уроков')}</p>
          </div>
        )}
      </div>

      {/* ═══ EARNINGS OVERVIEW ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-2xl p-4 border border-border shadow-sm"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-1.5">
            <Wallet size={14} className="text-emerald-400" />
            {t('Earnings', 'Доход')}
          </h3>
          <button onClick={() => navigate('/freelancer/earnings')} className="text-[11px] text-primary font-medium">
            {t('Details', 'Подробнее')} →
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{netEarnings.toLocaleString()}</p>
            <p className="text-[9px] text-muted-foreground">{t('Net', 'Чистыми')} ({monthlyStats?.currency || 'AED'})</p>
          </div>
          <div className="bg-sky-50 dark:bg-sky-500/10 rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-sky-600 dark:text-sky-400">{monthlyStats?.lessonsCount || 0}</p>
            <p className="text-[9px] text-muted-foreground">{t('Lessons', 'Уроки')}</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{commissionRate}%</p>
            <p className="text-[9px] text-muted-foreground">{t('Commission', 'Комиссия')}</p>
          </div>
        </div>

        {netEarnings > 0 && (
          <Button
            className="w-full h-9 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 border-0"
            onClick={() => navigate('/freelancer/earnings')}
          >
            {t('Withdraw', 'Вывести')} {netEarnings.toLocaleString()} {monthlyStats?.currency || 'AED'}
          </Button>
        )}
      </motion.div>

      {/* ═══ REVIEWS PREVIEW ═══ */}
      <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-1.5">
            <Star size={14} className="text-amber-400" />
            {t('Reviews', 'Отзывы')}
          </h3>
          <button onClick={() => navigate('/freelancer/reviews')} className="text-[11px] text-primary font-medium">
            {t('All', 'Все')} →
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-3xl font-black text-foreground">
            {freelancerData?.avg_rating ? Number(freelancerData.avg_rating).toFixed(1) : '—'}
          </div>
          <div>
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(s => (
                <Star key={s} size={14} className={cn(
                  s <= Math.round(Number(freelancerData?.avg_rating || 0))
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/30"
                )} />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {freelancerData?.total_lessons_completed || 0} {t('lessons completed', 'уроков проведено')}
            </p>
          </div>
        </div>
      </div>

      {/* ═══ AI GROWTH TIPS ═══ */}
      <div className="space-y-2">
        <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-1.5">
          <Sparkles size={14} className="text-violet-400" />
          {t('Growth Tips', 'Советы по росту')}
        </h3>
        {[
          { show: !freelancerData?.video_url, icon: '📹', text: t('Add a video intro — coaches with videos get 3x more requests', 'Добавьте видео — тренеры с видео получают в 3 раза больше заявок'), action: '/freelancer/profile' },
          { show: (certifications || []).length === 0, icon: '📜', text: t('Upload certifications — verified coaches earn 60% more', 'Загрузите сертификаты — верифицированные тренеры зарабатывают на 60% больше'), action: '/freelancer/profile' },
          { show: !freelancerData?.hourly_rate, icon: '💰', text: t('Set competitive rates to attract your first clients', 'Установите конкурентные тарифы для привлечения клиентов'), action: '/freelancer/profile' },
          { show: (availability || []).length === 0, icon: '📅', text: t('Open time slots so clients can book you', 'Откройте слоты чтобы клиенты могли записаться'), action: '/freelancer/schedule' },
        ].filter(tip => tip.show).slice(0, 2).map((tip, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.06 }}
            onClick={() => navigate(tip.action)}
            className="w-full flex items-start gap-3 p-3 bg-violet-500/5 border border-violet-500/10 rounded-xl text-left hover:bg-violet-500/10 transition-colors"
          >
            <span className="text-xl mt-0.5">{tip.icon}</span>
            <p className="text-xs text-foreground flex-1">{tip.text}</p>
            <ArrowRight size={14} className="text-violet-400 mt-0.5 flex-shrink-0" />
          </motion.button>
        ))}
      </div>

      {/* ═══ QUICK ACTIONS ═══ */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: Calendar, label: t('Schedule', 'Расписание'), path: '/freelancer/schedule', color: 'text-blue-400' },
          { icon: Wallet, label: t('Earnings', 'Доход'), path: '/freelancer/earnings', color: 'text-emerald-400' },
          { icon: Star, label: t('Reviews', 'Отзывы'), path: '/freelancer/reviews', color: 'text-amber-400' },
          { icon: BarChart3, label: t('Growth', 'Рост'), path: '/freelancer/growth', color: 'text-violet-400' },
        ].map((action, i) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + i * 0.05 }}
            onClick={() => navigate(action.path)}
            className="bg-card rounded-xl p-3 flex flex-col items-center gap-1.5 border border-border shadow-sm hover:border-primary/20 hover:shadow-md transition-all"
          >
            <action.icon size={18} className={action.color} />
            <span className="text-[10px] font-medium text-foreground">{action.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
    </div>
  );
}
