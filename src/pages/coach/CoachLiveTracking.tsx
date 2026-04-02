import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Signal, Users, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/hooks/useLanguage';
import { Badge } from '@/components/ui/badge';
import { COACH_RANKS } from '@/lib/constants';

export default function CoachLiveTracking() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const { data: coachData, isLoading: isCoachLoading } = useQuery({
    queryKey: ['coach-tracking-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('coaches')
        .select('id, rank, avg_rating, total_lessons_completed, current_lat, current_lng, last_location_update, gps_tracking_active, profiles!coaches_id_fkey(full_name, city)')
        .eq('id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: nextLesson } = useQuery({
    queryKey: ['coach-next-lesson-tracking', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('bookings')
        .select('id, status, pools(name, address), students(profiles:students_id_fkey(full_name))')
        .eq('coach_id', user!.id)
        .in('status', ['confirmed', 'in_progress'])
        .order('created_at')
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLastUpdate(new Date());
        if (user?.id) {
          supabase.from('coaches').update({
            current_lat: pos.coords.latitude,
            current_lng: pos.coords.longitude,
            last_location_update: new Date().toISOString(),
            gps_tracking_active: true,
          }).eq('id', user.id);
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setCoords(null);
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    return () => {
      navigator.geolocation.clearWatch(watchId);
      if (user?.id) {
        supabase.from('coaches').update({ gps_tracking_active: false }).eq('id', user.id);
      }
    };
  }, [user?.id]);

  const profile = coachData?.profiles as any;
  const rankInfo = COACH_RANKS.find(r => r.id === coachData?.rank);
  const pool = (nextLesson?.pools as any);
  const studentName = (nextLesson?.students as any)?.profiles?.full_name;
  const mapLat = coords?.lat || coachData?.current_lat || 25.2048;
  const mapLng = coords?.lng || coachData?.current_lng || 55.2708;

  const timeSinceUpdate = lastUpdate
    ? Math.floor((Date.now() - lastUpdate.getTime()) / 1000)
    : null;

  if (isCoachLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <button onClick={() => navigate('/coach')} className="p-1">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-foreground">{t('Live Tracking', 'Трекинг')}</h1>
          <p className="text-xs text-muted-foreground">{t('Parents see your location', 'Родители видят вашу позицию')}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-xs text-emerald-600 font-medium">LIVE</span>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <iframe
          title="Coach location"
          className="w-full h-full border-0"
          src={`https://www.google.com/maps?q=${mapLat},${mapLng}&z=15&output=embed`}
          allowFullScreen
        />

        {/* Coach profile card overlay */}
        <div className="absolute top-3 left-3 right-3 bg-card/95 backdrop-blur-sm rounded-2xl p-3 border border-border shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center font-bold text-primary">
              {profile?.full_name?.[0] || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">{profile?.full_name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[10px] h-5" style={{ borderColor: rankInfo?.color, color: rankInfo?.color }}>
                  {rankInfo?.label || 'Trainee'}
                </Badge>
                <span className="text-xs text-muted-foreground">★ {Number(coachData?.avg_rating || 0).toFixed(1)}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{profile?.city || 'Dubai'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom metrics panel */}
      <div className="bg-card border-t border-border px-4 py-4 space-y-3 pb-28">
        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <Signal className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
            <p className="text-xs text-muted-foreground">{t('Signal', 'Сигнал')}</p>
            <p className="text-sm font-bold text-foreground">{coords ? t('Active', 'Активен') : t('Searching', 'Поиск')}</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <Clock className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">{t('Updated', 'Обновлено')}</p>
            <p className="text-sm font-bold text-foreground">
              {timeSinceUpdate !== null ? `${timeSinceUpdate}s` : '—'}
            </p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <Users className="w-4 h-4 mx-auto mb-1 text-amber-500" />
            <p className="text-xs text-muted-foreground">{t('Viewers', 'Зрители')}</p>
            <p className="text-sm font-bold text-foreground">{coachData?.gps_tracking_active ? '—' : '0'}</p>
          </div>
        </div>

        {/* Next destination */}
        {nextLesson && (
          <div className="bg-primary/5 rounded-xl p-3 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">{t('Next destination', 'Следующая точка')}</p>
              <p className="text-sm font-semibold text-foreground truncate">
                {pool?.name || pool?.address || 'TBD'}
              </p>
              {studentName && (
                <p className="text-xs text-muted-foreground">{studentName}</p>
              )}
            </div>
            <button
              onClick={() => {
                const addr = pool?.address || pool?.name || '';
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`, '_blank');
              }}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium"
            >
              {t('Navigate', 'Маршрут')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
