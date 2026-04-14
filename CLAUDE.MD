# ProFit Swimming Academy

## What Is This

Mobile-first web app for managing a swimming academy (Dubai + Baku). Built with Lovable.dev, now maintained manually. Deployed on Vercel at `all-in-one-suite-app.vercel.app`.

Two business models:
1. **Premium** — company coaches, guaranteed quality, packages (4/8/12 lessons)
2. **Freelance Marketplace** — parents post requests, freelancers pick them up, ProFit takes commission

Currencies: AED (Dubai), AZN (Baku).

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite 5
- **UI**: shadcn/ui + Radix UI + Tailwind CSS + framer-motion
- **State**: Zustand (authStore, adminStore)
- **Data**: Supabase (auth, DB, realtime, edge functions) + TanStack React Query
- **Routing**: react-router-dom v6 with lazy loading
- **Forms**: react-hook-form + zod
- **Monitoring**: Sentry (via VITE_SENTRY_DSN env), PostHog analytics
- **Deploy**: Vercel (auto-deploy on push to main)
- **CI**: GitHub Actions (.github/workflows/ci.yml) — lint, test, build

## Project Structure

```
src/
  pages/           — route pages grouped by role
    admin/         — AdminDashboard, Coaches, Clients, Bookings, Finance, Economy, Tasks, Pricing, Shop
    coach/         — Dashboard, Schedule, Students, Earnings, Profile, ActiveLesson, LiveTracking, LessonReport, Ratings, Coins, Rank, Shop, Achievements
    parent/        — Dashboard, Children, ChildDetail, Booking, Financial, Payments, Coins, Referrals, Shop
    student/       — Dashboard, TaskBoard, Store, DuelArena, Education, LiveDuels, Leaderboard, Skills, Profile, Achievements
    freelancer/    — Dashboard, Profile, Schedule, Requests, Earnings, Reviews, Clients
    pm/            — Dashboard, Clients, Reports, Earnings, Profile
    pro/           — Dashboard, Arena, Records, Profile, Shop
    chat/          — ChatList, ChatRoom, NewDirectChat
    payment/       — PaymentScreen, PaymentSuccess
    auth/          — LoginPage, ResetPasswordPage
  components/      — shared components
    ui/            — shadcn components
    chat/          — chat UI (media upload, voice recorder, community sheets)
    coach/         — coach-specific components
  stores/          — authStore.ts (user/session/role), adminStore.ts (city/currency)
  hooks/           — useCoins, useNotifications, useLanguage, usePricingPlans, useAdminDashboardStats, useAIConversation, useAITasks
  integrations/    — Supabase client + auto-generated types (DO NOT EDIT types.ts)
  lib/             — constants.ts (swim caps, XP, roles), utils.ts, auth.ts
  assets/          — static images
```

## Roles & Access (8 roles)

| Role | Route Prefix | Nav Items | Description |
|------|-------------|-----------|-------------|
| admin | /admin | Dashboard, Coaches, Clients, Bookings, Tasks | Full platform control |
| head_manager | /admin | Dashboard, Coaches, Schedule, Reports, Profile | Same as admin, different nav |
| coach | /coach | Home, Schedule, Students, Chat, Profile | Company coach |
| freelancer | /freelancer | Home, Schedule, Clients, Chat, Profile | Independent coach |
| personal_manager | /pm | Clients, Reports, Earnings, Profile | Client acquisition manager |
| parent | /parent | Home, Book, Shop, Coins, Chat | Books lessons for children |
| student | /student | Home, Duels, Tasks, Learn, Profile | Child account (gamified) |
| pro_athlete | /pro | Dashboard, Arena, Shop, Records, Profile | Professional swimmer |

### Role Relationships

```
parent ──owns──> student (parent_id on students table)
parent ──books──> booking ──assigned_to──> coach
coach ──conducts──> lesson ──for──> student
coach ──submits──> lesson_report ──rates──> student progress
parent ──rates──> coach (lesson_ratings after completed booking)
personal_manager ──manages──> parent (managed_clients table)
freelancer ──picks_up──> freelancer_requests ──from──> parent
admin ──oversees──> everything (coach earnings, bookings, subscriptions, complaints)
student ──competes_in──> duels ──with──> other students
student ──completes──> tasks ──earns──> coins
```

