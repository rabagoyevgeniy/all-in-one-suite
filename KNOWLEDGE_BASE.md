# ProFit AI Hub — Knowledge Base Structure

> Complete indexed knowledge base for the ProFit Swimming Academy AI system.
> Use this document as the central reference for all AI agents, n8n workflows, and Claude interactions.

---

## KB-000: System Overview

### What Is ProFit Swimming?
A premium gamified swimming academy where coaches travel to clients' private pools in **Dubai (AED)** and **Baku (AZN)**. The platform serves 7 user roles through a mobile-first SPA with gamification (coins, belts, duels), booking, payments, and AI assistance.

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite (SWC) + Tailwind CSS + shadcn/ui (47 primitives) |
| State | Zustand (auth, admin) + TanStack React Query (server state) |
| Backend | Supabase (Auth, PostgreSQL 80+ tables, Realtime, 6 Edge Functions, 47 migrations) |
| Payments | Stripe (checkout sessions, webhooks, subscriptions) |
| AI | Anthropic Claude via Supabase Edge Function (ai-chat) |
| Automation | n8n Cloud (profitlab.app.n8n.cloud) — 21 designed workflows |
| PWA | Service Worker + manifest for offline/installability |
| Deployment | Vercel (frontend) + Supabase Cloud (backend) |

### Codebase Size
| Category | Count |
|----------|-------|
| Pages | 68 lazy-loaded components |
| Components | 90+ (47 shadcn/ui + 43 feature) |
| Hooks | 8 custom hooks |
| Stores | 2 Zustand stores |
| Edge Functions | 6 Deno functions |
| DB Migrations | 47 SQL files |
| DB Tables | 80+ (with RLS enabled) |
| Documentation | 10 markdown files |

---

## KB-100: User Roles & Access

### Role Matrix

| # | Role | Route | Theme | Access Level | Description |
|---|------|-------|-------|-------------|-------------|
| 1 | `admin` | `/admin/*` | Operations (blue) | Full system access | Platform administrator |
| 2 | `head_manager` | `/admin/*` | Operations (blue) | Full system access | Same as admin |
| 3 | `coach` | `/coach/*` | Operations (blue) | Own students, schedule, earnings | Swimming instructor |
| 4 | `personal_manager` | `/pm/*` | Operations (blue) | Assigned clients only | Client relationship manager |
| 5 | `parent` | `/parent/*` | Operations (blue) | Own children, bookings | Child's parent/guardian |
| 6 | `student` | `/student/*` | Arena (purple, dark) | Own profile, duels, tasks | Swimming student (gamified) |
| 7 | `pro_athlete` | `/pro/*` | Arena (purple, dark) | Competition features | Professional/competitive swimmer |

### Auth Flow
```
Login → Supabase Auth → JWT with app_metadata.role
  → AuthProvider resolves role from:
    1. JWT app_metadata (trusted)
    2. user_roles table (fallback)
  → RoleGuard checks allowedRoles per route
  → RLS enforces data access server-side
```

### Pages Per Role

| Role | Pages | Key Features |
|------|-------|-------------|
| admin | 8 | Dashboard, coaches, clients, bookings, finance, economy, tasks, pricing |
| coach | 14 | Dashboard, schedule, students, earnings, lessons, live tracking, shop, achievements, ratings, rank history, active lesson, lesson report, coins |
| parent | 10 | Dashboard, booking, children, child detail, payments, financials, coins, referrals, chat, shop |
| student | 10 | Dashboard, profile, achievements, leaderboard, skills, store, duel arena, live duels, education, task board |
| pro_athlete | 5 | Dashboard, arena, records, profile, shop |
| personal_manager | 5 | Dashboard, clients, reports, earnings, profile |
| shared | 7 | Login, reset password, AI assistant, onboarding, settings, notifications, chat (list + room + new) |

---

## KB-200: Database Schema

### Table Groups

#### Identity & Auth (5 tables)
| Table | Rows | Purpose |
|-------|------|---------|
| `profiles` | 23 | User profiles (name, city, phone, avatar) |
| `coaches` | 2 | Coach-specific data (rank, rating, specializations, hourly rates) |
| `parents` | 15 | Parent-specific data (loyalty rank, subscription tier, referral code) |
| `students` | 7 | Student-specific data (belt, coins, wins/losses, streak, age group) |
| `pro_athletes` | 1 | Pro athlete data (tier, rating points, win record) |

