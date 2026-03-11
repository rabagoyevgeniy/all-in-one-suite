import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Filter, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/hooks/useLanguage';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function CoachRatings() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [filter, setFilter] = useState<number | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['coach-all-reviews', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_reviews')
        .select('id, rating, comment, created_at, parent_id, booking_id')
        .eq('coach_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: coachData } = useQuery({
    queryKey: ['coach-avg-rating', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('coaches')
        .select('avg_rating, total_lessons_completed')
        .eq('id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Star breakdown
  const breakdown = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: (reviews || []).filter(r => r.rating === star).length,
    percent: reviews?.length ? Math.round(((reviews || []).filter(r => r.rating === star).length / reviews.length) * 100) : 0,
  }));

  const filtered = filter
    ? (reviews || []).filter(r => r.rating === filter)
    : reviews || [];

  const generateAiSummary = async () => {
    if (!reviews?.length) return;
    setLoadingAi(true);
    try {
      const comments = reviews.filter(r => r.comment).map(r => `${r.rating}★: ${r.comment}`).join('\n');
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: [
            {
              role: 'user',
              content: `Analyze these coach reviews and provide a brief summary in two sections:
"What parents love:" (3 bullet points max)
"Areas to improve:" (3 bullet points max)

Reviews:
${comments || 'No comments available, just ratings averaging ' + Number(coachData?.avg_rating || 0).toFixed(1)}`,
            },
          ],
        },
      });
      if (error) throw error;
      setAiSummary(data?.content || data?.choices?.[0]?.message?.content || 'Unable to generate summary');
    } catch {
      setAiSummary(t('Could not generate summary', 'Не удалось создать анализ'));
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
        <button onClick={() => navigate('/coach')} className="p-1">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="font-bold text-foreground">{t('My Ratings', 'Мои оценки')}</h1>
          <p className="text-xs text-muted-foreground">{reviews?.length || 0} {t('reviews', 'отзывов')}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="px-4 py-4 space-y-5 pb-28">
          {/* Overall rating */}
          <div className="bg-card rounded-2xl p-5 border border-border text-center">
            <div className="text-5xl font-bold text-foreground mb-1">
              {Number(coachData?.avg_rating || 0).toFixed(1)}
            </div>
            <div className="flex items-center justify-center gap-0.5 mb-2">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} size={18} className={cn(
                  s <= Math.round(Number(coachData?.avg_rating || 0))
                    ? 'text-amber-500 fill-amber-500'
                    : 'text-muted-foreground'
                )} />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {t('Based on', 'На основе')} {reviews?.length || 0} {t('reviews', 'отзывов')}
            </p>
          </div>

          {/* Star breakdown */}
          <div className="bg-card rounded-2xl p-4 border border-border space-y-2">
            {breakdown.map(({ star, count, percent }) => (
              <button
                key={star}
                onClick={() => setFilter(filter === star ? null : star)}
                className={cn(
                  "w-full flex items-center gap-3 p-1.5 rounded-lg transition-colors",
                  filter === star ? "bg-primary/10" : "hover:bg-muted/50"
                )}
              >
                <span className="text-xs font-medium w-4 text-foreground">{star}</span>
                <Star size={12} className="text-amber-500 fill-amber-500" />
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
              </button>
            ))}
          </div>

          {/* AI Summary */}
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                <Sparkles size={14} className="text-primary" />
                {t('AI Analysis', 'AI Анализ')}
              </h3>
              {!aiSummary && (
                <button
                  onClick={generateAiSummary}
                  disabled={loadingAi}
                  className="text-xs text-primary font-medium flex items-center gap-1"
                >
                  {loadingAi ? <Loader2 size={12} className="animate-spin" /> : t('Generate', 'Создать')}
                </button>
              )}
            </div>
            {aiSummary ? (
              <div className="text-sm text-foreground whitespace-pre-line">{aiSummary}</div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t('Tap Generate to get AI insights about your reviews', 'Нажмите Создать для AI-анализа отзывов')}
              </p>
            )}
          </div>

          {/* Filter indicator */}
          {filter && (
            <div className="flex items-center gap-2">
              <Filter size={12} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {t('Showing', 'Показаны')} {filter}★ {t('only', '')}
              </span>
              <button onClick={() => setFilter(null)} className="text-xs text-primary">
                {t('Clear', 'Сбросить')}
              </button>
            </div>
          )}

          {/* Reviews list */}
          <div className="space-y-2">
            {filtered.map(review => (
              <div key={review.id} className="bg-card rounded-xl p-3 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} size={12} className={cn(
                        s <= review.rating ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'
                      )} />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {review.created_at ? format(new Date(review.created_at), 'MMM d, yyyy') : ''}
                  </span>
                </div>
                {review.comment ? (
                  <p className="text-sm text-foreground">{review.comment}</p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">{t('No comment', 'Без комментария')}</p>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Star className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t('No reviews yet', 'Пока нет отзывов')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