## Internal Economy (Coins)

Coins are the gamification currency. Tracked per-role via Supabase RPCs.

### Coin Flow
```
EARNING:
  student completes task       → +coins (task_definitions.coin_reward)
  student wins duel            → +coins (from duel escrow)
  student earns swim cap       → +coins (SWIM_BELTS[].coinsOnEarn: 300-7500)
  parent referral              → +coins
  achievement unlocked         → +coins (achievements.coin_reward)
  coach completes lesson       → +coins (coach reward)

SPENDING:
  student buys from shop       → -coins (shop_items.coin_price)
  student enters duel          → -coins (escrow)
  parent buys from shop        → -coins

TRACKING:
  coin_transactions table      — full audit log (user_id, amount, type, description)
  students.coin_balance        — current student balance
  coaches.coin_balance         — current coach balance
  parents table                — parent balance (if applicable)

RPCs:
  add_coins(user_id, role, amount, type, description)    → returns new balance
  spend_coins(user_id, role, amount, type, description)  → returns new balance or error
```

### Swim Caps (Student Progression)
```
White    (0-1500 XP)     — Aqua Starter    — 300 coins on earn
Sky Blue (1500-4000 XP)  — Water Explorer  — 500 coins
Green    (4000-8000 XP)  — Wave Rider      — 800 coins
Yellow   (8000-13000 XP) — Current Master  — 1200 coins
Orange   (13000-20000)   — Tide Champion   — 2000 coins
Red      (20000-30000)   — ProFit Athlete  — 3500 coins
Black    (30000-50000)   — ProFit Legend   — 7500 coins

XP = wins*15 + totalDuels*5 + round(totalCoinsEarned*0.05)
```

### Coach Ranks
```
Trainee → Junior → Senior → Elite → ProFit Elite
```

## Core Business Flows

### 1. Parent Booking Flow
```
Parent registers → adds child (student) → chooses package/coach →
selects time slot → enters location (address, parking, building) →
pays → subscription activates → lessons begin
```
Key tables: `parents`, `students`, `subscriptions`, `bookings`, `pools`, `time_slots`

### 2. Lesson Flow
```
Booking confirmed → coach sees in schedule → coach starts lesson →
GPS tracking activates → lesson in progress → coach submits report →
lesson completed → parent can rate coach → used_lessons incremented →
coins awarded to student/coach
```
Key tables: `bookings`, `lessons`, `lesson_ratings`, `coach_earnings`

### 3. Freelance Marketplace Flow
```
Parent posts freelancer_request (with budget, style, city) →
auto-match if budget fits freelancer rate → or request sits in public pool →
freelancer accepts → booking created → same lesson flow
```
Key tables: `freelancer_requests`, `bookings`

### 4. Duel System (Student Gamification)
```
Student creates duel → sets coin bet (escrow) → opponent joins →
live duel → winner gets coins from escrow → XP awarded → leaderboard updated
```
Key tables: `duels`, `duel_escrow`, `duel_invitations`, `duel_spectators`, `duel_spectator_actions`

### 5. Task System
```
Admin defines tasks (task_definitions) → students see daily/weekly tasks →
student completes task → submits proof → coins + XP awarded →
progress tracked in task_completions
```
Key tables: `task_definitions`, `task_completions`

## Database (Supabase)

### Key Tables by Domain

**Users & Auth:**
- `profiles` — all users (full_name, avatar_url, city, role, onboarding_completed)
- `user_roles` — role assignments (app_role enum)
- `parents` — parent-specific data
- `students` — swim_belt, coin_balance, wins, losses, total_coins_earned, parent_id
- `coaches` — rank, avg_rating, total_lessons_completed, coin_balance, specializations
- `pro_athletes` — competitive stats
- `invite_codes` — role-restricted registration codes

**Bookings & Lessons:**
- `bookings` — coach_id, student_id, parent_id, status, lesson_fee, currency, booking_type
- `lessons` — detailed lesson data (video_url, warmup_note, technique notes)
- `lesson_ratings` — parent rates coach after lesson
- `time_slots` — available schedule slots
- `pools` — swimming pool locations
- `booking_change_log` — audit trail for booking modifications

