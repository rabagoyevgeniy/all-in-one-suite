# ProFit Academy — Comprehensive Project Documentation

> **Stack**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Supabase (Lovable Cloud)
> **Architecture**: Mobile-first SPA, role-based multi-portal, gamified swim academy management platform

---

## 1. APPLICATION OVERVIEW

ProFit Academy is a **gamified swimming academy management platform** serving 7 user roles. It combines lesson booking, coach management, student gamification (duels, tasks, coins), parent oversight, and financial tracking into a single mobile-first web application.

### Core Concept
- **ProFit Coins** — virtual currency earned through tasks, lessons, achievements; spent in role-specific shops
- **Swim Belt System** — XP-based progression (White→Black) with class designations (B/N/I/A/E/P/L)
- **Duel Arena** — competitive 1v1 swim challenges with coin stakes, seconds (referees), and live streaming
- **Education Hub** — paid technique videos from coaches

---

## 2. USER ROLES & PORTALS

### 2.1 Admin (`/admin/*`)
- **Dashboard**: Real-time stats (revenue, bookings, active coaches/students) via `admin_dashboard_stats` view
- **Coaches Management**: CRUD coaches, view ranks, ratings, lesson counts
- **Clients Management**: Parents + students overview
- **Bookings**: All bookings with status management
- **Financial**: Transaction history, revenue tracking (AED/AZN currencies)
- **Economy Settings**: Configure coin rewards, store items, economy parameters
- **Tasks**: Manage task definitions for all roles

### 2.2 Head Manager (`/admin/*`)
- Same portal as Admin (shared `RoleGuard`)

### 2.3 Coach (`/coach/*`)
- **Dashboard**: Today's route with GPS tracking (broadcasts location to parents), booking cards, quick stats (lessons, rating, coins, rank)
- **Schedule**: Booking calendar
- **Students**: Student list with swim belt badges
- **Earnings**: Payroll history, seconding earnings
- **Profile**: Bio, specializations, rank display
- **Lesson Report** (`/coach/lesson/:id`): Step-by-step lesson documentation (arrival, warmup, skills, handoff)
- **Shop** (`/coach/shop`): ProFit Shop for coaches

### 2.4 Personal Manager (`/pm/*`)
- **Dashboard**: Assigned clients overview
- **Reports**: Client progress summaries, lesson AI summaries
- **Earnings**: Commission tracking (manager % + head manager %)

### 2.5 Parent (`/parent/*`)
- **Dashboard**: Children cards (belt, coins, streak), subscription progress bar, upcoming bookings, **real-time coach GPS tracker** with embedded Google Maps
- **Booking**: New lesson booking
- **Coins**: Coin balance and transaction history
- **Chat**: Messaging with coaches/managers
- **Shop** (`/parent/shop`): ProFit Shop for parents

### 2.6 Student (`/student/*`) — **Arena Theme**
- **Dashboard**: Hero card (belt, class, XP, coins, streak, W/L), quick actions (Duel Arena, Leaderboard, Education), pending challenges with accept button, daily tasks
- **Task Board**: Smart task system with streak tracking, navigation links to in-app sections, monthly achievement awards
- **Store/Shop** (`/student/store`): ProFit Shop for students
- **Duel Arena**: Create/accept duels with opponent preview (ℹ️ button), second/referee selection, stake validation
- **Education**: Paid technique videos (costs ProFit Coins)
- **Live Duels**: Watch active duel streams
- **Profile**: Belt journey, stats, achievements

### 2.7 Pro Athlete (`/pro/*`) — **Arena Theme**
- **Dashboard**: Pro rating card (Bronze→Diamond tiers), W/L stats, quick actions, personal records
- **Arena**: Competitive duels
- **Records**: Personal best times with FINA points
- **Profile**: Pro stats
- **Shop** (`/pro/shop`): ProFit Shop for pro athletes

---

## 3. FRONTEND ARCHITECTURE

