# System Architecture — ProFit Academy

> Technical architecture reference for the ProFit Swimming Academy platform.

---

## 1. System Overview

ProFit Academy is a gamified swimming academy management platform. Coaches travel to clients' private pools in Dubai (AED) and Baku (AZN). The platform manages bookings, coach operations, student gamification, payments, and AI-assisted workflows for 7 user roles.

```
┌──────────────────────────────────────────────────────────┐
│                    CLIENT (Browser/PWA)                   │
│                                                          │
│  React 18 + TypeScript + Vite                            │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐            │
│  │ Admin  │ │ Coach  │ │ Parent │ │Student │ + Pro, PM   │
│  │ Portal │ │ Portal │ │ Portal │ │ Portal │             │
│  └────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘            │
│       └──────────┴──────────┴──────────┘                 │
│                      │                                   │
│       ┌──────────────┼──────────────┐                    │
│       │ Zustand      │ React Query  │                    │
│       │ (auth state) │(server cache)│                    │
│       └──────────────┴──────────────┘                    │
└──────────────────────┬───────────────────────────────────┘
                       │ HTTPS / WSS
┌──────────────────────┴───────────────────────────────────┐
│                   SUPABASE PLATFORM                       │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  Auth (JWT)  │  │  PostgreSQL   │  │   Realtime     │  │
│  │  + RLS       │  │  38+ tables   │  │   (WebSocket)  │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘  │
│         │                │                   │           │
│  ┌──────┴────────────────┴───────────────────┴────────┐  │
│  │              Row-Level Security (RLS)               │  │
│  │         has_role() security-definer function         │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─────────────────── Edge Functions ──────────────────┐  │
│  │  ai-chat            │ Anthropic Claude streaming     │  │
│  │  create-checkout    │ Stripe session creation        │  │
│  │  stripe-webhook     │ Payment event handling         │  │
│  │  perplexity-research│ Research API proxy             │  │
│  │  notify-reminders   │ Scheduled notifications        │  │
│  │  seed-data          │ Test data population           │  │
│  └─────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   Anthropic API    Stripe API    Perplexity API
```

---

## 2. Frontend Architecture

### 2.1 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | React 18 + TypeScript | UI rendering, type safety |
| Build | Vite + SWC | Fast dev server, optimized builds |
| Styling | Tailwind CSS + shadcn/ui | Utility CSS + Radix UI primitives |
| Client State | Zustand | Auth, admin preferences |
| Server State | TanStack React Query | Caching, refetching, mutations |
| Routing | React Router v6 | SPA navigation, lazy loading |
| Animation | Framer Motion | Page transitions, micro-interactions |
| Forms | React Hook Form + Zod | Validation, type-safe forms |
| Charts | Recharts | Admin dashboards, analytics |
| PWA | Service Worker + manifest | Offline support, installability |

### 2.2 Provider Stack (App.tsx)

```
QueryClientProvider          <- React Query cache
  └── TooltipProvider        <- shadcn tooltips
      └── Toaster + Sonner   <- notifications
          └── BrowserRouter   <- routing
              └── ErrorBoundary <- crash recovery
                  └── AuthProvider <- auth state + role resolution
                      └── Suspense  <- lazy loading fallback
                          └── Routes <- role-gated pages
                      └── OnboardingGuard
                      └── AIAssistantFAB
                      └── DevAccountSwitcher
```

### 2.3 Route Organization

Routes are organized by role with shared guards:

```typescript
// Pattern: RoleGuard wraps AppLayout wraps page routes
<Route element={<RoleGuard allowedRoles={['coach']}><AppLayout /></RoleGuard>}>
  <Route path="/coach" element={P("Coach Dashboard", <CoachDashboard />)} />
</Route>
```

Every page wrapped with `P()` helper for `PageErrorBoundary` isolation.

### 2.4 Code Splitting

All 68 pages are lazy-loaded via `React.lazy()`. Vite config splits vendor chunks:

| Chunk | Contents |
|-------|----------|
| `vendor-react` | react, react-dom, react-router |
| `vendor-query` | @tanstack/react-query |
| `vendor-supabase` | @supabase/supabase-js |
| `vendor-ui` | radix-ui components |
| Per-page chunks | Each lazy page = separate chunk |

### 2.5 Theming

Two visual themes controlled by `AppLayout` prop:

| Theme | Used By | Style |
|-------|---------|-------|
| Operations | Admin, Coach, PM, Parent | Blue primary, light background |
| Arena | Student, Pro Athlete | Purple glow, dark gradients, glass cards |

Design tokens in `src/index.css` use HSL variables:
- `--primary`, `--background`, `--foreground` (standard)
- `--coin` (gold), `--arena-glow` (purple) (custom)
- Swim belt color palette (7 colors)