#### Booking & Lessons (6 tables)
| Table | Rows | Purpose |
|-------|------|---------|
| `bookings` | 4 | Lesson bookings (student, coach, pool, status, fee) |
| `booking_logs` | 0 | Booking status change audit log |
| `lessons` | 0 | Detailed lesson records |
| `time_slots` | 0 | Coach availability slots |
| `skill_assessments` | 0 | Student skill evaluations per lesson |
| `lesson_reviews` | 0 | Parent/student reviews of lessons |

#### Subscriptions & Payments (5 tables)
| Table | Rows | Purpose |
|-------|------|---------|
| `subscriptions` | 2 | Active subscription packages |
| `financial_transactions` | 8 | All money movement (income/expense) |
| `coach_payroll` | 0 | Coach salary calculations |
| `manager_commissions` | 0 | PM commission records |
| `pricing_plans` | 30 | All pricing plan definitions |

#### Coin Economy (4 tables)
| Table | Rows | Purpose |
|-------|------|---------|
| `coin_transactions` | 7 | All coin minting/spending events |
| `economy_settings` | 22 | Economy configuration (rates, multipliers, penalties) |
| `discount_usages` | 0 | Coin discount redemptions |
| `promo_codes` | 0 | Promotional code definitions |

#### Gamification (17 tables)
| Table | Rows | Purpose |
|-------|------|---------|
| `achievements` | 12 | Achievement definitions (first_lesson, streak_5, black_belt, etc.) |
| `user_achievements` | 3 | Unlocked achievements per user |
| `task_definitions` | 31 | Daily/weekly task templates |
| `task_completions` | 0 | Completed tasks per user |
| `duels` | 1 | 1v1 swimming challenges |
| `duel_escrow` | 0 | Coin stakes for duels |
| `duel_comments` | 0 | Chat during duels |
| `duel_gifts` | 0 | Gifted items during duels |
| `duel_supporter_bets` | 0 | Spectator betting |
| `quests` | 26 | Multi-step quest chains |
| `student_quests` | 0 | Quest progress per student |
| `tournaments` | 4 | Tournament definitions |
| `tournament_participants` | 0 | Tournament entries |
| `tournament_matches` | 0 | Tournament bracket matches |
| `seasons` | 1 | Season definitions (for battle pass) |
| `battle_pass_levels` | 20 | Battle pass tier rewards |
| `user_battle_passes` | 0 | User battle pass progress |

#### Store & Marketplace (8 tables)
| Table | Rows | Purpose |
|-------|------|---------|
| `store_items` | 77 | Shop items (4 store types: student, parent, coach, pro) |
| `store_purchases` | 0 | Purchase history |
| `mystery_boxes` | 4 | Loot box definitions |
| `mystery_box_rewards` | 26 | Possible rewards per box |
| `mystery_box_opens` | 0 | Box opening history |
| `auctions` | 0 | Item auction listings |
| `auction_bids` | 0 | Auction bid history |
| `coach_products` | 0 | Coach-created products for sale |

#### Communication (8 tables)
| Table | Rows | Purpose |
|-------|------|---------|
| `chat_rooms` | 6 | Chat room definitions |
| `chat_members` | 0 | Room membership |
| `chat_messages` | 0 | Messages in chat rooms |
| `chat_reactions` | 0 | Message reactions |
| `chat_message_status` | 0 | Read/delivered status |
| `chat_calls` | 0 | Voice/video call records |
| `notifications` | 12 | Push/in-app notifications |
| `notification_templates` | 20 | Notification message templates |

#### AI System (5 tables)
| Table | Rows | Purpose |
|-------|------|---------|
| `ai_conversations` | 4 | AI chat conversation threads |
| `ai_messages` | 5 | Individual AI messages |
| `ai_permissions` | 13 | Per-role AI feature permissions |
| `ai_usage` | 0 | Token usage tracking |
| `ai_insights` | 0 | AI-generated business insights |
| `ai_tasks` | 0 | AI-generated action items |

#### Operations (6 tables)
| Table | Rows | Purpose |
|-------|------|---------|
| `pools` | 8 | Swimming pool locations (5 Dubai, 3 Baku) |
| `manager_assignments` | 1 | PM → client assignments |
| `training_plans` | 0 | Personalized training programs |
| `training_requests` | 0 | Training session requests |
| `complaints` | 0 | Customer complaints |
| `community_events` | 0 | Community event calendar |

