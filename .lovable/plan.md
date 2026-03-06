

## Plan: Enhanced Duel System, Class System, Task Navigation & Education Section

### 1. Add Class Designations to Belts (`src/lib/constants.ts`)

Add a `classCode` and `className` to each belt:
- White → Class **B** (Beginner)
- Sky Blue → Class **N** (Novice)  
- Green → Class **I** (Intermediate)
- Yellow → Class **A** (Advanced)
- Orange → Class **E** (Expert)
- Red → Class **P** (Pro Athlete)
- Black → Class **L** (Legend)

These will display everywhere belt info appears (profile cards, opponent previews, second selection).

---

### 2. Enhanced Second/Referee Selection (`src/pages/student/DuelArena.tsx`)

**Current:** Shows coach name, rating, lessons count.

**Changes:**
- Query `duels` table to count how many duels each coach has seconded (`second_id = coach.id`)
- Show: name, seconding count, coach rank (from `coaches.rank`), and coach class level
- Add an **Info (i)** button next to the second dropdown that opens a profile modal for the selected second showing their full stats
- Allow pro athletes with premium subscription to appear in the seconds pool (query `pro_athletes` where `subscription_tier != 'silver'` + join profiles)

---

### 3. Rich Athlete Profile Card (`ChallengerProfileCard` in DuelArena.tsx)

**Current:** Shows name, belt, XP, wins, win rate, streak.

**Changes:**
- Add **Class designation** (e.g., "Class B · Beginner")
- Add **Duel History tab** — query all completed duels for this athlete showing:
  - Opponent name, class, date, result (W/L), second name, pool, style/distance
- Make it scrollable with a visually striking gradient header matching their belt
- Use tabs: "Stats" | "Duel History"

---

### 4. Dashboard Task Deduplication (`src/pages/student/StudentDashboard.tsx` + `src/components/BottomNav.tsx`)

**Problem:** "Tasks" appears in both the dashboard Quick Actions and bottom nav.

**Solution:** Replace "Tasks" in Quick Actions with **"Education"** (new section). Keep Tasks only in bottom nav. Update Quick Actions to:
- Duel Arena
- Leaderboard  
- Education (new)

---

### 5. Task Board Streak & Monthly Achievement (`src/pages/student/TaskBoard.tsx`)

- Add a **Task Streak** counter tracking consecutive days with 100% task completion
- When streak hits a threshold (e.g., 30 days = full month), auto-award a monthly achievement like "Best Player of [Month] [Year]"
- Show streak prominently with fire animation in the Daily Progress section
- This achievement feeds into the Leaderboard

---

### 6. Task Navigation Links (`src/pages/student/TaskBoard.tsx`)

Tasks that can be done in-app get a **navigation arrow** that routes to the relevant section:
- "Watch Technique Video" → `/student/education`
- "Watch 3 Streams" → `/student/live-duels`
- "Accept a Duel" → `/student/duels`
- "Complete a Purchase" → `/student/store`

Map via a `navigation_target` lookup based on task `key` field.

---

### 7. New Education Section (`src/pages/student/Education.tsx`)

- New page at `/student/education`
- Shows educational videos uploaded by coaches (stored in a new `education_videos` table)
- Each video costs ProFit Coins to watch (e.g., 5-20 coins)
- After watching (clicking "Watch"), coins are deducted and the view is recorded
- Shows: thumbnail placeholder, title, coach name, coin cost, category tags

---

### 8. New Live Duels Section (`src/pages/student/LiveDuels.tsx`)

- New page at `/student/live-duels`  
- Shows duels with `status = 'in_progress'` and `live_stream_active = true`
- Displays: participants, style, distance, viewer count, pool
- Watching a live duel counts toward "Watch 3 Streams" task progress

---

### Database Migrations Needed

**Table: `education_videos`**
```sql
CREATE TABLE public.education_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  video_url text,
  thumbnail_url text,
  coach_id uuid REFERENCES public.profiles(id),
  coin_cost integer NOT NULL DEFAULT 10,
  category text DEFAULT 'technique',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.education_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES public.education_videos(id),
  user_id uuid NOT NULL,
  coins_paid integer NOT NULL DEFAULT 0,
  viewed_at timestamptz DEFAULT now()
);
```

With RLS policies for students to SELECT active videos, INSERT own views; coaches to manage their own videos; admin full access.

---

### Files to Create/Edit

1. **Edit** `src/lib/constants.ts` — add `classCode` and `className` to SWIM_BELTS
2. **Edit** `src/pages/student/DuelArena.tsx` — enhanced second picker with stats + info button, rich athlete card with duel history tab, class display
3. **Edit** `src/pages/student/TaskBoard.tsx` — task streak, navigation links on tasks
4. **Edit** `src/pages/student/StudentDashboard.tsx` — replace Tasks quick action with Education
5. **Create** `src/pages/student/Education.tsx` — education video section
6. **Create** `src/pages/student/LiveDuels.tsx` — live duels viewing section
7. **Edit** `src/App.tsx` — add `/student/education` and `/student/live-duels` routes
8. **Edit** `src/components/BottomNav.tsx` — add Education to student nav (replace or add 5th item)
9. **Migration** — create `education_videos` and `education_views` tables with RLS