---

## 3. State Management

### 3.1 Zustand Stores

**authStore** — Global auth state
```
user: User | null          <- Supabase auth user
session: Session | null    <- JWT session
role: UserRole | null      <- Resolved role
profile: { full_name, avatar_url, city, onboarding_completed }
isLoading: boolean         <- Auth resolution in progress
```

**adminStore** — Admin preferences
```
city: 'dubai' | 'baku'    <- Selected city filter
currency: 'AED' | 'AZN'   <- Display currency
```

### 3.2 React Query Usage

All Supabase data fetching uses React Query for caching and refetching:
- Queries: `useQuery` for reads (bookings, profiles, stats)
- Mutations: `useMutation` for writes (coin transactions, bookings)
- Real-time: Supabase channels for live updates (notifications, GPS, chat)

---

## 4. Authentication & Authorization

### 4.1 Auth Flow

```
1. User signs up (email/password)
   -> handle_new_user() trigger creates profile row

2. User selects role
   -> assign_initial_role() RPC (parent/student/pro only)
   -> Sets role in user_roles table + app_metadata JWT claim

3. On login, AuthProvider resolves role:
   -> Check app_metadata.role (JWT, fastest)
   -> Fallback: query user_roles table
   -> Store in authStore

4. Route access:
   -> RoleGuard checks authStore.role against allowedRoles
   -> Redirects to /auth/login if no user
   -> Redirects to / if wrong role

5. Data access:
   -> RLS policies enforce per-row authorization
   -> has_role() security-definer prevents RLS recursion
```

### 4.2 Role Hierarchy

```
admin, head_manager     -> Full access (all tables, all actions)
personal_manager        -> Own clients, commissions, reports
coach                   -> Own schedule, assigned students, lessons
parent                  -> Own children, bookings, payments
student                 -> Own profile, tasks, duels, education
pro_athlete             -> Own profile, arena, records
```

### 4.3 Security Layers

| Layer | Mechanism | Location |
|-------|-----------|----------|
| UI gating | RoleGuard component | `src/components/RoleGuard.tsx` |
| Data access | Row-Level Security | Supabase policies on every table |
| Role verification | `has_role()` function | Security-definer SQL function |
| Self-assignment limit | `assign_initial_role()` | Validates only non-staff roles |
| Coin cap | `validate_task_assignment_reward()` | Trigger caps rewards at 100 |

---

## 5. Database Schema

### 5.1 Table Groups (38+ tables)

**Identity**: profiles, user_roles

**Role Data**: coaches, parents, students, pro_athletes

**Bookings & Lessons**: bookings, lessons, time_slots, pools, subscriptions

**Economy**: coin_transactions, store_items, store_purchases, economy_settings

**Duels**: duels, duel_escrow, duel_comments, duel_gifts, duel_supporter_bets

**Gamification**: task_definitions, task_completions, achievements, skill_assessments

**Education**: education_videos, education_views

**Communication**: chats, messages, notifications

**Finance**: financial_transactions, coach_payroll, manager_commissions, discount_usages, promo_codes

**AI**: ai_conversations, ai_messages, ai_tasks, ai_permissions

**Other**: complaints, booking_logs, manager_assignments, pro_personal_records, pricing_plans, referral_codes, referral_signups

### 5.2 Key Database Functions

| Function | Type | Purpose |
|----------|------|---------|
| `has_role(uuid, app_role)` | Security-definer | Role check without RLS recursion |
| `get_user_role(uuid)` | Query | Returns user role |
| `assign_initial_role(text)` | RPC | Self-service role assignment (non-staff only) |
| `handle_new_user()` | Trigger | Creates profile on signup |
| `add_coins(...)` | RPC | Awards coins with transaction record |
| `spend_coins(...)` | RPC | Deducts coins with balance validation |
| `increment_used_lessons(uuid)` | RPC | Increments subscription counter |
| `validate_task_assignment_reward()` | Trigger | Caps coin rewards at 100 |
| `notify_on_booking_complete()` | Trigger | Auto-notification on booking completion |
| `notify_payment_overdue()` | Trigger | 50-coin penalty on subscription expiry |

### 5.3 RLS Patterns

```sql
-- Admin: full access
CREATE POLICY "admin_all" ON table_name
  USING (has_role(auth.uid(), 'admin'));

-- Own data only
CREATE POLICY "own_data" ON table_name
  USING (user_id = auth.uid());

-- Parent sees own children
CREATE POLICY "parent_children" ON students
  USING (parent_id = auth.uid());

-- Public read for reference data
CREATE POLICY "public_read" ON store_items
  FOR SELECT USING (is_active = true);
```

---

## 6. Edge Functions

### 6.1 ai-chat