#### Other (8 tables)
| Table | Rows | Purpose |
|-------|------|---------|
| `pricing_rules` | 0 | Dynamic pricing rules |
| `streak_rewards` | 7 | Streak milestone rewards |
| `streak_reward_claims` | 0 | Claimed streak rewards |
| `invite_codes` | 1 | Referral invite codes |
| `swimmer_characters` | 2 | Avatar character customization |
| `character_history` | 0 | Character change log |
| `game_events` | 0 | In-game event log |
| `swim_records` | 0 | Personal best times |
| `anti_cheat_flags` | 0 | Anti-cheat system flags |
| `season_xp_log` | 0 | Season XP earning log |

---

## KB-300: Gamification System

### Belt Progression (7 levels)

| Belt | Name | Color | Min XP | Max XP | Coins Earned | Class |
|------|------|-------|--------|--------|-------------|-------|
| White | Aqua Starter | #FFFFFF | 0 | 1,500 | 300 | Beginner |
| Sky Blue | Water Explorer | #7DD3FC | 1,500 | 4,000 | 500 | Novice |
| Green | Wave Rider | #86EFAC | 4,000 | 8,000 | 800 | Intermediate |
| Yellow | Current Master | #FDE047 | 8,000 | 13,000 | 1,200 | Advanced |
| Orange | Tide Champion | #FB923C | 13,000 | 20,000 | 2,000 | Expert |
| Red | ProFit Athlete | #F87171 | 20,000 | 30,000 | 3,500 | Pro Athlete |
| Black | ProFit Legend | #1F2937 | 30,000 | 50,000 | 7,500 | Legend |

### XP Formula
```
XP = (wins × 15) + (total_duels × 5) + (total_coins_earned × 0.05)
```

Estimated progression:
- Year 1: ~2,300 XP → White → Sky Blue (~8 months)
- Year 2: ~4,600 XP → Green
- Year 3-4: ~9,000+ XP → Yellow → Black (~4 years)

### Coach Ranks (5 levels)

| Rank | Color | Description |
|------|-------|-------------|
| Trainee | #64748B | New coach in training |
| Junior | #0EA5E9 | Active coach |
| Senior | #3B82F6 | Experienced coach |
| Elite | #F59E0B | Top-tier coach |
| ProFit Elite | #FFD700 | Highest rank |

### Economy Settings (key values)

| Setting | Value | Description |
|---------|-------|-------------|
| `coins_per_lesson` | 50 | Base coins per completed lesson |
| `streak_5_multiplier` | 1.5× | 5-lesson streak bonus |
| `streak_10_multiplier` | 2× | 10-lesson streak bonus |
| `referral_signup_coins` | 300 | Coins for referring new user |
| `referral_payment_coins` | 500 | Bonus when referral pays |
| `duel_rake_percent` | 15% | Academy cut from duel stakes |
| `coin_to_aed_discount_rate` | 0.04 | 1 coin = 0.04 AED discount |
| `coin_expiry_days` | 365 | Coins expire after 1 year |
| `max_discount_stack_percent` | 35% | Maximum total discount |

---

## KB-400: Pricing & Revenue

### Dubai Pricing (AED)

| Plan | Price | Per Lesson | Savings | Type |
|------|-------|-----------|---------|------|
| Single Lesson | 350 | 350 | — | One-time |
| Pack 5 | 1,575 | 315 | 10% | Pack |
| Pack 10 | 2,975 | 298 | 15% | Pack |
| Pack 20 | 5,460 | 273 | 22% | Pack |
| Starter Monthly | 1,260 | 252 | 28% | Subscription (5/mo) |
| Premium Monthly | 2,240 | 280 | 20% | Subscription (8/mo) |
| Elite Monthly | 3,360 | 280 | 20% | Subscription (12/mo) |
| Family Package | 2,940 | 245 | 30% | Pack (2 children, 12 lessons) |

### Baku Pricing (AZN)
Conversion: AED × 0.54, rounded to nearest 5 AZN.

### Revenue Streams
1. **Lesson fees** — per-session or pack payments
2. **Subscriptions** — monthly recurring (starter/premium/elite)
3. **Coin purchases** — in-app currency packs (300–3,500 coins)
4. **Duel rake** — 15% of coin stakes in duels
5. **Store purchases** — merchandise and premium items (coins or AED)

---

