# Project Index — ProFit Platform

This document helps AI understand the structure and dependencies of the repository.

---

# Core Application

src/

Main frontend application built with React + TypeScript.

Key areas:

- pages → route-based modules
- components → reusable UI components
- hooks → data logic
- lib → business logic
- integrations → Supabase connection

---

# Routing

src/pages/

Role-based routing structure:

admin/
coach/
parent/
student/
pro/
pm/

Each role has its own dashboard and feature set.

---

# State Management

Zustand

Used for:

- authentication
- UI state

React Query

Used for:

- server state
- Supabase data fetching
- caching

---

# Backend Integration

Supabase

Provides:

- authentication
- database
- realtime subscriptions
- RPC functions

Supabase client located in:

src/integrations/supabase/

---

# AI System

AI features are located in:

src/components/ai/

Includes:

- AI assistant interface
- AI conversation UI
- AI settings

---

# Gamification Engine

Located across:

components/
hooks/
lib/

Features:

- coins economy
- achievements
- duels
- leaderboards
- shop

---

# Important Hooks

src/hooks/

Examples:

useCoins
useNotifications
usePricing
useAdminStats

These hooks encapsulate business logic.

---

# Critical Security Areas

AuthProvider
RoleGuard
Supabase RLS policies
Coin economy RPC functions

These must always be audited before refactoring.

---

# Development Priority Areas

1. Authentication system
2. Role-based access
3. Gamification economy
4. Booking system
5. AI assistant integration

---

# Future Modules

backend/
mobile/
ai-agents/
analytics/

These modules are planned but not implemented yet.