import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';

const RATING_LABELS_EN = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'];
const RATING_LABELS_RU = ['', 'Плохо', 'Удовл.', 'Хорошо', 'Отлично', 'Превосходно!'];

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    coachId: string;
    coachName: string;
    date: string;
  };
  onSuccess: () => void;
}

export function RatingModal({ isOpen, onClose, booking, onSuccess }: RatingModalProps) {
  const { user } = useAuthStore();
  const { t, language } = useLanguage();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const ratingLabels = language === 'ru' ? RATING_LABELS_RU : RATING_LABELS_EN;

  const handleSubmit = async () => {
    if (!rating || !user?.id) return;
    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from('lesson_reviews')
        .insert({
          booking_id: booking.id,
          parent_id: user.id,
          coach_id: booking.coachId,
          rating,
          comment: comment.trim() || null,
        });

      if (error) {
        toast({ title: t('Failed to submit review', 'Не удалось отправить отзыв'), variant: 'destructive' });
        return;
      }

      toast({ title: t('Thank you for your feedback! ⭐', 'Спасибо за ваш отзыв! ⭐') });
      onSuccess();
      onClose();
    } catch {
      toast({ title: t('Failed to submit review', 'Не удалось отправить отзыв'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const activeRating = hover || rating;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {t('Rate Your Lesson', 'Оцените занятие')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('How was your swimming lesson?', 'Как прошло занятие?')}
          </p>
          <p className="text-xs text-muted-foreground">
            {booking.coachName} · {booking.date}
          </p>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Star rating */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="p-1 transition-transform hover:scale-110"
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    size={32}
                    className={
                      star <= activeRating
                        ? 'fill-coin text-coin'
                        : 'text-muted-foreground'
                    }
                  />
                </button>
              ))}
            </div>
            {activeRating > 0 && (
              <span className="text-sm font-medium text-foreground">
                {ratingLabels[activeRating]}
              </span>
            )}
          </div>

          {/* Comment */}
          <Textarea
            placeholder={t('Write a short comment (optional)', 'Напишите комментарий (необязательно)')}
            maxLength={300}
            className="resize-none"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <p className="text-[10px] text-muted-foreground text-right">
            {comment.length}/300
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" className="rounded-xl" onClick={onClose}>
            {t('Cancel', 'Отмена')}
          </Button>
          <Button
            className="rounded-xl gap-1"
            disabled={rating === 0 || submitting}
            onClick={handleSubmit}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('Submit Review', 'Отправить отзыв')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