## KB-500: Component Architecture

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `AuthProvider` | `src/components/AuthProvider.tsx` | Wraps app, resolves user role from JWT |
| `RoleGuard` | `src/components/RoleGuard.tsx` | Route-level access control |
| `AppLayout` | `src/components/AppLayout.tsx` | Main layout shell (header + nav + content) |
| `BottomNav` | `src/components/BottomNav.tsx` | Mobile bottom navigation per role |
| `ProFitShop` | `src/components/ProFitShop.tsx` | Shared shop for all 4 role shop pages |
| `SwimBeltBadge` | `src/components/SwimBeltBadge.tsx` | Visual belt level indicator |
| `CoinBalance` | `src/components/CoinBalance.tsx` | Coin balance display |
| `AIAssistantFAB` | `src/components/AIAssistantFAB.tsx` | Floating AI chat button |
| `DevAccountSwitcher` | `src/components/DevAccountSwitcher.tsx` | Dev-only role switcher (localhost only) |

### shadcn/ui Design System (47 primitives)
All in `src/components/ui/`. Includes: accordion, alert, avatar, badge, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toast, toaster, toggle, toggle-group, tooltip.

---

## KB-600: Hooks & State

### Custom Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useCoins` | `src/hooks/useCoins.ts` | Coin add/spend operations with auth validation |
| `useAIConversation` | `src/hooks/useAIConversation.ts` | AI chat state and message handling |
| `useAITasks` | `src/hooks/useAITasks.ts` | AI-generated task management |
| `useAdminDashboardStats` | `src/hooks/useAdminDashboardStats.ts` | Admin metrics and KPIs |
| `useLanguage` | `src/hooks/useLanguage.ts` | i18n language switching |
| `useNotifications` | `src/hooks/useNotifications.ts` | Real-time notification handling |
| `usePricingPlans` | `src/hooks/usePricingPlans.ts` | Pricing data fetching |
| `useToast` | `src/hooks/use-toast.ts` | Toast notification triggers |

### Zustand Stores

| Store | File | State |
|-------|------|-------|
| `authStore` | `src/stores/authStore.ts` | user, role, session, isLoading, login(), logout() |
| `adminStore` | `src/stores/adminStore.ts` | Admin panel filters, selections, UI state |

---

## KB-700: Edge Functions

| Function | Path | Purpose | Auth Required |
|----------|------|---------|--------------|
| `ai-chat` | `/functions/v1/ai-chat` | Claude AI streaming chat | Yes (JWT) |
| `create-checkout` | `/functions/v1/create-checkout` | Stripe checkout sessions | Yes (JWT) |
| `stripe-webhook` | `/functions/v1/stripe-webhook` | Stripe payment events | No (Stripe signature) |
| `perplexity-research` | `/functions/v1/perplexity-research` | Perplexity AI research | Yes |
| `notify-lesson-reminders` | `/functions/v1/notify-lesson-reminders` | Lesson reminder notifications | Service role |
| `seed-data` | `/functions/v1/seed-data` | Database seeding | Service role |

All functions use dynamic CORS via `ALLOWED_ORIGINS` environment variable.

---

## KB-800: AI System

### AI Chat Configuration
- **Model**: Claude (via Supabase Edge Function `ai-chat`)
- **Streaming**: Server-Sent Events (SSE)
- **Per-role prompts**: `src/lib/aiSystemPrompts.ts` — each role gets a specialized system prompt
- **Permissions**: `ai_permissions` table controls which features each role can access
- **Conversation storage**: `ai_conversations` + `ai_messages` tables

### AI System Prompts
The `buildSystemPrompt()` function generates role-specific prompts:
- **Admin**: Full business intelligence, all data access
- **Coach**: Student progress, lesson planning, schedule optimization
- **Parent**: Child progress, booking help, payment questions
- **Student**: Belt progression tips, task guidance, duel strategy
- **Pro**: Competition preparation, record tracking
- **PM**: Client relationship management, reporting

---

## KB-900: n8n Automation System

### Instance
- **URL**: https://profitlab.app.n8n.cloud/
- **MCP Tools**: search_workflows, get_workflow_details, execute_workflow

### Workflow Catalog (21 workflows)

