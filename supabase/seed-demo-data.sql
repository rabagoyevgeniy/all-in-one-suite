-- ============================================
-- ProFit Swimming Academy — Demo Seed Data
-- Run this in Supabase SQL Editor to populate
-- test data for demo/presentation
-- ============================================

-- 1. POOLS (Dubai locations)
INSERT INTO pools (id, name, address, city, lat, lng, pool_type, is_active) VALUES
  ('pool-001', 'Marina Residence Pool', 'Dubai Marina, Tower 1', 'Dubai', 25.0805, 55.1403, 'outdoor', true),
  ('pool-002', 'JBR Beach Club Pool', 'JBR Walk, Dubai', 'Dubai', 25.0780, 55.1340, 'outdoor', true),
  ('pool-003', 'Palm Jumeirah Pool', 'Palm Jumeirah, Crescent Rd', 'Dubai', 25.1124, 55.1390, 'outdoor', true),
  ('pool-004', 'Downtown Pool & Spa', 'Downtown Dubai, Burj Residences', 'Dubai', 25.1972, 55.2744, 'indoor', true),
  ('pool-005', 'Sports City Olympic Pool', 'Dubai Sports City', 'Dubai', 25.0403, 55.2211, 'indoor', true)
ON CONFLICT (id) DO NOTHING;

-- 2. PRICING PLANS
INSERT INTO pricing_plans (id, name, description, lessons_count, price_aed, price_azn, plan_type, city, is_active, badge, per_lesson_aed, sort_order) VALUES
  ('plan-trial', 'First Trial Lesson', 'Try ProFit at 50% off — coach comes to your pool', 1, 200, 50, 'private', 'Dubai', true, '🎁 -50%', 200, 1),
  ('plan-single', 'Single Lesson', 'Coach comes to your private pool', 1, 400, 100, 'private', 'Dubai', true, NULL, 400, 2),
  ('plan-5', '5 Lessons Pack', 'Save 10% — commit to progress', 5, 1800, 450, 'private', 'Dubai', true, NULL, 360, 3),
  ('plan-10', '10 Lessons Pack', 'Save 15% — serious swimmers', 10, 3400, 850, 'private', 'Dubai', true, '⭐ Popular', 340, 4),
  ('plan-20', '20 Lessons Pack', 'Save 22% — maximum value', 20, 6240, 1560, 'private', 'Dubai', true, NULL, 312, 5)
ON CONFLICT (id) DO NOTHING;

-- 3. TASK DEFINITIONS (daily/weekly student tasks)
INSERT INTO task_definitions (id, title, description, target_role, coin_reward, xp_reward, reset_period, is_active, task_type, verification_type) VALUES
  ('task-daily-1', 'Practice 15 min', 'Do 15 minutes of swimming practice', 'student', 10, 5, 'daily', true, 'practice', 'self_report'),
  ('task-daily-2', 'Watch training video', 'Watch an educational swimming video', 'student', 5, 3, 'daily', true, 'education', 'auto'),
  ('task-daily-3', 'Log your meal', 'Track what you ate today for nutrition', 'student', 5, 2, 'daily', true, 'health', 'self_report'),
  ('task-weekly-1', 'Complete 3 lessons', 'Attend 3 swimming lessons this week', 'student', 50, 25, 'weekly', true, 'lessons', 'auto'),
  ('task-weekly-2', 'Win a duel', 'Challenge and win against another swimmer', 'student', 30, 15, 'weekly', true, 'competition', 'auto')
ON CONFLICT (id) DO NOTHING;

-- 4. ACHIEVEMENTS
INSERT INTO achievements (id, key, name, description, coin_reward, category, target_role, is_active) VALUES
  ('ach-first-lesson', 'first_lesson', 'First Splash', 'Complete your first swimming lesson', 50, 'milestone', 'student', true),
  ('ach-10-lessons', '10_lessons', 'Getting Serious', 'Complete 10 swimming lessons', 200, 'milestone', 'student', true),
  ('ach-first-duel', 'first_duel', 'Challenger', 'Win your first duel', 100, 'competition', 'student', true),
  ('ach-5-streak', '5_streak', 'On Fire', '5 lessons in a row without missing', 150, 'consistency', 'student', true),
  ('ach-coach-10', 'coach_10_lessons', 'Trusted Coach', 'Complete 10 lessons as a coach', 100, 'milestone', 'coach', true),
  ('ach-5star', 'first_5star', 'Five Star', 'Get your first 5-star rating', 50, 'quality', 'coach', true)
ON CONFLICT (id) DO NOTHING;

-- 5. SHOP ITEMS
INSERT INTO shop_items (id, name, description, coin_price, category, store_type, image_url, is_active, stock_count, sort_order) VALUES
  ('shop-1', 'ProFit Cap', 'Official ProFit swimming cap', 500, 'gear', 'student', NULL, true, 100, 1),
  ('shop-2', 'Lesson Discount 10%', '10% off your next lesson pack', 300, 'reward', 'parent', NULL, true, 50, 2),
  ('shop-3', 'XP Boost x2', 'Double XP for 24 hours', 200, 'premium', 'student', NULL, true, NULL, 3),
  ('shop-4', 'Priority Booking', 'Book before anyone else for 1 week', 400, 'premium', 'parent', NULL, true, 20, 4),
  ('shop-5', 'Coach Badge: Gold', 'Gold profile badge for coaches', 1000, 'premium', 'coach', NULL, true, 10, 5)
ON CONFLICT (id) DO NOTHING;

-- 6. EDUCATION VIDEOS
INSERT INTO education_videos (id, title, description, video_url, thumbnail_url, category, difficulty_level, duration_seconds, is_active) VALUES
  ('vid-1', 'Freestyle Basics', 'Learn proper freestyle technique from scratch', 'https://example.com/video1', NULL, 'technique', 'beginner', 300, true),
  ('vid-2', 'Breathing Control', 'Master breathing technique for all strokes', 'https://example.com/video2', NULL, 'technique', 'beginner', 240, true),
  ('vid-3', 'Backstroke Form', 'Perfect your backstroke with these drills', 'https://example.com/video3', NULL, 'technique', 'intermediate', 360, true),
  ('vid-4', 'Race Starts & Turns', 'Competitive starts and flip turns', 'https://example.com/video4', NULL, 'technique', 'advanced', 420, true),
  ('vid-5', 'Water Safety for Kids', 'Essential water safety rules every child should know', 'https://example.com/video5', NULL, 'safety', 'beginner', 180, true)
ON CONFLICT (id) DO NOTHING;

-- NOTE: Coach profiles, time_slots, and bookings require auth users to exist first.
-- Use the Dev Testing accounts on the login page to create coach/parent/student users,
-- then manually add time_slots via Supabase Table Editor or admin panel.
