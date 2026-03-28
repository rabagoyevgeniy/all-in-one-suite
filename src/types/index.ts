/**
 * Shared application types for ProFit Swimming Academy.
 * These extend or complement the auto-generated Supabase types.
 */

import type { Database } from '@/integrations/supabase/types';

// ── Supabase table row shortcuts ──────────────────────────────────────────

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Booking = Database['public']['Tables']['bookings']['Row'];
export type Lesson = Database['public']['Tables']['lessons']['Row'];
export type Student = Database['public']['Tables']['students']['Row'];
export type Coach = Database['public']['Tables']['coaches']['Row'];
export type StoreItem = Database['public']['Tables']['store_items']['Row'];
export type StorePurchase = Database['public']['Tables']['store_purchases']['Row'];
export type CoinTransaction = Database['public']['Tables']['coin_transactions']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type Achievement = Database['public']['Tables']['achievements']['Row'];
export type ChatRoom = Database['public']['Tables']['chat_rooms']['Row'];
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
export type ChatMember = Database['public']['Tables']['chat_members']['Row'];
export type Duel = Database['public']['Tables']['duels']['Row'];
export type TaskDefinition = Database['public']['Tables']['task_definitions']['Row'];
export type FinancialTransaction = Database['public']['Tables']['financial_transactions']['Row'];
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type PricingPlan = Database['public']['Tables']['pricing_plans']['Row'];
export type EducationVideo = Database['public']['Tables']['education_videos']['Row'];
export type Pool = Database['public']['Tables']['pools']['Row'];
export type TimeSlot = Database['public']['Tables']['time_slots']['Row'];
export type SkillAssessment = Database['public']['Tables']['skill_assessments']['Row'];
export type TrainingPlan = Database['public']['Tables']['training_plans']['Row'];

// ── Extended types (fields not in auto-generated types) ───────────────────

/** Profile with optional onboarding field (added via migration but not in generated types) */
export interface ProfileExtended extends Profile {
  onboarding_completed?: boolean;
  coin_balance?: number;
}

/** Notification preferences stored as JSON in profiles.notification_prefs */
export interface NotificationPrefs {
  push_enabled?: boolean;
  email_enabled?: boolean;
  lesson_reminders?: boolean;
  duel_notifications?: boolean;
  coin_notifications?: boolean;
  chat_notifications?: boolean;
}

// ── Chat types ────────────────────────────────────────────────────────────

export interface ChatMemberWithProfile extends ChatMember {
  profiles: Profile | null;
}

export interface ChatMessageWithSender extends ChatMessage {
  sender?: Profile | null;
}

export interface ForwardTarget {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

// ── Duel types ────────────────────────────────────────────────────────────

export interface DuelWithProfiles extends Duel {
  challenger_profile?: Profile | null;
  opponent_profile?: Profile | null;
  second_profile?: Profile | null;
}

// ── Booking types ─────────────────────────────────────────────────────────

export interface BookingWithRelations extends Booking {
  students?: { profiles?: Profile | null } | null;
  coaches?: { profiles?: Profile | null } | null;
  pools?: Pool | null;
  time_slots?: TimeSlot | null;
  lessons?: Lesson[] | null;
}

// ── Lesson types ──────────────────────────────────────────────────────────

export interface LessonWithRelations extends Omit<Lesson, 'coach_lesson_rating'> {
  bookings?: BookingWithRelations | null;
  coach_lesson_rating?: number | null;
}

// ── Student types ─────────────────────────────────────────────────────────

export interface StudentWithProfile extends Student {
  profiles?: Profile | null;
}

// ── Coach types ───────────────────────────────────────────────────────────

export interface CoachWithProfile extends Coach {
  profiles?: Profile | null;
}

// ── Store types ───────────────────────────────────────────────────────────

export interface StoreItemExtended extends Omit<StoreItem, 'category'> {
  category?: string;
}

export interface StorePurchaseExtended extends StorePurchase {
  item_id: string;
}

// ── AI Task types ─────────────────────────────────────────────────────────

export interface AITaskStep {
  id: string;
  text: string;
  done: boolean;
}

export interface AITask {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: string | null;
  due_date?: string | null;
  progress_percent: number;
  steps: AITaskStep[];
  created_at?: string | null;
  updated_at?: string | null;
  user_id: string;
  category?: string | null;
}

// ── Drag / Motion types ───────────────────────────────────────────────────

export interface DragInfo {
  offset: { x: number; y: number };
  velocity: { x: number; y: number };
}

// ── Supabase Realtime types ───────────────────────────────────────────────

export interface RealtimePresence {
  user_id: string;
  typing?: boolean;
  [key: string]: unknown;
}

export interface RealtimePayloadNew {
  balance_after?: number;
  amount?: number;
  [key: string]: unknown;
}

// ── PM types ──────────────────────────────────────────────────────────────

export interface ManagerAssignment {
  id: string;
  manager_id: string;
  parent_id: string;
  parents?: { profiles?: Profile | null } | null;
}

export interface ManagerCommission {
  id: string;
  manager_id: string;
  amount: number;
  commission_type: string;
  created_at: string | null;
}

// ── Education types ───────────────────────────────────────────────────────

export interface EducationVideoExtended extends EducationVideo {
  coaches?: { profiles?: Profile | null } | null;
}

// ── Location / GPS types ──────────────────────────────────────────────────

export interface CoachLocation {
  latitude: number;
  longitude: number;
  updated_at: string;
}