### 3.1 File Structure
```
src/
├── App.tsx                    # Route definitions, QueryClient, providers
├── main.tsx                   # Entry point
├── index.css                  # Design system tokens (HSL), arena theme
├── components/
│   ├── AppLayout.tsx          # Shell with BottomNav, NotificationBell
│   ├── AuthProvider.tsx       # Auth state listener, role resolution
│   ├── BottomNav.tsx          # Role-based bottom navigation (5 items per role)
│   ├── CoinBalance.tsx        # Animated coin display component
│   ├── DevAccountSwitcher.tsx # Dev-only role switching tool
│   ├── NavLink.tsx            # Navigation link component
│   ├── NotificationBell.tsx   # Real-time notification indicator
│   ├── PageHeader.tsx         # Consistent page header with children slot
│   ├── ProFitShop.tsx         # Unified shop component (used by all roles)
│   ├── RoleGuard.tsx          # Route protection by role
│   ├── SwimBeltBadge.tsx      # Belt color badge with swim cap icon
│   └── ui/                    # shadcn/ui components (40+ components)
├── hooks/
│   ├── useCoins.ts            # Centralized coin economy engine (award/spend)
│   ├── useAdminDashboardStats.ts
│   └── use-toast.ts
├── stores/
│   ├── authStore.ts           # Zustand auth state (user, role, session)
│   └── adminStore.ts          # Admin-specific state
├── lib/
│   ├── constants.ts           # SWIM_BELTS, COACH_RANKS, XP formulas, role types
│   └── utils.ts               # cn() utility
├── integrations/supabase/
│   ├── client.ts              # Auto-generated Supabase client
│   └── types.ts               # Auto-generated TypeScript types
└── pages/
    ├── admin/                 # 7 admin pages
    ├── coach/                 # 7 coach pages (incl. shop)
    ├── parent/                # 6 parent pages (incl. shop)
    ├── student/               # 9 student pages (incl. shop, education, live-duels)
    ├── pro/                   # 5 pro pages (incl. shop)
    ├── pm/                    # 3 PM pages
    └── auth/LoginPage.tsx     # Authentication page
```

### 3.2 Routing & Guards
- `RoleGuard` wraps route groups, checks `useAuthStore().role` against `allowedRoles`
- Role resolved from JWT `app_metadata` → `user_metadata` → `user_roles` table query
- Unauthorized users redirected to `/auth/login`
- Role-specific redirects defined in `ROLE_ROUTES` constant

### 3.3 Design System
- **Theme**: Dark-first with HSL tokens (`--background`, `--primary`, `--foreground`, etc.)
- **Arena Theme**: Special gradient background for Student/Pro portals (`bg-gradient-arena`)
- **Glass Cards**: `glass-card` class with backdrop-blur, semi-transparent backgrounds
- **Glow Effects**: `glow-primary`, `glow-gold` for emphasis
- **Typography**: `font-display` for headings, system fonts for body
- **Animations**: Framer Motion throughout (fade-in, scale, slide)

### 3.4 State Management
- **Auth**: Zustand store (`authStore.ts`) — user object, role, loading state
- **Server State**: TanStack React Query for all Supabase data fetching
- **Real-time**: Supabase Realtime channels for coach GPS tracking, notifications

### 3.5 Key UI Components

#### ProFitShop (Unified Shop)
- Props: `storeType` (student|coach|parent|pro), `userRole`, `balanceTable`, `theme`
- Features: Category tabs, purchase limits, stock tracking, purchase history
- Coin spending via centralized `spendCoins()` function

#### CoinBalance
- Animated coin counter with size variants (sm/md/lg)

#### SwimBeltBadge
- Colored swim cap icon matching belt level
- Shows belt name and class code

#### BottomNav
- 5 items per role, role-specific icons and routes
- Active state highlighting with thicker stroke

---

## 4. BACKEND ARCHITECTURE (Supabase/Lovable Cloud)

### 4.1 Database Schema (38+ tables)

#### Core Tables
| Table | Purpose |
|-------|---------|
| `profiles` | User identity (full_name, avatar, city, phone) — linked to auth.users |
| `user_roles` | Role assignments (enum: admin, head_manager, personal_manager, coach, parent, student, pro_athlete) |

#### Role-Specific Tables
| Table | Key Columns |
|-------|-------------|
| `coaches` | rank, avg_rating, coin_balance, hourly_rate, GPS fields, specializations, seconding settings |
| `parents` | loyalty_rank, coin_balance, referral_code, subscription_tier, personal_manager_id |
| `students` | swim_belt, coin_balance, wins/losses, current_streak, longest_streak, parent_id |
| `pro_athletes` | pro_tier (bronze→diamond), pro_rating_points, coin_balance, wins/losses, subscription_tier |

#### Booking & Lessons
| Table | Purpose |
|-------|---------|
| `bookings` | Lesson bookings (coach, student, parent, pool, status, fees) |
| `lessons` | Detailed lesson records (skills worked, video, ratings, handoff) |
| `time_slots` | Available time slots |
| `pools` | Swimming pool locations with GPS coordinates |
| `subscriptions` | Parent subscription packages with lesson tracking |

#### Economy System
| Table | Purpose |
|-------|---------|
| `coin_transactions` | All coin movements (amount, type, balance_after, reference_id) |
| `store_items` | Shop inventory (price_coins, price_aed, store_type, stock, limits) |
| `store_purchases` | Purchase records |
| `economy_settings` | Configurable economy parameters |

