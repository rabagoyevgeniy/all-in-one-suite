import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/hooks/use-toast';

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'];

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
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!rating || !user?.id) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('lesson_reviews')
        .insert({
          booking_id: booking.id,
          parent_id: user.id,
          coach_id: booking.coachId,
          rating,
          comment: comment.trim() || null,
        });

      if (error) {
        toast({ title: 'Failed to submit review', variant: 'destructive' });
        return;
      }

      toast({ title: 'Review submitted! ⭐ Thank you!' });
      onSuccess();
      onClose();
    } catch {
      toast({ title: 'Failed to submit review', variant: 'destructive' });
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
            Rate Your Lesson
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
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
                {RATING_LABELS[activeRating]}
              </span>
            )}
          </div>

          {/* Comment */}
          <Textarea
            placeholder="Share your experience (optional)"
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
            Cancel
          </Button>
          <Button
            className="rounded-xl gap-1"
            disabled={rating === 0 || submitting}
            onClick={handleSubmit}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