Streaming AI assistant using Anthropic Claude API.

```
POST /functions/v1/ai-chat
Headers: Authorization (Bearer JWT)
Body: { message, role, mode, conversationId }
Response: SSE stream (text/event-stream)
```

- Loads role-specific system prompt via `buildSystemPrompt(role, mode)`
- Streams response tokens via Server-Sent Events
- Stores messages in `ai_conversations` / `ai_messages`

### 6.2 create-checkout

Creates Stripe checkout sessions for lesson packs and subscriptions.

```
POST /functions/v1/create-checkout
Body: { priceId, planId, userId, email, isSubscription }
Response: { url: "https://checkout.stripe.com/..." }
```

### 6.3 stripe-webhook

Handles Stripe events (checkout.session.completed, subscription updates).
Updates subscriptions, financial_transactions, and booking records.

### 6.4 perplexity-research

Proxies research queries to Perplexity API for AI-enhanced research.

### 6.5 notify-lesson-reminders

Scheduled function that creates notification records for upcoming lessons.

### 6.6 seed-data

Populates test accounts and sample data for development/staging.

---

## 7. Real-Time Features

Supabase Realtime channels provide live updates:

| Feature | Channel | Direction |
|---------|---------|-----------|
| Coach GPS | `coach_location:{coachId}` | Coach broadcasts -> Parent receives |
| Notifications | `notifications:{userId}` | Server inserts -> Client receives |
| Chat messages | `messages:{roomId}` | Bidirectional |
| Duel status | `duels:{duelId}` | Server updates -> Viewers receive |

---

## 8. Payment System

### 8.1 Flow

```
1. Parent selects plan (src/lib/pricing.ts)
2. Client calls create-checkout edge function
3. Edge function creates Stripe Checkout Session
4. User redirected to Stripe hosted page
5. On success -> stripe-webhook receives event
6. Webhook updates: subscription, financial_transactions, booking
7. User redirected to /payment/success
```

### 8.2 Pricing Structure

- **Dubai**: 9 plans (AED 2 test -> AED 5,460 pack_20)
- **Baku**: Auto-converted (AED x 0.54, rounded to nearest 5 AZN)
- **Types**: Single lessons, packs (5/10/20), subscriptions (starter/premium/elite), family

---

## 9. Gamification Engine

### 9.1 Coin Economy

```
Earning:
  Task completion     -> 5-100 coins (capped by trigger)
  Duel win            -> opponent's stake minus rake
  Belt promotion      -> 300-7,500 coins
  Lesson completion   -> configurable
  Referral bonus      -> configurable

Spending:
  ProFit Shop items   -> role-specific pricing
  Duel stakes         -> locked in escrow
  Education videos    -> 5-50 coins
  Duel gifts          -> variable

All mutations via server-side RPCs (add_coins, spend_coins).
```

### 9.2 XP & Belt Progression

```
XP = (wins x 15) + (totalDuels x 5) + (totalCoinsEarned x 0.05)

White (B)     0-1,500 XP     -> 300 coins on earn
Sky Blue (N)  1,500-4,000    -> 500 coins
Green (I)     4,000-8,000    -> 800 coins
Yellow (A)    8,000-13,000   -> 1,200 coins
Orange (E)    13,000-20,000  -> 2,000 coins
Red (P)       20,000-30,000  -> 3,500 coins
Black (L)     30,000-50,000  -> 7,500 coins

Timeline: ~2-4 years from White to Black
```

### 9.3 Coach Ranks

```
Trainee -> Junior -> Senior -> Elite -> ProFit Elite
```

---

## 10. PWA Configuration

- **Service Worker** (`public/sw.js`): Cache-first for static assets, network-first for HTML/API
- **Manifest** (`public/manifest.json`): Standalone display, blue theme color
- **Install Prompt** (`src/components/InstallPrompt.tsx`): Deferred install prompt

---

## 11. External Service Dependencies

| Service | Purpose | Secrets Location |
|---------|---------|-----------------|
| Supabase | Auth, DB, Realtime, Edge Functions | `.env` (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY) |
| Anthropic | Claude AI for assistant | Supabase secrets |
| Stripe | Payments, subscriptions | Supabase secrets (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) |
| Perplexity | Research API | Supabase secrets (PERPLEXITY_API_KEY) |

---

## 12. Build & Deploy

### Development

```bash
npm run dev          # Vite dev server (localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build
npm run test         # Vitest
npm run lint         # ESLint
```

### Production

- **Frontend**: Vercel (auto-deploy from GitHub)
- **Backend**: Supabase Cloud (managed Postgres, Auth, Edge Functions)
- **Payments**: Stripe (test mode -> live mode switch)

See `DEPLOY.md` for full deployment checklist.