#### Duel System
| Table | Purpose |
|-------|---------|
| `duels` | Duel records (challenger, opponent, stake, times, style, distance, second, stream) |
| `duel_escrow` | Locked coin stakes during active duels |
| `duel_comments` | Live duel chat |
| `duel_gifts` | In-duel virtual gifts |
| `duel_supporter_bets` | Spectator betting |

#### Gamification
| Table | Purpose |
|-------|---------|
| `task_definitions` | Task templates (key, title, coin_reward, reset_period, target_role) |
| `task_completions` | User task completion records |
| `achievements` | Achievement definitions with coin rewards |
| `skill_assessments` | Coach-assessed skill levels per student |

#### Education
| Table | Purpose |
|-------|---------|
| `education_videos` | Technique videos (title, coach_id, coin_cost, category) |
| `education_views` | Video view records with coins_paid |

#### Communication
| Table | Purpose |
|-------|---------|
| `chats` | Chat rooms (participant_ids array) |
| `messages` | Chat messages with read tracking |
| `notifications` | Push-style notifications (title, body, type, reference_id) |

#### Finance
| Table | Purpose |
|-------|---------|
| `financial_transactions` | Real money movements (AED/AZN) |
| `coach_payroll` | Coach salary/bonus calculations |
| `manager_commissions` | PM commission tracking |
| `discount_usages` | Applied discounts |
| `promo_codes` | Promotional codes |

#### Other
| Table | Purpose |
|-------|---------|
| `complaints` | User complaints with admin resolution |
| `booking_logs` | Booking change audit trail |
| `manager_assignments` | PM-to-client assignments |
| `pro_personal_records` | Pro athlete best times with FINA points |

### 4.2 Row-Level Security (RLS)

Every table has RLS enabled. Common patterns:
- **Admin**: Full access via `has_role(auth.uid(), 'admin')` security-definer function
- **Own data**: `user_id = auth.uid()` or `id = auth.uid()`
- **Relational access**: Coaches see students from their bookings, parents see their children
- **Public data**: Active store items, pools, economy settings, completed duels are publicly readable

### 4.3 Database Functions
| Function | Purpose |
|----------|---------|
| `has_role(uuid, app_role)` | Security-definer role check (prevents RLS recursion) |
| `get_user_role(uuid)` | Returns user's role |
| `assign_initial_role(text)` | Self-service role assignment for parent/student/pro (validates allowed roles) |
| `handle_new_user()` | Trigger: creates profile on auth signup |
| `increment_used_lessons(uuid)` | Increments subscription lesson counter |
| `validate_task_assignment_reward()` | Trigger: caps coin rewards at 100 |
| `notify_on_booking_complete()` | Trigger: sends notification when booking completes |
| `notify_payment_overdue()` | Trigger: deducts 50 coins penalty on subscription expiry |

### 4.4 Edge Functions
| Function | Purpose |
|----------|---------|
| `seed-data` | Populates initial test data |
| `notify-lesson-reminders` | Sends lesson reminder notifications |

### 4.5 Real-time Subscriptions
- Coach GPS location updates → Parent dashboard
- Notifications table → NotificationBell component
- Messages table → Chat views

---

## 5. COIN ECONOMY ENGINE

### 5.1 Earning Coins
- **Task completion**: 5-100 coins per task (configurable, capped by trigger)
- **Duel wins**: Winner takes opponent's stake minus academy rake
- **Achievements**: Belt promotions award 300-7500 coins
- **Lesson completion**: Coins for both student and coach
- **Referrals**: Parent referral bonuses

### 5.2 Spending Coins
- **ProFit Shop**: Role-specific items (gear, premium features, gifts, rewards)
- **Duel Stakes**: Locked in escrow during active duels
- **Education Videos**: 5-50 coins to watch technique videos
- **Duel Gifts**: Send virtual gifts during live duels

### 5.3 Transaction Flow
```
awardCoins(userId, role, amount, type, description, referenceId?)
  → Read current balance from role table
  → Update balance in role table
  → Insert into coin_transactions
  → Insert notification

spendCoins(userId, role, amount, type, description, referenceId?)
  → Read current balance
  → Validate sufficient funds
  → Deduct from role table
  → Insert into coin_transactions (negative amount)
  → Return { success, newBalance, error? }
```

---

## 6. XP & BELT PROGRESSION

### 6.1 XP Formula
```
XP = (wins × 15) + (totalDuels × 5) + (totalCoinsEarned × 0.05)
```

