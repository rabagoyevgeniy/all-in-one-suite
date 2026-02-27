export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      booking_logs: {
        Row: {
          booking_id: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          new_slot_id: string | null
          new_status: string | null
          old_slot_id: string | null
          old_status: string | null
          reason: string
        }
        Insert: {
          booking_id?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_slot_id?: string | null
          new_status?: string | null
          old_slot_id?: string | null
          old_status?: string | null
          reason: string
        }
        Update: {
          booking_id?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_slot_id?: string | null
          new_status?: string | null
          old_slot_id?: string | null
          old_status?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_type: string | null
          cancellation_reason: string | null
          cancelled_by: string | null
          coach_id: string | null
          created_at: string | null
          currency: string | null
          id: string
          is_premium_recorded: boolean | null
          lesson_fee: number | null
          notes: string | null
          parent_id: string | null
          pool_id: string | null
          reschedule_count: number | null
          slot_id: string | null
          status: string | null
          student_id: string | null
          transport_fee: number | null
          updated_at: string | null
        }
        Insert: {
          booking_type?: string | null
          cancellation_reason?: string | null
          cancelled_by?: string | null
          coach_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          is_premium_recorded?: boolean | null
          lesson_fee?: number | null
          notes?: string | null
          parent_id?: string | null
          pool_id?: string | null
          reschedule_count?: number | null
          slot_id?: string | null
          status?: string | null
          student_id?: string | null
          transport_fee?: number | null
          updated_at?: string | null
        }
        Update: {
          booking_type?: string | null
          cancellation_reason?: string | null
          cancelled_by?: string | null
          coach_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          is_premium_recorded?: boolean | null
          lesson_fee?: number | null
          notes?: string | null
          parent_id?: string | null
          pool_id?: string | null
          reschedule_count?: number | null
          slot_id?: string | null
          status?: string | null
          student_id?: string | null
          transport_fee?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "time_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_payroll: {
        Row: {
          base_salary: number | null
          coach_id: string | null
          created_at: string | null
          currency: string | null
          deductions: number | null
          id: string
          lessons_count: number | null
          notes: string | null
          paid_at: string | null
          performance_bonus: number | null
          period_end: string | null
          period_start: string | null
          seconding_earnings: number | null
          status: string | null
          transport_bonus: number | null
        }
        Insert: {
          base_salary?: number | null
          coach_id?: string | null
          created_at?: string | null
          currency?: string | null
          deductions?: number | null
          id?: string
          lessons_count?: number | null
          notes?: string | null
          paid_at?: string | null
          performance_bonus?: number | null
          period_end?: string | null
          period_start?: string | null
          seconding_earnings?: number | null
          status?: string | null
          transport_bonus?: number | null
        }
        Update: {
          base_salary?: number | null
          coach_id?: string | null
          created_at?: string | null
          currency?: string | null
          deductions?: number | null
          id?: string
          lessons_count?: number | null
          notes?: string | null
          paid_at?: string | null
          performance_bonus?: number | null
          period_end?: string | null
          period_start?: string | null
          seconding_earnings?: number | null
          status?: string | null
          transport_bonus?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_payroll_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          avg_rating: number | null
          bio: string | null
          class: string | null
          coin_balance: number | null
          created_at: string | null
          current_lat: number | null
          current_lng: number | null
          gps_tracking_active: boolean | null
          has_rayban_meta: boolean | null
          hourly_rate_aed: number | null
          hourly_rate_azn: number | null
          id: string
          is_available_for_seconding: boolean | null
          last_location_update: string | null
          rank: string | null
          rank_frame_style: string | null
          seconding_base_percent: number | null
          specializations: string[] | null
          total_lessons_completed: number | null
        }
        Insert: {
          avg_rating?: number | null
          bio?: string | null
          class?: string | null
          coin_balance?: number | null
          created_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          gps_tracking_active?: boolean | null
          has_rayban_meta?: boolean | null
          hourly_rate_aed?: number | null
          hourly_rate_azn?: number | null
          id: string
          is_available_for_seconding?: boolean | null
          last_location_update?: string | null
          rank?: string | null
          rank_frame_style?: string | null
          seconding_base_percent?: number | null
          specializations?: string[] | null
          total_lessons_completed?: number | null
        }
        Update: {
          avg_rating?: number | null
          bio?: string | null
          class?: string | null
          coin_balance?: number | null
          created_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          gps_tracking_active?: boolean | null
          has_rayban_meta?: boolean | null
          hourly_rate_aed?: number | null
          hourly_rate_azn?: number | null
          id?: string
          is_available_for_seconding?: boolean | null
          last_location_update?: string | null
          rank?: string | null
          rank_frame_style?: string | null
          seconding_base_percent?: number | null
          specializations?: string[] | null
          total_lessons_completed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coaches_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_usages: {
        Row: {
          discount_amount: number | null
          discount_percent: number | null
          discount_type: string | null
          id: string
          parent_id: string | null
          period_key: string | null
          promo_code: string | null
          subscription_id: string | null
          used_at: string | null
        }
        Insert: {
          discount_amount?: number | null
          discount_percent?: number | null
          discount_type?: string | null
          id?: string
          parent_id?: string | null
          period_key?: string | null
          promo_code?: string | null
          subscription_id?: string | null
          used_at?: string | null
        }
        Update: {
          discount_amount?: number | null
          discount_percent?: number | null
          discount_type?: string | null
          id?: string
          parent_id?: string | null
          period_key?: string | null
          promo_code?: string | null
          subscription_id?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_usages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_usages_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          booking_id: string | null
          city: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          direction: string | null
          id: string
          payee_id: string | null
          payer_id: string | null
          payment_method: string | null
          status: string | null
          subscription_id: string | null
          type: string | null
        }
        Insert: {
          amount: number
          booking_id?: string | null
          city?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          direction?: string | null
          id?: string
          payee_id?: string | null
          payer_id?: string | null
          payment_method?: string | null
          status?: string | null
          subscription_id?: string | null
          type?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          city?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          direction?: string | null
          id?: string
          payee_id?: string | null
          payer_id?: string | null
          payment_method?: string | null
          status?: string | null
          subscription_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_payee_id_fkey"
            columns: ["payee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          arrival_note: string | null
          booking_id: string | null
          challenges_note: string | null
          coach_id: string | null
          coach_lesson_rating: number | null
          created_at: string | null
          duration_minutes: number | null
          ended_at: string | null
          handoff_note: string | null
          handoff_person: string | null
          handoff_person_name: string | null
          handoff_time: string | null
          id: string
          main_skills_worked: string[] | null
          mood_energy: string | null
          next_lesson_focus: string | null
          parent_comment: string | null
          parent_rating: number | null
          pm_id: string | null
          pm_summarized_at: string | null
          pm_summary: string | null
          rated_at: string | null
          started_at: string | null
          student_id: string | null
          video_duration_seconds: number | null
          video_expires_at: string | null
          video_saved_permanently: boolean | null
          video_uploaded_at: string | null
          video_url: string | null
          warmup_note: string | null
        }
        Insert: {
          arrival_note?: string | null
          booking_id?: string | null
          challenges_note?: string | null
          coach_id?: string | null
          coach_lesson_rating?: number | null
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          handoff_note?: string | null
          handoff_person?: string | null
          handoff_person_name?: string | null
          handoff_time?: string | null
          id?: string
          main_skills_worked?: string[] | null
          mood_energy?: string | null
          next_lesson_focus?: string | null
          parent_comment?: string | null
          parent_rating?: number | null
          pm_id?: string | null
          pm_summarized_at?: string | null
          pm_summary?: string | null
          rated_at?: string | null
          started_at?: string | null
          student_id?: string | null
          video_duration_seconds?: number | null
          video_expires_at?: string | null
          video_saved_permanently?: boolean | null
          video_uploaded_at?: string | null
          video_url?: string | null
          warmup_note?: string | null
        }
        Update: {
          arrival_note?: string | null
          booking_id?: string | null
          challenges_note?: string | null
          coach_id?: string | null
          coach_lesson_rating?: number | null
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          handoff_note?: string | null
          handoff_person?: string | null
          handoff_person_name?: string | null
          handoff_time?: string | null
          id?: string
          main_skills_worked?: string[] | null
          mood_energy?: string | null
          next_lesson_focus?: string | null
          parent_comment?: string | null
          parent_rating?: number | null
          pm_id?: string | null
          pm_summarized_at?: string | null
          pm_summary?: string | null
          rated_at?: string | null
          started_at?: string | null
          student_id?: string | null
          video_duration_seconds?: number | null
          video_expires_at?: string | null
          video_saved_permanently?: boolean | null
          video_uploaded_at?: string | null
          video_url?: string | null
          warmup_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_pm_id_fkey"
            columns: ["pm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_commissions: {
        Row: {
          active_clients: number | null
          gross_revenue: number | null
          head_manager_earnings: number | null
          head_manager_id: string | null
          head_manager_percent: number | null
          id: string
          manager_earnings: number | null
          manager_id: string | null
          manager_percent: number | null
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          status: string | null
        }
        Insert: {
          active_clients?: number | null
          gross_revenue?: number | null
          head_manager_earnings?: number | null
          head_manager_id?: string | null
          head_manager_percent?: number | null
          id?: string
          manager_earnings?: number | null
          manager_id?: string | null
          manager_percent?: number | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string | null
        }
        Update: {
          active_clients?: number | null
          gross_revenue?: number | null
          head_manager_earnings?: number | null
          head_manager_id?: string | null
          head_manager_percent?: number | null
          id?: string
          manager_earnings?: number | null
          manager_id?: string | null
          manager_percent?: number | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manager_commissions_head_manager_id_fkey"
            columns: ["head_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_commissions_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parents: {
        Row: {
          account_restriction: string | null
          bad_payer_flag: boolean | null
          coin_balance: number | null
          created_at: string | null
          id: string
          loyalty_rank: string | null
          personal_manager_id: string | null
          premium_expires_at: string | null
          referral_code: string | null
          referred_by: string | null
          subscription_tier: string | null
          total_coins_earned: number | null
          video_consent: boolean | null
        }
        Insert: {
          account_restriction?: string | null
          bad_payer_flag?: boolean | null
          coin_balance?: number | null
          created_at?: string | null
          id: string
          loyalty_rank?: string | null
          personal_manager_id?: string | null
          premium_expires_at?: string | null
          referral_code?: string | null
          referred_by?: string | null
          subscription_tier?: string | null
          total_coins_earned?: number | null
          video_consent?: boolean | null
        }
        Update: {
          account_restriction?: string | null
          bad_payer_flag?: boolean | null
          coin_balance?: number | null
          created_at?: string | null
          id?: string
          loyalty_rank?: string | null
          personal_manager_id?: string | null
          premium_expires_at?: string | null
          referral_code?: string | null
          referred_by?: string | null
          subscription_tier?: string | null
          total_coins_earned?: number | null
          video_consent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "parents_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parents_personal_manager_id_fkey"
            columns: ["personal_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parents_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
        ]
      }
      pools: {
        Row: {
          address: string
          city: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_duel_eligible: boolean | null
          lane_fee_per_hour: number | null
          lat: number | null
          lng: number | null
          name: string
          pool_type: string | null
        }
        Insert: {
          address: string
          city?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_duel_eligible?: boolean | null
          lane_fee_per_hour?: number | null
          lat?: number | null
          lng?: number | null
          name: string
          pool_type?: string | null
        }
        Update: {
          address?: string
          city?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_duel_eligible?: boolean | null
          lane_fee_per_hour?: number | null
          lat?: number | null
          lng?: number | null
          name?: string
          pool_type?: string | null
        }
        Relationships: []
      }
      pro_athletes: {
        Row: {
          coin_balance: number | null
          created_at: string | null
          id: string
          losses: number | null
          personal_manager_id: string | null
          pro_rating_points: number | null
          pro_tier: string | null
          subscription_expires_at: string | null
          subscription_tier: string | null
          win_streak: number | null
          wins: number | null
        }
        Insert: {
          coin_balance?: number | null
          created_at?: string | null
          id: string
          losses?: number | null
          personal_manager_id?: string | null
          pro_rating_points?: number | null
          pro_tier?: string | null
          subscription_expires_at?: string | null
          subscription_tier?: string | null
          win_streak?: number | null
          wins?: number | null
        }
        Update: {
          coin_balance?: number | null
          created_at?: string | null
          id?: string
          losses?: number | null
          personal_manager_id?: string | null
          pro_rating_points?: number | null
          pro_tier?: string | null
          subscription_expires_at?: string | null
          subscription_tier?: string | null
          win_streak?: number | null
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pro_athletes_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pro_athletes_personal_manager_id_fkey"
            columns: ["personal_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_personal_records: {
        Row: {
          achieved_at: string | null
          athlete_id: string | null
          created_at: string | null
          distance_meters: number | null
          duel_id: string | null
          fina_points: number | null
          id: string
          is_verified: boolean | null
          swim_style: string | null
          time_ms: number
        }
        Insert: {
          achieved_at?: string | null
          athlete_id?: string | null
          created_at?: string | null
          distance_meters?: number | null
          duel_id?: string | null
          fina_points?: number | null
          id?: string
          is_verified?: boolean | null
          swim_style?: string | null
          time_ms: number
        }
        Update: {
          achieved_at?: string | null
          athlete_id?: string | null
          created_at?: string | null
          distance_meters?: number | null
          duel_id?: string | null
          fina_points?: number | null
          id?: string
          is_verified?: boolean | null
          swim_style?: string | null
          time_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "pro_personal_records_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "pro_athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string | null
          full_name: string
          id: string
          is_active: boolean | null
          language: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          language?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          language?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          combinable: boolean | null
          created_by: string | null
          discount_percent: number | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          used_count: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          combinable?: boolean | null
          created_by?: string | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          combinable?: boolean | null
          created_by?: string | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_assessments: {
        Row: {
          coach_id: string | null
          created_at: string | null
          id: string
          lesson_id: string | null
          level_after: number | null
          level_before: number | null
          notes: string | null
          skill_category: string | null
          skill_name: string
          student_id: string | null
        }
        Insert: {
          coach_id?: string | null
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          level_after?: number | null
          level_before?: number | null
          notes?: string | null
          skill_category?: string | null
          skill_name: string
          student_id?: string | null
        }
        Update: {
          coach_id?: string | null
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          level_after?: number | null
          level_before?: number | null
          notes?: string | null
          skill_category?: string | null
          skill_name?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_assessments_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_assessments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_assessments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          age_group: string | null
          avatar_frame: string | null
          coin_balance: number | null
          created_at: string | null
          current_streak: number | null
          date_of_birth: string | null
          id: string
          longest_streak: number | null
          losses: number | null
          medical_notes: string | null
          parent_id: string | null
          swim_belt: string | null
          swim_belt_earned_at: string | null
          total_coins_earned: number | null
          wins: number | null
        }
        Insert: {
          age_group?: string | null
          avatar_frame?: string | null
          coin_balance?: number | null
          created_at?: string | null
          current_streak?: number | null
          date_of_birth?: string | null
          id: string
          longest_streak?: number | null
          losses?: number | null
          medical_notes?: string | null
          parent_id?: string | null
          swim_belt?: string | null
          swim_belt_earned_at?: string | null
          total_coins_earned?: number | null
          wins?: number | null
        }
        Update: {
          age_group?: string | null
          avatar_frame?: string | null
          coin_balance?: number | null
          created_at?: string | null
          current_streak?: number | null
          date_of_birth?: string | null
          id?: string
          longest_streak?: number | null
          losses?: number | null
          medical_notes?: string | null
          parent_id?: string | null
          swim_belt?: string | null
          swim_belt_earned_at?: string | null
          total_coins_earned?: number | null
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "students_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          city: string | null
          coach_id: string | null
          created_at: string | null
          currency: string | null
          discount_percent: number | null
          discount_types: string[] | null
          expires_at: string | null
          id: string
          original_price: number | null
          package_type: string | null
          parent_id: string | null
          pause_reason: string | null
          paused_at: string | null
          price: number
          starts_at: string | null
          status: string | null
          student_id: string | null
          total_lessons: number | null
          transport_included: boolean | null
          used_lessons: number | null
        }
        Insert: {
          city?: string | null
          coach_id?: string | null
          created_at?: string | null
          currency?: string | null
          discount_percent?: number | null
          discount_types?: string[] | null
          expires_at?: string | null
          id?: string
          original_price?: number | null
          package_type?: string | null
          parent_id?: string | null
          pause_reason?: string | null
          paused_at?: string | null
          price: number
          starts_at?: string | null
          status?: string | null
          student_id?: string | null
          total_lessons?: number | null
          transport_included?: boolean | null
          used_lessons?: number | null
        }
        Update: {
          city?: string | null
          coach_id?: string | null
          created_at?: string | null
          currency?: string | null
          discount_percent?: number | null
          discount_types?: string[] | null
          expires_at?: string | null
          id?: string
          original_price?: number | null
          package_type?: string | null
          parent_id?: string | null
          pause_reason?: string | null
          paused_at?: string | null
          price?: number
          starts_at?: string | null
          status?: string | null
          student_id?: string | null
          total_lessons?: number | null
          transport_included?: boolean | null
          used_lessons?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      time_slots: {
        Row: {
          city: string | null
          coach_id: string | null
          date: string
          end_time: string
          id: string
          start_time: string
          status: string | null
        }
        Insert: {
          city?: string | null
          coach_id?: string | null
          date: string
          end_time: string
          id?: string
          start_time: string
          status?: string | null
        }
        Update: {
          city?: string | null
          coach_id?: string | null
          date?: string
          end_time?: string
          id?: string
          start_time?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_slots_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "head_manager"
        | "personal_manager"
        | "coach"
        | "parent"
        | "student"
        | "pro_athlete"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "head_manager",
        "personal_manager",
        "coach",
        "parent",
        "student",
        "pro_athlete",
      ],
    },
  },
} as const
