

# Coach Dashboard Enhancement Plan

## Critical Analysis of Your Request

Your ideas are strong but need refinement in several areas:

1. **GPS Live Map page** — Great idea, but building a full Uber-like map with ETA requires a mapping API (Google Maps/Mapbox). I'll implement an embedded Google Maps view with the coach's live coordinates and a clean metrics overlay instead of a custom canvas map. ETA calculation requires Google Directions API which needs a paid key — I'll show distance and "last updated" time instead, which is more practical.

2. **Stats cards (Lessons/Rating/Coins/Rank) as clickable drill-downs** — Excellent. Each opens a dedicated detail sheet or page. However, the "AI-generated summary of good/bad comments like Amazon" for ratings requires an AI call — I'll implement it using Lovable AI (Gemini Flash) to generate a pros/cons summary from review comments.

3. **Today's Route with parent notes, parking, health info** — The bookings table doesn't have fields for parking instructions, parent geo-pin, or health notes. I'll add a `booking_notes` JSON field or use the existing `notes` column, and add fields to the parent booking flow later. For now, I'll display whatever `notes` exist and show the pool address with a map pin.

4. **Start/End lesson timer with location logging** — Already partially implemented in `CoachActiveLesson.tsx`. I'll enhance it to save start/end coordinates and fix the timer flow.

## What Gets Built (7 new pages/components)

### 1. GPS Live Tracking Page (`/coach/live-tracking`)
- Opens when coach taps the GPS banner
- Embedded Google Maps iframe showing coach's current position
- Metrics overlay: current speed area, last update time, distance to next lesson
- Coach profile card at top (name, photo, rank)
- "Share with parent" status indicator
- Real-time coordinate updates every 10s

### 2. Lessons History Sheet (`/coach/lessons-history`)
- Triggered by tapping "234 Lessons" stat card
- Grouped by month, scrollable list
- Each lesson card: date, student name, pool, duration, skills worked, coach rating
- Tap any lesson → detail view with full report, notes, attached files

### 3. Rating Detail Sheet (`/coach/ratings`)
- Triggered by tapping "4.7 Rating" stat card
- Overall rating with star breakdown (5★: 80%, 4★: 15%, etc.)
- AI-generated summary: "What parents love" / "Areas to improve" (using Gemini Flash)
- Scrollable list of all reviews: parent name, date, rating, comment
- Filter by rating (all / 5★ / 4★ / etc.)

### 4. Coin Transaction History (`/coach/coins`)
- Triggered by tapping "3,200 Coins" stat card
- Balance at top with trend indicator
- Transaction list grouped by date
- Each row: icon (↑ earned / ↓ spent), description, amount, running balance
- Filter tabs: All / Earned / Spent
- Clean finance-app style (like Revolut/Wise)

### 5. Rank History & Progress (`/coach/rank`)
- Triggered by tapping "Senior" rank card
- Current rank with visual badge
- Timeline of rank promotions (when each rank was achieved)
- Requirements for next rank (lessons needed, rating threshold, test status)
- Perks unlocked at current rank
- Leaderboard position among all coaches

### 6. Enhanced Today's Route Cards
- Show parent notes/preferences from `bookings.notes`
- Display full pool address with apartment/building details
- "Navigate" opens Google Maps with exact coordinates
- Parent health notes section (if available)

### 7. Enhanced Start/End Lesson Flow
- "Start" records `started_at` + GPS coordinates in `lessons` table
- Active lesson page shows live timer (already exists, enhance)
- "End" records `ended_at` + GPS coordinates + duration
- All data persisted to `lessons` table

## Database Changes Needed
- Migration: Add `started_location_lat`, `started_location_lng`, `ended_location_lat`, `ended_location_lng` columns to `lessons` table
- Migration: Add `rank_history` JSONB column to `coaches` table (array of `{rank, achieved_at}`)

## New Routes
```
/coach/live-tracking
/coach/lessons-history  
/coach/ratings
/coach/coins
/coach/rank
```

## Files to Create/Edit
- **Create**: `src/pages/coach/CoachLiveTracking.tsx`
- **Create**: `src/pages/coach/CoachLessonsHistory.tsx`
- **Create**: `src/pages/coach/CoachRatings.tsx`
- **Create**: `src/pages/coach/CoachCoins.tsx`
- **Create**: `src/pages/coach/CoachRankHistory.tsx`
- **Edit**: `src/pages/coach/CoachDashboard.tsx` — make stat cards clickable, enhance GPS banner, enhance route cards
- **Edit**: `src/pages/coach/CoachActiveLesson.tsx` — add GPS coordinate capture on start/end
- **Edit**: `src/App.tsx` — register 5 new routes

