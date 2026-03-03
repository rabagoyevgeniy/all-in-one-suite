
-- Trigger: notify parent when booking is completed
CREATE OR REPLACE FUNCTION public.notify_on_booking_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO public.notifications (user_id, title, body, type, reference_id)
    VALUES (
      NEW.parent_id,
      '✅ Урок завершён!',
      'Отчёт тренера готов. Нажмите чтобы просмотреть.',
      'lesson_completed',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER booking_status_notification
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_booking_complete();

-- Trigger: notify parent when subscription expires + coin penalty
CREATE OR REPLACE FUNCTION public.notify_payment_overdue()
RETURNS TRIGGER AS $$
DECLARE
  current_bal integer;
BEGIN
  IF NEW.status = 'expired' AND (OLD.status IS NULL OR OLD.status = 'active') THEN
    -- Notify parent
    INSERT INTO public.notifications (user_id, title, body, type, reference_id)
    VALUES (
      NEW.parent_id,
      '⚠️ Абонемент истёк',
      'Продлите абонемент чтобы продолжить занятия.',
      'subscription_expiring',
      NEW.id
    );

    -- Get current balance
    SELECT coin_balance INTO current_bal FROM public.parents WHERE id = NEW.parent_id;
    current_bal := COALESCE(current_bal, 0);

    -- Deduct 50 coins penalty
    UPDATE public.parents 
    SET coin_balance = GREATEST(0, current_bal - 50)
    WHERE id = NEW.parent_id;

    -- Record coin transaction
    INSERT INTO public.coin_transactions (user_id, user_role, amount, transaction_type, balance_after, description, reference_id)
    VALUES (
      NEW.parent_id, 'parent', -50, 'payment_penalty',
      GREATEST(0, current_bal - 50),
      'Штраф за просрочку оплаты (день 1)',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER subscription_expiry_notification
  AFTER UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.notify_payment_overdue();

-- Enable realtime for coin_transactions so header updates live
ALTER PUBLICATION supabase_realtime ADD TABLE public.coin_transactions;
