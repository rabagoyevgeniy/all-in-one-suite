import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { MessageSquare, Phone, MapPin, Loader2, QrCode } from 'lucide-react';
import { format } from 'date-fns';
import QRProfileSheet from '@/components/QRProfileSheet';

interface UserProfileSheetProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function getInitials(name: string | null) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const ROLE_LABELS: Record<string, { en: string; ru: string; emoji: string }> = {
  coach: { en: 'Coach', ru: 'Тренер', emoji: '🏊' },
  parent: { en: 'Parent', ru: 'Родитель', emoji: '👨‍👩‍👧' },
  admin: { en: 'Admin', ru: 'Админ', emoji: '👑' },
  head_manager: { en: 'Head Manager', ru: 'Главный менеджер', emoji: '👑' },
  student: { en: 'Student', ru: 'Ученик', emoji: '🎓' },
  pro_athlete: { en: 'Pro Athlete', ru: 'Про спортсмен', emoji: '🏅' },
  personal_manager: { en: 'Manager', ru: 'Менеджер', emoji: '💼' },
};

export default function UserProfileSheet({ userId, open, onOpenChange }: UserProfileSheetProps) {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [qrOpen, setQrOpen] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile-sheet', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, city, phone, created_at')
        .eq('id', userId!)
        .single();
      return data;
    },
    enabled: !!userId && open,
  });

  const { data: userRole } = useQuery({
    queryKey: ['user-role-sheet', userId],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_user_role', { _user_id: userId! });
      return data as string | null;
    },
    enabled: !!userId && open,
  });

  const { data: coachStats } = useQuery({
    queryKey: ['coach-stats-sheet', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('coaches')
        .select('total_lessons_completed, avg_rating, rank')
        .eq('id', userId!)
        .single();
      return data;
    },
    enabled: !!userId && open && userRole === 'coach',
  });

  const handleMessage = async () => {
    if (!userId || userId === user?.id) return;
    try {
      const { data: roomId } = await supabase.rpc('create_direct_chat', { other_user_id: userId });
      onOpenChange(false);
      navigate(`/chat/${roomId}`);
    } catch {}
  };

  const roleMeta = ROLE_LABELS[userRole || ''] || { en: 'User', ru: 'Пользователь', emoji: '👤' };
  const isSelf = userId === user?.id;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl p-0 pb-8 overflow-hidden">
          <SheetTitle className="sr-only">{t('User Profile', 'Профиль')}</SheetTitle>
          {isLoading || !profile ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Hero gradient header */}
              <div className="bg-gradient-to-br from-primary to-primary/70 px-6 pt-8 pb-12 relative overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-foreground/5 rounded-full -translate-y-8 translate-x-8" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary-foreground/5 rounded-full translate-y-8 -translate-x-8" />

                <div className="relative flex flex-col items-center text-center">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="w-24 h-24 rounded-full object-cover border-4 border-primary-foreground/30 shadow-xl mb-3"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center text-primary-foreground text-3xl font-bold border-4 border-primary-foreground/30 shadow-xl mb-3">
                      {getInitials(profile.full_name)}
                    </div>
                  )}
                  <h2 className="text-2xl font-bold text-primary-foreground">{profile.full_name}</h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="bg-primary-foreground/20 text-primary-foreground text-xs px-3 py-1 rounded-full">
                      {roleMeta.emoji} {t(roleMeta.en, roleMeta.ru)}
                    </span>
                    {profile.city && (
                      <span className="bg-primary-foreground/20 text-primary-foreground text-xs px-3 py-1 rounded-full flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {profile.city}
                      </span>
                    )}
                  </div>
                  <p className="text-primary-foreground/60 text-xs mt-2">
                    {t('ProFit member since', 'Участник ProFit с')} {profile.created_at ? format(new Date(profile.created_at), 'MMM yyyy') : '—'}
                  </p>
                </div>
              </div>

              {/* Coach stats overlapping hero */}
              {userRole === 'coach' && coachStats && (
                <div className="mx-4 -mt-6 bg-background rounded-2xl shadow-lg border border-border flex divide-x divide-border relative z-10">
                  {[
                    { label: t('Lessons', 'Уроки'), value: coachStats.total_lessons_completed || 0 },
                    { label: t('Rating', 'Рейтинг'), value: `⭐ ${(coachStats.avg_rating || 0).toFixed(1)}` },
                    { label: t('Rank', 'Ранг'), value: coachStats.rank || '—' },
                  ].map(stat => (
                    <div key={stat.label} className="flex-1 flex flex-col items-center py-4 px-2">
                      <div className="text-lg font-bold text-foreground capitalize">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              {!isSelf && (
                <div className="flex gap-3 px-4 mt-4">
                  <button
                    onClick={handleMessage}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-primary text-primary-foreground rounded-2xl font-medium shadow-md hover:bg-primary/90 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {t('Message', 'Написать')}
                  </button>
                  {profile.phone && (
                    <button
                      onClick={() => window.open(`tel:${profile.phone}`)}
                      className="flex items-center justify-center w-14 h-14 bg-muted hover:bg-muted/80 rounded-2xl transition-colors"
                    >
                      <Phone className="w-5 h-5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              )}

              {isSelf && (
                <div className="flex gap-3 px-4 mt-4">
                  <button
                    onClick={() => { onOpenChange(false); setQrOpen(true); }}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-primary text-primary-foreground rounded-2xl font-medium shadow-md hover:bg-primary/90 transition-colors"
                  >
                    <QrCode className="w-4 h-4" />
                    {t('My QR Code', 'Мой QR код')}
                  </button>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      <QRProfileSheet open={qrOpen} onOpenChange={setQrOpen} />
    </>
  );
}
