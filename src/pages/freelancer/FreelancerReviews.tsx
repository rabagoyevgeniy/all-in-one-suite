import { ArrowLeft, Star, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';

export default function FreelancerReviews() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const { data: freelancer } = useQuery({
    queryKey: ['freelancer-reviews-data', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('freelancers').select('avg_rating, total_lessons_completed').eq('id', user!.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const rating = Number(freelancer?.avg_rating || 0);

  return (
    <div className="px-4 py-5 pb-28 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground"><ArrowLeft size={20} /></button>
        <h1 className="font-display font-bold text-lg text-foreground">{t('Reviews', 'Отзывы')}</h1>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5 text-center">
        <p className="text-4xl font-black text-foreground">{rating > 0 ? rating.toFixed(1) : '—'}</p>
        <div className="flex justify-center gap-1 mt-1">
          {[1,2,3,4,5].map(s => (
            <Star key={s} size={18} className={cn(s <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20")} />
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-2">{freelancer?.total_lessons_completed || 0} {t('lessons completed', 'уроков проведено')}</p>
      </div>

      <EmptyState
        icon={Star}
        title={t('No reviews yet', 'Пока нет отзывов')}
        description={t('Complete lessons to start receiving reviews from clients', 'Проведите уроки чтобы получать отзывы от клиентов')}
      />
    </div>
  );
}
