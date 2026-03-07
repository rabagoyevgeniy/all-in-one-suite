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
      achievements: {
        Row: {
          category: string | null
          coin_reward: number | null
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          key: string
          name: string
          target_role: string | null
          unlocks_shop_item_id: string | null
        }
        Insert: {
          category?: string | null
          coin_reward?: number | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          name: string
          target_role?: string | null
          unlocks_shop_item_id?: string | null
        }
        Update: {
          category?: string | null
          coin_reward?: number | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          name?: string
          target_role?: string | null
          unlocks_shop_item_id?: string | null
        }
        Relationships: []
      }
      ai_permissions: {
        Row: {
          allowed_modes: string[] | null
          can_use_ai: boolean
          created_at: string | null
          daily_message_limit: number
          id: string
          role: string
          subscription_tier: string
          updated_at: string | null
        }
        Insert: {
          allowed_modes?: string[] | null
          can_use_ai?: boolean
          created_at?: string | null
          daily_message_limit?: number
          id?: string
          role: string
          subscription_tier?: string
          updated_at?: string | null
        }
        Update: {
          allowed_modes?: string[] | null
          can_use_ai?: boolean
          created_at?: string | null
          daily_message_limit?: number
          id?: string
          role?: string
          subscription_tier?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_usage_log: {
        Row: {
          id: string
          message_count: number
          usage_date: string
          user_id: string
        }
        Insert: {
          id?: string
          message_count?: number
          usage_date?: string
          user_id: string
        }
        Update: {
          id?: string
          message_count?: number
          usage_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          reviewed_at: string | null
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
          reviewed_at?: string | null
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
          reviewed_at?: string | null
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
      chat_members: {
        Row: {
          id: string
          joined_at: string | null
          last_read_at: string | null
          role: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          body: string
          created_at: string | null
          deleted_at: string | null
          edited_at: string | null
          forwarded_from_id: string | null
          forwarded_from_name: string | null
          id: string
          is_edited: boolean
          media_mime_type: string | null
          media_name: string | null
          media_size: number | null
          media_url: string | null
          message_type: string
          reply_to_id: string | null
          room_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          forwarded_from_id?: string | null
          forwarded_from_name?: string | null
          id?: string
          is_edited?: boolean
          media_mime_type?: string | null
          media_name?: string | null
          media_size?: number | null
          media_url?: string | null
          message_type?: string
          reply_to_id?: string | null
          room_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          forwarded_from_id?: string | null
          forwarded_from_name?: string | null
          id?: string
          is_edited?: boolean
          media_mime_type?: string | null
          media_name?: string | null
          media_size?: number | null
          media_url?: string | null
          message_type?: string
          reply_to_id?: string | null
          room_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_forwarded_from_id_fkey"
            columns: ["forwarded_from_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          city: string | null
          community_rules: string[] | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_joinable: boolean | null
          last_message: string | null
          last_message_at: string | null
          member_count: number | null
          name: string | null
          pinned_message_id: string | null
          pinned_message_text: string | null
          request_reason: string | null
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          type: string
          upcoming_event_date: string | null
          upcoming_event_title: string | null
        }
        Insert: {
          city?: string | null
          community_rules?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_joinable?: boolean | null
          last_message?: string | null
          last_message_at?: string | null
          member_count?: number | null
          name?: string | null
          pinned_message_id?: string | null
          pinned_message_text?: string | null
          request_reason?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          type?: string
          upcoming_event_date?: string | null
          upcoming_event_title?: string | null
        }
        Update: {
          city?: string | null
          community_rules?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_joinable?: boolean | null
          last_message?: string | null
          last_message_at?: string | null
          member_count?: number | null
          name?: string | null
          pinned_message_id?: string | null
          pinned_message_text?: string | null
          request_reason?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          type?: string
          upcoming_event_date?: string | null
          upcoming_event_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_pinned_message_id_fkey"
            columns: ["pinned_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          booking_id: string | null
          chat_type: string | null
          created_at: string | null
          id: string
          last_message_at: string | null
          participant_ids: string[]
        }
        Insert: {
          booking_id?: string | null
          chat_type?: string | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_ids: string[]
        }
        Update: {
          booking_id?: string | null
          chat_type?: string | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "chats_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
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
      coin_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string | null
          description: string | null
          id: string
          reference_id: string | null
          transaction_type: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_type?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_type?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coin_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          admin_notes: string | null
          booking_id: string | null
          category: string | null
          created_at: string | null
          description: string
          id: string
          is_visible_to_coach: boolean | null
          reported_coach_id: string | null
          reporter_id: string | null
          resolution: string | null
          resolved_at: string | null
          status: string | null
        }
        Insert: {
          admin_notes?: string | null
          booking_id?: string | null
          category?: string | null
          created_at?: string | null
          description: string
          id?: string
          is_visible_to_coach?: boolean | null
          reported_coach_id?: string | null
          reporter_id?: string | null
          resolution?: string | null
          resolved_at?: string | null
          status?: string | null
        }
        Update: {
          admin_notes?: string | null
          booking_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string
          id?: string
          is_visible_to_coach?: boolean | null
          reported_coach_id?: string | null
          reporter_id?: string | null
          resolution?: string | null
          resolved_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "complaints_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_reported_coach_id_fkey"
            columns: ["reported_coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
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
      duel_comments: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          duel_id: string | null
          id: string
          is_live: boolean | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          duel_id?: string | null
          id?: string
          is_live?: boolean | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          duel_id?: string | null
          id?: string
          is_live?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "duel_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_comments_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_escrow: {
        Row: {
          coins_held: number
          duel_id: string | null
          holder_id: string | null
          id: string
          released_at: string | null
          released_to: string | null
          status: string | null
        }
        Insert: {
          coins_held: number
          duel_id?: string | null
          holder_id?: string | null
          id?: string
          released_at?: string | null
          released_to?: string | null
          status?: string | null
        }
        Update: {
          coins_held?: number
          duel_id?: string | null
          holder_id?: string | null
          id?: string
          released_at?: string | null
          released_to?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duel_escrow_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_escrow_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_escrow_released_to_fkey"
            columns: ["released_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_gifts: {
        Row: {
          coins_cost: number | null
          duel_id: string | null
          gift_type: string | null
          id: string
          recipient_id: string | null
          sender_id: string | null
          sent_at: string | null
        }
        Insert: {
          coins_cost?: number | null
          duel_id?: string | null
          gift_type?: string | null
          id?: string
          recipient_id?: string | null
          sender_id?: string | null
          sent_at?: string | null
        }
        Update: {
          coins_cost?: number | null
          duel_id?: string | null
          gift_type?: string | null
          id?: string
          recipient_id?: string | null
          sender_id?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duel_gifts_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_gifts_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_gifts_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_supporter_bets: {
        Row: {
          coins_bet: number | null
          created_at: string | null
          duel_id: string | null
          id: string
          status: string | null
          supported_participant_id: string | null
          supporter_id: string | null
        }
        Insert: {
          coins_bet?: number | null
          created_at?: string | null
          duel_id?: string | null
          id?: string
          status?: string | null
          supported_participant_id?: string | null
          supporter_id?: string | null
        }
        Update: {
          coins_bet?: number | null
          created_at?: string | null
          duel_id?: string | null
          id?: string
          status?: string | null
          supported_participant_id?: string | null
          supporter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duel_supporter_bets_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_supporter_bets_supported_participant_id_fkey"
            columns: ["supported_participant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_supporter_bets_supporter_id_fkey"
            columns: ["supporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      duels: {
        Row: {
          academy_rake_coins: number | null
          challenger_id: string | null
          challenger_time_ms: number | null
          completed_at: string | null
          created_at: string | null
          distance_meters: number | null
          duel_type: string | null
          highlight_clip_url: string | null
          id: string
          live_stream_active: boolean | null
          live_stream_url: string | null
          opponent_id: string | null
          opponent_time_ms: number | null
          pool_id: string | null
          result_notes: string | null
          scheduled_at: string | null
          second_base_percent: number | null
          second_id: string | null
          second_tip_percent: number | null
          stake_coins: number
          status: string | null
          swim_style: string | null
          viewer_count: number | null
          win_condition: string | null
          winner_id: string | null
        }
        Insert: {
          academy_rake_coins?: number | null
          challenger_id?: string | null
          challenger_time_ms?: number | null
          completed_at?: string | null
          created_at?: string | null
          distance_meters?: number | null
          duel_type?: string | null
          highlight_clip_url?: string | null
          id?: string
          live_stream_active?: boolean | null
          live_stream_url?: string | null
          opponent_id?: string | null
          opponent_time_ms?: number | null
          pool_id?: string | null
          result_notes?: string | null
          scheduled_at?: string | null
          second_base_percent?: number | null
          second_id?: string | null
          second_tip_percent?: number | null
          stake_coins: number
          status?: string | null
          swim_style?: string | null
          viewer_count?: number | null
          win_condition?: string | null
          winner_id?: string | null
        }
        Update: {
          academy_rake_coins?: number | null
          challenger_id?: string | null
          challenger_time_ms?: number | null
          completed_at?: string | null
          created_at?: string | null
          distance_meters?: number | null
          duel_type?: string | null
          highlight_clip_url?: string | null
          id?: string
          live_stream_active?: boolean | null
          live_stream_url?: string | null
          opponent_id?: string | null
          opponent_time_ms?: number | null
          pool_id?: string | null
          result_notes?: string | null
          scheduled_at?: string | null
          second_base_percent?: number | null
          second_id?: string | null
          second_tip_percent?: number | null
          stake_coins?: number
          status?: string | null
          swim_style?: string | null
          viewer_count?: number | null
          win_condition?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duels_challenger_id_fkey"
            columns: ["challenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duels_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duels_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duels_second_id_fkey"
            columns: ["second_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duels_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      economy_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "economy_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      education_videos: {
        Row: {
          category: string | null
          coach_id: string | null
          coin_cost: number
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          thumbnail_url: string | null
          title: string
          video_url: string | null
        }
        Insert: {
          category?: string | null
          coach_id?: string | null
          coin_cost?: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          thumbnail_url?: string | null
          title: string
          video_url?: string | null
        }
        Update: {
          category?: string | null
          coach_id?: string | null
          coin_cost?: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          thumbnail_url?: string | null
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "education_videos_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      education_views: {
        Row: {
          coins_paid: number
          id: string
          user_id: string
          video_id: string | null
          viewed_at: string | null
        }
        Insert: {
          coins_paid?: number
          id?: string
          user_id: string
          video_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          coins_paid?: number
          id?: string
          user_id?: string
          video_id?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "education_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "education_views_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "education_videos"
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
      lesson_reviews: {
        Row: {
          booking_id: string
          coach_id: string
          comment: string | null
          created_at: string | null
          id: string
          parent_id: string
          rating: number
        }
        Insert: {
          booking_id: string
          coach_id: string
          comment?: string | null
          created_at?: string | null
          id?: string
          parent_id: string
          rating: number
        }
        Update: {
          booking_id?: string
          coach_id?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          parent_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_reviews_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
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
      manager_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          client_id: string | null
          id: string
          is_active: boolean | null
          manager_id: string | null
          monthly_revenue: number | null
          notes: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          client_id?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          monthly_revenue?: number | null
          notes?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          client_id?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          monthly_revenue?: number | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manager_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_assignments_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      messages: {
        Row: {
          attachment_url: string | null
          chat_id: string | null
          content: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message_type: string | null
          read_at: string | null
          sender_id: string | null
        }
        Insert: {
          attachment_url?: string | null
          chat_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          read_at?: string | null
          sender_id?: string | null
        }
        Update: {
          attachment_url?: string | null
          chat_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          read_at?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          id: string
          is_read: boolean | null
          reference_id: string | null
          sent_at: string | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          body: string
          id?: string
          is_read?: boolean | null
          reference_id?: string | null
          sent_at?: string | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string
          id?: string
          is_read?: boolean | null
          reference_id?: string | null
          sent_at?: string | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
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
      pricing_plans: {
        Row: {
          badge: string | null
          city: string
          created_at: string | null
          currency: string
          description: string | null
          discount_percent: number | null
          features: string[] | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_subscription: boolean | null
          is_test: boolean | null
          is_trial: boolean | null
          lesson_count: number | null
          lesson_type: string | null
          lessons_included: number | null
          name: string
          original_price: number | null
          plan_key: string
          price: number
          price_per_lesson: number | null
          saving_percent: number | null
          sort_order: number | null
          stripe_payment_link: string | null
          target_customer: string | null
          updated_at: string | null
        }
        Insert: {
          badge?: string | null
          city?: string
          created_at?: string | null
          currency?: string
          description?: string | null
          discount_percent?: number | null
          features?: string[] | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_subscription?: boolean | null
          is_test?: boolean | null
          is_trial?: boolean | null
          lesson_count?: number | null
          lesson_type?: string | null
          lessons_included?: number | null
          name: string
          original_price?: number | null
          plan_key: string
          price?: number
          price_per_lesson?: number | null
          saving_percent?: number | null
          sort_order?: number | null
          stripe_payment_link?: string | null
          target_customer?: string | null
          updated_at?: string | null
        }
        Update: {
          badge?: string | null
          city?: string
          created_at?: string | null
          currency?: string
          description?: string | null
          discount_percent?: number | null
          features?: string[] | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_subscription?: boolean | null
          is_test?: boolean | null
          is_trial?: boolean | null
          lesson_count?: number | null
          lesson_type?: string | null
          lessons_included?: number | null
          name?: string
          original_price?: number | null
          plan_key?: string
          price?: number
          price_per_lesson?: number | null
          saving_percent?: number | null
          sort_order?: number | null
          stripe_payment_link?: string | null
          target_customer?: string | null
          updated_at?: string | null
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
      store_items: {
        Row: {
          category: string | null
          combinable_with_discounts: boolean | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_limited: boolean | null
          max_per_user_per_period: number | null
          name: string
          period_type: string | null
          price_aed: number | null
          price_coins: number | null
          requires_achievement_id: string | null
          requires_rank: string | null
          sort_order: number | null
          stock_count: number | null
          store_type: string | null
        }
        Insert: {
          category?: string | null
          combinable_with_discounts?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_limited?: boolean | null
          max_per_user_per_period?: number | null
          name: string
          period_type?: string | null
          price_aed?: number | null
          price_coins?: number | null
          requires_achievement_id?: string | null
          requires_rank?: string | null
          sort_order?: number | null
          stock_count?: number | null
          store_type?: string | null
        }
        Update: {
          category?: string | null
          combinable_with_discounts?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_limited?: boolean | null
          max_per_user_per_period?: number | null
          name?: string
          period_type?: string | null
          price_aed?: number | null
          price_coins?: number | null
          requires_achievement_id?: string | null
          requires_rank?: string | null
          sort_order?: number | null
          stock_count?: number | null
          store_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_items_requires_achievement_id_fkey"
            columns: ["requires_achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      store_purchases: {
        Row: {
          aed_paid: number | null
          coins_paid: number | null
          created_at: string | null
          delivery_address: string | null
          id: string
          item_id: string | null
          period_key: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          aed_paid?: number | null
          coins_paid?: number | null
          created_at?: string | null
          delivery_address?: string | null
          id?: string
          item_id?: string | null
          period_key?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          aed_paid?: number | null
          coins_paid?: number | null
          created_at?: string | null
          delivery_address?: string | null
          id?: string
          item_id?: string | null
          period_key?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_purchases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "store_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          penalty_applied: boolean | null
          price: number
          starts_at: string | null
          status: string | null
          student_id: string | null
          total_lessons: number | null
          transport_included: boolean | null
          used_lessons: number | null
          warnings_sent: number[] | null
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
          penalty_applied?: boolean | null
          price: number
          starts_at?: string | null
          status?: string | null
          student_id?: string | null
          total_lessons?: number | null
          transport_included?: boolean | null
          used_lessons?: number | null
          warnings_sent?: number[] | null
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
          penalty_applied?: boolean | null
          price?: number
          starts_at?: string | null
          status?: string | null
          student_id?: string | null
          total_lessons?: number | null
          transport_included?: boolean | null
          used_lessons?: number | null
          warnings_sent?: number[] | null
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
      task_assignments: {
        Row: {
          admin_notes: string | null
          assigned_by: string
          assigned_to: string
          coin_reward: number
          completed_at: string | null
          created_at: string
          description: string | null
          evaluated_at: string | null
          id: string
          status: string
          title: string
          xp_reward: number
        }
        Insert: {
          admin_notes?: string | null
          assigned_by: string
          assigned_to: string
          coin_reward?: number
          completed_at?: string | null
          created_at?: string
          description?: string | null
          evaluated_at?: string | null
          id?: string
          status?: string
          title: string
          xp_reward?: number
        }
        Update: {
          admin_notes?: string | null
          assigned_by?: string
          assigned_to?: string
          coin_reward?: number
          completed_at?: string | null
          created_at?: string
          description?: string | null
          evaluated_at?: string | null
          id?: string
          status?: string
          title?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_completions: {
        Row: {
          coins_awarded: number | null
          completed_at: string | null
          id: string
          period_key: string | null
          proof_url: string | null
          task_id: string | null
          user_id: string | null
        }
        Insert: {
          coins_awarded?: number | null
          completed_at?: string | null
          id?: string
          period_key?: string | null
          proof_url?: string | null
          task_id?: string | null
          user_id?: string | null
        }
        Update: {
          coins_awarded?: number | null
          completed_at?: string | null
          id?: string
          period_key?: string | null
          proof_url?: string | null
          task_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "task_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_definitions: {
        Row: {
          coin_reward: number
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          key: string
          reset_period: string | null
          target_role: string | null
          task_type: string | null
          title: string
          verification_type: string | null
        }
        Insert: {
          coin_reward: number
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          reset_period?: string | null
          target_role?: string | null
          task_type?: string | null
          title: string
          verification_type?: string | null
        }
        Update: {
          coin_reward?: number
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          reset_period?: string | null
          target_role?: string | null
          task_type?: string | null
          title?: string
          verification_type?: string | null
        }
        Relationships: []
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
      training_plans: {
        Row: {
          coach_instructions: string | null
          completion_percent: number | null
          created_at: string | null
          created_by: string | null
          goals: string[] | null
          id: string
          parent_notes: string | null
          sessions: Json | null
          status: string | null
          student_id: string | null
          week_end: string | null
          week_start: string | null
        }
        Insert: {
          coach_instructions?: string | null
          completion_percent?: number | null
          created_at?: string | null
          created_by?: string | null
          goals?: string[] | null
          id?: string
          parent_notes?: string | null
          sessions?: Json | null
          status?: string | null
          student_id?: string | null
          week_end?: string | null
          week_start?: string | null
        }
        Update: {
          coach_instructions?: string | null
          completion_percent?: number | null
          created_at?: string | null
          created_by?: string | null
          goals?: string[] | null
          id?: string
          parent_notes?: string | null
          sessions?: Json | null
          status?: string | null
          student_id?: string | null
          week_end?: string | null
          week_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      training_requests: {
        Row: {
          booking_id: string | null
          city: string | null
          coins_cost: number | null
          created_at: string | null
          id: string
          partner_id: string | null
          preferred_coach_id: string | null
          preferred_date: string | null
          requester_id: string | null
          status: string | null
          swim_style: string | null
        }
        Insert: {
          booking_id?: string | null
          city?: string | null
          coins_cost?: number | null
          created_at?: string | null
          id?: string
          partner_id?: string | null
          preferred_coach_id?: string | null
          preferred_date?: string | null
          requester_id?: string | null
          status?: string | null
          swim_style?: string | null
        }
        Update: {
          booking_id?: string | null
          city?: string | null
          coins_cost?: number | null
          created_at?: string | null
          id?: string
          partner_id?: string | null
          preferred_coach_id?: string | null
          preferred_date?: string | null
          requester_id?: string | null
          status?: string | null
          swim_style?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_requests_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_requests_preferred_coach_id_fkey"
            columns: ["preferred_coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string | null
          earned_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          achievement_id?: string | null
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          achievement_id?: string | null
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      admin_dashboard_stats: {
        Row: {
          active_coaches: number | null
          active_subscriptions: number | null
          bookings_today: number | null
          completed_today: number | null
          pending_complaints: number | null
          revenue_today_aed: number | null
          revenue_today_azn: number | null
          total_parents: number | null
          total_students: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_initial_role: { Args: { _role: string }; Returns: undefined }
      create_direct_chat: { Args: { other_user_id: string }; Returns: string }
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
      increment_used_lessons: {
        Args: { p_student_id: string }
        Returns: undefined
      }
      is_chat_member: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      is_public_chat_room: { Args: { _room_id: string }; Returns: boolean }
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
