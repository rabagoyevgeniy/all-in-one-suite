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
