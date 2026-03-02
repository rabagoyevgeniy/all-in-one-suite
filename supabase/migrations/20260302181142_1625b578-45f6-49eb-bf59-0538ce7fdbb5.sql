
-- Create admin_dashboard_stats view
CREATE OR REPLACE VIEW public.admin_dashboard_stats AS
SELECT
  COALESCE((SELECT SUM(amount) FROM financial_transactions WHERE direction = 'income' AND created_at::date = CURRENT_DATE AND currency = 'AED'), 0) AS revenue_today_aed,
  COALESCE((SELECT SUM(amount) FROM financial_transactions WHERE direction = 'income' AND created_at::date = CURRENT_DATE AND currency = 'AZN'), 0) AS revenue_today_azn,
  COALESCE((SELECT COUNT(*) FROM bookings WHERE created_at::date = CURRENT_DATE), 0) AS bookings_today,
  COALESCE((SELECT COUNT(*) FROM bookings WHERE status = 'completed' AND updated_at::date = CURRENT_DATE), 0) AS completed_today,
  COALESCE((SELECT COUNT(*) FROM subscriptions WHERE status = 'active'), 0) AS active_subscriptions,
  COALESCE((SELECT COUNT(*) FROM complaints WHERE status = 'pending'), 0) AS pending_complaints,
  COALESCE((SELECT COUNT(*) FROM coaches c JOIN profiles p ON c.id = p.id WHERE p.is_active = true), 0) AS active_coaches,
  COALESCE((SELECT COUNT(*) FROM students), 0) AS total_students,
  COALESCE((SELECT COUNT(*) FROM parents), 0) AS total_parents;

-- Grant access to the view
GRANT SELECT ON public.admin_dashboard_stats TO authenticated;
