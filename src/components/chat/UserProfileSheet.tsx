import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { MessageSquare, Phone, MapPin, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface UserProfileSheetProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function getInitials(name: string | null) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const ROLE_LABELS: Record<string, { en: string; ru: string; color: string }> = {
  coach: { en: 'Coach', ru: 'Тренер', color: 'bg-primary/10 text-primary' },
  parent: { en: 'Parent', ru: 'Родитель', color: 'bg-[hsl(142_71%_45%/0.1)] text-[hsl(142_71%_45%)]' },
  admin: { en: 'Admin', ru: 'Админ', color: 'bg-destructive/10 text-destructive' },
  head_manager: { en: 'Head Manager', ru: 'Главный менеджер', color: 'bg-destructive/10 text-destructive' },
  student: { en: 'Student', ru: 'Ученик', color: 'bg-[hsl(270_60%_55%/0.1)] text-[hsl(270_60%_55%)]' },
  pro_athlete: { en: 'Pro Athlete', ru: 'Про спортсмен', color: 'bg-[hsl(38_92%_50%/0.1)] text-[hsl(38_92%_50%)]' },
  personal_manager: { en: 'Manager', ru: 'Менеджер', color: 'bg-[hsl(174_60%_40%/0.1)] text-[hsl(174_60%_40%)]' },
};

export default function UserProfileSheet({ userId, open, onOpenChange }: UserProfileSheetProps) {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const navigate = useNavigate();

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

  // Get role from user_roles
  const { data: userRole } = useQuery({
    queryKey: ['user-role-sheet', userId],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_user_role', { _user_id: userId! });
      return data as string | null;
    },
    enabled: !!userId && open,
  });

  // Coach stats
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

  const roleMeta = ROLE_LABELS[userRole || ''] || { en: 'User', ru: 'Пользователь', color: 'bg-muted text-muted-foreground' };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-8">
        <SheetTitle className="sr-only">{t('User Profile', 'Профиль')}</SheetTitle>
        {isLoading || !profile ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center pt-2 pb-6">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-20 h-20 rounded-full object-cover shadow-lg mb-3 ring-4 ring-primary/20"
                />
              ) : (
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg mb-3 text-[hsl(0_0%_100%)]"
                  style={{ background: 'linear-gradient(135deg, hsl(199 89% 52%) 0%, hsl(199 89% 42%) 100%)' }}
                >
                  {getInitials(profile.full_name)}
                </div>
              )}
              <h2 className="text-xl font-bold text-foreground">{profile.full_name}</h2>
              <span className={`mt-1 px-3 py-0.5 rounded-full text-xs font-medium ${roleMeta.color}`}>
                {t(roleMeta.en, roleMeta.ru)}
              </span>
              {profile.city && (
                <div className="flex items-center gap-1 mt-2 text-muted-foreground text-sm">
                  <MapPin className="w-3.5 h-3.5" />
                  {profile.city}
                </div>
              )}
            </div>

            {userRole === 'coach' && coachStats && (
              <div className="flex justify-around py-4 border-y border-border mb-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-foreground">{coachStats.total_lessons_completed || 0}</div>
                  <div className="text-xs text-muted-foreground">{t('Lessons', 'Уроки')}</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-foreground">⭐ {(coachStats.avg_rating || 0).toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">{t('Rating', 'Рейтинг')}</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-foreground capitalize">{coachStats.rank || '—'}</div>
                  <div className="text-xs text-muted-foreground">{t('Rank', 'Ранг')}</div>
                </div>
              </div>
            )}

            {userId !== user?.id && (
              <div className="flex gap-3 px-4">
                <button
                  onClick={handleMessage}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-medium transition-colors text-[hsl(0_0%_100%)]"
                  style={{ background: 'hsl(199 89% 48%)' }}
                >
                  <MessageSquare className="w-4 h-4" />
                  {t('Message', 'Написать')}
                </button>
                {profile.phone && (
                  <button
                    onClick={() => window.open(`tel:${profile.phone}`)}
                    className="flex items-center justify-center w-12 h-12 bg-muted hover:bg-muted/80 rounded-2xl transition-colors"
                  >
                    <Phone className="w-5 h-5 text-muted-foreground" />
                  </button>
                )}
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground mt-4">
              {t('Member since', 'Участник с')} {profile.created_at ? format(new Date(profile.created_at), 'MMM yyyy') : '—'}
            </p>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