### 6.2 Belt Levels
| Belt | Class | Code | XP Range | Coins on Earn |
|------|-------|------|----------|---------------|
| White | Beginner | B | 0-1,500 | 300 |
| Sky Blue | Novice | N | 1,500-4,000 | 500 |
| Green | Intermediate | I | 4,000-8,000 | 800 |
| Yellow | Advanced | A | 8,000-13,000 | 1,200 |
| Orange | Expert | E | 13,000-20,000 | 2,000 |
| Red | Pro Athlete | P | 20,000-30,000 | 3,500 |
| Black | Legend | L | 30,000-50,000 | 7,500 |

### 6.3 Coach Ranks
Trainee → Junior → Senior → Elite → ProFit Elite

---

## 7. DUEL SYSTEM

### 7.1 Flow
1. Challenger creates duel (style, distance, stake, optional opponent, optional second)
2. Coins locked in `duel_escrow`
3. Opponent accepts (their coins also locked)
4. Second (coach or premium pro athlete) officiates
5. Times recorded, winner determined
6. Escrow released to winner (minus academy rake)
7. Second earns base % + optional tip %

### 7.2 Duel Types
- **Open Challenge**: No specific opponent (anyone can accept)
- **Direct Challenge**: Specific opponent invited
- **Ranked**: Affects pro rating points

### 7.3 Live Streaming
- `live_stream_active` flag on duels
- `live_stream_url` for stream source
- `viewer_count` tracking
- Live comments via `duel_comments`
- Spectator betting via `duel_supporter_bets`

---

## 8. TASK SYSTEM

### 8.1 Task Types
- **Daily**: Reset daily (e.g., "Watch Technique Video", "Watch 3 Streams")
- **Once**: One-time tasks (e.g., "Accept first duel")
- **System-validated**: Tasks completed by system actions (accepting duels, making purchases)

### 8.2 Navigation Links
Tasks that map to in-app actions have navigation targets:
- `watch_technique_video` → `/student/education`
- `watch_3_streams` → `/student/live-duels`
- `accept_first_duel` → `/student/duels`
- `complete_purchase` → `/student/store`

### 8.3 Streaks & Achievements
- Daily streak counter for consecutive 100% task completion
- 30-day streak → Monthly achievement (e.g., "Best Player of March 2026")
- Achievements feed into Leaderboard

---

## 9. ProFit SHOP SYSTEM

### 9.1 Architecture
- **Unified component** (`ProFitShop.tsx`) shared across all roles
- **Role-specific stores**: Items filtered by `store_type` (student, coach, parent, pro)
- **Category tabs**: gear, premium, reward, gift
- **Purchase validation**: Balance check, stock check, per-user limits

### 9.2 Item Properties
- `price_coins`: Coin cost
- `price_aed`: Optional real-money component
- `is_limited`: Limited stock flag
- `stock_count`: Remaining inventory
- `max_per_user_per_period`: Purchase frequency limits
- `requires_rank`: Minimum belt/rank requirement
- `requires_achievement_id`: Achievement unlock requirement
- `combinable_with_discounts`: Discount compatibility

### 9.3 Routes
| Role | Route |
|------|-------|
| Student | `/student/store` |
| Coach | `/coach/shop` |
| Parent | `/parent/shop` |
| Pro Athlete | `/pro/shop` |

---

## 10. AUTHENTICATION

### 10.1 Flow
1. User signs up with email/password → `handle_new_user()` trigger creates profile
2. User selects role via `assign_initial_role()` (only parent/student/pro self-assignable)
3. Staff roles (admin, coach, PM) assigned by admin
4. JWT contains role in `app_metadata`/`user_metadata`
5. `AuthProvider` listens to auth state changes, resolves role

### 10.2 Security
- Roles stored in `user_roles` table (never on profiles)
- `has_role()` is security-definer to prevent RLS recursion
- All table access governed by RLS policies
- `assign_initial_role()` validates only non-staff roles can be self-assigned

---

## 11. REAL-TIME FEATURES

1. **Coach GPS Tracking**: Coach broadcasts position → Parent sees on map
2. **Notifications**: Real-time bell updates via Supabase Realtime
3. **Live Duels**: Active duel status and viewer counts
4. **Chat Messages**: Real-time messaging between parents/coaches

---

## 12. DESIGN TOKENS (index.css)

```css
:root {
  --background: 210 40% 98%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --secondary: 210 40% 96.1%;
  --muted: 210 40% 96.1%;
  --accent: 210 40% 96.1%;
  --destructive: 0 84.2% 60.2%;
  --coin: 45 93% 47%;        /* Gold for coins */
  --success: 142 76% 36%;
  --warning: 38 92% 50%;
  --arena-glow: 263 70% 50%; /* Purple glow for arena theme */
}
```

---

## 13. DEPENDENCIES

Core: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
State: Zustand, TanStack React Query
Backend: @supabase/supabase-js
Animation: Framer Motion
Charts: Recharts
Forms: React Hook Form + Zod
Router: React Router DOM v6