**Subscriptions & Payments:**
- `subscriptions` — parent_id, plan, status, total_lessons, used_lessons, warnings_sent
- `pricing_plans` — package definitions with prices per city
- `discount_codes` — promo codes

**Economy & Gamification:**
- `coin_transactions` — full coin audit log
- `shop_items` — purchasable items (coin_price, store_type)
- `achievements` — achievement definitions (key, coin_reward, target_role)
- `user_achievements` — earned achievements per user
- `economy_settings` — global economy config

**Duels:**
- `duels` — challenger_id, opponent_id, status, coin_bet, winner_id
- `duel_escrow` — held coins during active duel
- `duel_invitations` — pending duel invites
- `duel_spectators` / `duel_spectator_actions` — live spectating

**Tasks:**
- `task_definitions` — what tasks exist (target_role, coin_reward, xp_reward, reset_period)
- `task_completions` — who completed what and when
- `student_skills` — skill tracking per student

**Chat:**
- `chat_rooms` — room metadata (type: direct/group/community, status)
- `chat_messages` — messages (content, sender_id, reply_to_id, media)
- `chat_members` — room membership and last_read_at
- `chat_message_reads` — read receipts

**AI:**
- `ai_conversations` — conversation threads per user
- `ai_messages` — individual messages with suggestions
- `ai_tasks` — AI-generated tasks with progress tracking
- `ai_permissions` — per-role AI access config

**Manager:**
- `managed_clients` — PM-to-parent relationships
- `manager_payouts` — PM earnings

**Notifications:**
- `notifications` — in-app notifications
- `push_tokens` — device push tokens
- `notification_preferences` — user notification settings

**Education:**
- `education_videos` — learning content
- `education_video_views` — watch tracking

**Other:**
- `complaints` — user complaints with resolution tracking
- `weekly_reports` — student progress reports
- `training_requests` — peer training matchmaking
- `pro_records` — professional swimming records

### View
- `admin_dashboard_stats` — aggregated stats (active coaches, subscriptions, revenue, etc.)

### RPCs (Server Functions)
- `add_coins` / `spend_coins` — coin operations with balance check
- `assign_initial_role` — set role on signup
- `create_direct_chat` — create 1:1 chat room
- `get_user_role` / `has_role` — role queries
- `increment_used_lessons` — after lesson completion
- `is_chat_member` / `is_public_chat_room` — chat access checks

### Enum
- `app_role`: admin, head_manager, personal_manager, coach, parent, student, pro_athlete
- Note: `freelancer` role exists in frontend code but may not be in DB enum — handle carefully

## Critical Rules for Claude

### Before ANY change:
1. Check which roles/tables are affected
2. Verify the change doesn't break cross-role flows (see Role Relationships above)
3. Don't remove coin_balance fields or transaction logging — economy must stay consistent
4. Don't change booking status flow without checking all consumers (coach, parent, admin dashboards)
5. Don't modify Supabase types.ts — it's auto-generated

### Booking statuses (used everywhere):
```
confirmed → in_progress → completed
                        → cancelled_client
                        → cancelled_coach
                        → no_show
```
These strings appear in AdminDashboard, CoachDashboard, ParentDashboard, BottomNav badges — change one, update ALL.

### Key files that affect multiple roles:
- `src/components/AppLayout.tsx` — layout for ALL roles
- `src/components/BottomNav.tsx` — navigation for ALL roles
- `src/components/AuthProvider.tsx` — auth for ALL roles
- `src/lib/constants.ts` — swim caps, ranks, roles, routes for ALL
- `src/hooks/useCoins.ts` — economy for student, coach, parent

### Don't break:
- Realtime subscriptions (coin balance updates in AppLayout)
- Chat unread badges (BottomNav queries chat_members)
- Student task nudge dots (BottomNav queries task_completions)
- Parent pending rating badge (BottomNav queries completed bookings without review)

## Environment

- Dev: `pnpm dev` or `node node_modules/vite/bin/vite.js --port 5234`
- Build: `pnpm build`
- Tests: `pnpm test` (vitest, 14 test files in src/test/)
- Required env: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
- Optional env: VITE_SENTRY_DSN, VITE_POSTHOG_API_KEY

## Commit Format

Use conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`, `test:`
