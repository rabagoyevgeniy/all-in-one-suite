
ALTER TABLE public.coin_transactions DROP CONSTRAINT coin_transactions_transaction_type_check;
ALTER TABLE public.coin_transactions ADD CONSTRAINT coin_transactions_transaction_type_check 
CHECK (transaction_type = ANY (ARRAY[
  'daily_task','weekly_task','special_task','lesson_attendance','lesson_complete',
  'streak_bonus','level_up','belt_earned','duel_win','seconding_earned','seconding_tip',
  'referral_signup','referral_payment','review_bonus','on_time_payment','coin_pack_purchase',
  'achievement_bonus','training_partner','tournament_win','live_stream_watch','social_share',
  'content_interaction','duel_stake','duel_rake_deduction',
  'shop_purchase_student','shop_purchase_parent','shop_purchase_coach','shop_purchase_pro',
  'subscription_freeze','booking_reschedule_fee','premium_video_unlock','pm_consultation',
  'payment_penalty','admin_adjustment','admin_grant','coin_expiry','shop_purchase'
]));