| # | Workflow | Category | Trigger |
|---|---------|----------|---------|
| 0 | `00_agent_main` | Orchestrator | Webhook POST /agent-task |
| 1 | `01_clients_lesson_reminder` | Clients | Daily 8 AM + Webhook |
| 2 | `01_clients_onboarding_sequence` | Clients | Supabase event + Webhook |
| 3 | `01_clients_retention_check` | Clients | Weekly Monday + Webhook |
| 4 | `01_clients_feedback_collector` | Clients | Webhook |
| 5 | `02_marketing_social_content` | Marketing | Mon/Wed/Fri + Webhook |
| 6 | `02_marketing_pool_partnership` | Marketing | Webhook |
| 7 | `02_marketing_campaign_generator` | Marketing | Webhook |
| 8 | `02_marketing_referral_program` | Marketing | Supabase event |
| 9 | `03_operations_pool_finder` | Operations | Webhook |
| 10 | `03_operations_coach_assignment` | Operations | Webhook |
| 11 | `03_operations_schedule_optimizer` | Operations | Daily 6 AM + Webhook |
| 12 | `03_operations_quality_monitor` | Operations | Daily 9 PM |
| 13 | `04_content_progress_report` | Content | Weekly Friday + Webhook |
| 14 | `04_content_training_plan` | Content | Webhook |
| 15 | `04_content_blog_generator` | Content | Weekly + Webhook |
| 16 | `04_content_coach_briefing` | Content | Daily 7 AM |
| 17 | `05_finance_revenue_report` | Finance | Daily + Webhook |
| 18 | `05_finance_payroll_calculator` | Finance | Bi-weekly + Webhook |
| 19 | `05_finance_coin_economy_monitor` | Finance | Weekly Monday |
| 20 | `05_finance_invoice_generator` | Finance | Webhook |

Full specifications in `N8N_AI_OPERATING_SYSTEM.md`.

---

## KB-1000: Security

### Security Measures Implemented
- [x] RLS enabled on all tables
- [x] `has_role()` security-definer for admin checks
- [x] Dynamic CORS (ALLOWED_ORIGINS) on all edge functions
- [x] Error messages sanitized (no internal details leaked)
- [x] DevAccountSwitcher restricted to localhost
- [x] Coin mutations via server-side RPCs only
- [x] Auth validation in useCoins hooks
- [x] Stripe key not logged in create-checkout

### Security Rules
1. Never commit secrets to source code
2. New tables must have RLS enabled
3. Only trust `app_metadata` for role (not `user_metadata`)
4. Coin mutations must go through server-side RPCs
5. `RoleGuard` must cover all new routes with correct `allowedRoles`

---

## KB-1100: Deployment

### Architecture
```
User → Vercel (React SPA) → Supabase (Auth + DB + Edge Functions)
                           → Stripe (Payments)
                           → n8n Cloud (Automation)
```

### Supabase Projects
| Name | ID | Region | Status |
|------|-----|--------|--------|
| Profit final app | `hawbkqjdnvaoffbhihnt` | ap-northeast-2 | **Active** |
| ProFit new APP | `fazulafoizhtnjtydffs` | ap-southeast-2 | Active |
| profit app | `jdolvcellbesuixwxzem` | ap-southeast-2 | Inactive |

### Key URLs
- **Frontend**: Deployed on Vercel
- **Supabase API**: `https://hawbkqjdnvaoffbhihnt.supabase.co`
- **n8n**: `https://profitlab.app.n8n.cloud/`

---

## KB-1200: File Index

### Quick Reference

| Need | File |
|------|------|
| Add a new page | `src/pages/{role}/NewPage.tsx` → register in `src/App.tsx` |
| Add a new component | `src/components/NewComponent.tsx` |
| Add a UI primitive | `npx shadcn-ui@latest add {component}` → `src/components/ui/` |
| Add a new hook | `src/hooks/useNewHook.ts` |
| Modify auth logic | `src/components/AuthProvider.tsx` + `src/stores/authStore.ts` |
| Change pricing | `src/lib/pricing.ts` |
| Change belt/XP config | `src/lib/constants.ts` |
| Change AI prompts | `src/lib/aiSystemPrompts.ts` + `src/lib/ai-config.ts` |
| Add edge function | `supabase/functions/new-fn/index.ts` |
| Add DB migration | `supabase/migrations/YYYYMMDDHHMMSS_description.sql` |
| Configure CORS | Each edge function's `ALLOWED_ORIGINS` parsing |
| Add n8n workflow | See `N8N_AI_OPERATING_SYSTEM.md` for JSON templates |
| Check project docs | `CLAUDE.md`, `PROJECT_MAP.md`, `SYSTEM_ARCHITECTURE.md` |
