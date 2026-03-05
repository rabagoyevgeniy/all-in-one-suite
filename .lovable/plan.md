

## Plan: Student Experience Overhaul

Based on analysis of the codebase and your screenshots, here's what needs to change across 4 areas:

---

### 1. Student Dashboard — Add "Accept Duel" section

Currently the dashboard shows pending duels as a badge count but no way to accept them inline.

**Changes to `StudentDashboard.tsx`:**
- Add a "Pending Challenges" section after Quick Actions
- Query duels where `opponent_id IS NULL` and `status = 'pending'` (open challenges from other students)
- Also query duels where `opponent_id = user.id` and `status = 'pending'` (direct challenges)
- Show each pending duel as a card with: challenger name, swim style, distance, stake coins, "Accept" button
- Accept button calls the same `acceptDuelMutation` logic from DuelArena (using `spendCoins` + `duel_escrow` insert + update status)

---

### 2. TaskBoard — Smart Validation (admin-only vs auto-validated)

**Problem:** Every task has a "Do" button, but tasks like "accept first duel" should auto-complete when the action happens.

**Changes:**
- Use the `verification_type` field on `task_definitions` to distinguish:
  - `'admin'` — show "Do" button (admin validates manually)
  - `'auto'` or `'system'` — no "Do" button; show progress indicator instead (e.g., "0/1 duels accepted")
  - `null` — default to showing "Do" button for backward compatibility
- Auto-validated tasks show as locked with a description of what triggers completion (e.g., "Accept a duel to complete")
- Only `verification_type = 'admin'` or `'manual'` tasks get the "Do" button

**Auto-completion trigger:** When a duel is accepted in `DuelArena.tsx`, check if there's a task like "accept_first_duel" and auto-insert into `task_completions` + award coins.

---

### 3. Student Profile — XP-Based Belt System + Professional Card

**Current:** Belt is static from DB. Stats are plain text. Achievements are a flat grid.

**Changes to constants and profile:**

**A. XP System (update `SWIM_BELTS` in `constants.ts`):**
Add XP thresholds to each belt:
```
white → sky_blue: 0/1000 XP
sky_blue → green: 1000/3000 XP  
green → yellow: 3000/6000 XP
yellow → orange: 6000/10000 XP
orange → red: 10000/15000 XP
red → black: 15000/25000 XP
```

XP earned from:
- Duel win: +100 XP
- Duel participation: +30 XP
- Task completed: +20 XP
- Lesson attended: +50 XP

Calculate XP client-side from: `wins * 100 + (wins + losses) * 30 + total_coins_earned * 0.5` (approximate from available data). The belt level is derived from total XP, not stored statically.

**B. Professional Athlete Card (redesign profile header):**
- Large glass card with gradient border matching current belt color
- Avatar circle with belt-colored ring + glow effect
- Name in bold display font
- Belt badge with XP progress bar underneath: "Water Explorer — 765/1000 XP"
- Stats displayed as a professional stat block (like a sports card):
  - Two columns: Wins/Losses on left, Streak/Coins on right
  - Win rate percentage as a circular progress indicator
  - Total duels count
  - Belt rank with colored icon

**C. Achievements with subcategories (matching your screenshots):**
Use the `category` field on `achievements` table. Group into tabs/sections:
- All achievements (default view)
- Certificates
- Core achievements  
- Personal records
- Seasonal events
- Tournament achievements

Each achievement card: icon (large), name, earned/locked state, coin reward, tap to see details modal (like your screenshot showing requirements + EXP/coin rewards).

---

### 4. Achievement Detail Modal

When tapping an achievement, show a modal with:
- Large achievement icon/badge
- "Earned" or "Not earned" status badge
- Requirements list (from `description` field)
- Rewards: EXP + ProFit Coins
- "Got it" dismiss button

---

### Files to create/edit:
1. **Edit** `src/lib/constants.ts` — add XP thresholds to SWIM_BELTS
2. **Edit** `src/pages/student/StudentDashboard.tsx` — add pending challenges section
3. **Edit** `src/pages/student/TaskBoard.tsx` — smart validation based on `verification_type`
4. **Rewrite** `src/pages/student/StudentProfile.tsx` — XP system, pro card design, achievement subcategories with detail modal
5. **Edit** `src/pages/student/DuelArena.tsx` — auto-complete relevant tasks on duel accept

### No database migrations needed
All fields used (`verification_type`, `category`, `total_coins_earned`, `wins`, `losses`) already exist in the schema.

