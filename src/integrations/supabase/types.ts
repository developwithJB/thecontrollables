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
      ai_conversations: {
        Row: {
          challenge_day: number | null
          challenge_id: string | null
          controllable: string
          created_at: string
          id: string
          messages: Json
          user_id: string
        }
        Insert: {
          challenge_day?: number | null
          challenge_id?: string | null
          controllable: string
          created_at?: string
          id?: string
          messages?: Json
          user_id: string
        }
        Update: {
          challenge_day?: number | null
          challenge_id?: string | null
          controllable?: string
          created_at?: string
          id?: string
          messages?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_participants: {
        Row: {
          certificate_generated_at: string | null
          certificate_storage_path: string | null
          challenge_id: string
          completed_at: string | null
          covenant_accepted: boolean
          covenant_accepted_at: string | null
          id: string
          joined_at: string
          start_date: string | null
          timezone: string | null
          user_id: string
        }
        Insert: {
          certificate_generated_at?: string | null
          certificate_storage_path?: string | null
          challenge_id: string
          completed_at?: string | null
          covenant_accepted?: boolean
          covenant_accepted_at?: string | null
          id?: string
          joined_at?: string
          start_date?: string | null
          timezone?: string | null
          user_id: string
        }
        Update: {
          certificate_generated_at?: string | null
          certificate_storage_path?: string | null
          challenge_id?: string
          completed_at?: string | null
          covenant_accepted?: boolean
          covenant_accepted_at?: string | null
          id?: string
          joined_at?: string
          start_date?: string | null
          timezone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_progress: {
        Row: {
          challenge_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          day_number: number
          id: string
          log_date: string | null
          reflection: string | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          day_number: number
          id?: string
          log_date?: string | null
          reflection?: string | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          day_number?: number
          id?: string
          log_date?: string | null
          reflection?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          covenant_version: number
          created_at: string
          creator_id: string
          duration_days: number
          id: string
          invite_code: string | null
          is_evergreen: boolean
          is_solo: boolean
          name: string
          start_date: string
        }
        Insert: {
          covenant_version?: number
          created_at?: string
          creator_id: string
          duration_days?: number
          id?: string
          invite_code?: string | null
          is_evergreen?: boolean
          is_solo?: boolean
          name?: string
          start_date?: string
        }
        Update: {
          covenant_version?: number
          created_at?: string
          creator_id?: string
          duration_days?: number
          id?: string
          invite_code?: string | null
          is_evergreen?: boolean
          is_solo?: boolean
          name?: string
          start_date?: string
        }
        Relationships: []
      }
      completion_certificates: {
        Row: {
          challenge_id: string
          created_at: string
          end_date: string
          id: string
          start_date: string
          storage_path: string
          timezone: string | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          end_date: string
          id?: string
          start_date: string
          storage_path: string
          timezone?: string | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          end_date?: string
          id?: string
          start_date?: string
          storage_path?: string
          timezone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "completion_certificates_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_checkins: {
        Row: {
          check_in_date: string
          completed: boolean
          created_at: string
          daily_focus: string | null
          id: string
          user_id: string
        }
        Insert: {
          check_in_date?: string
          completed?: boolean
          created_at?: string
          daily_focus?: string | null
          id?: string
          user_id: string
        }
        Update: {
          check_in_date?: string
          completed?: boolean
          created_at?: string
          daily_focus?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_resets: {
        Row: {
          commitment: string | null
          completed_at: string
          created_at: string
          day_number: number
          id: string
          reflection: string | null
          release: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          commitment?: string | null
          completed_at?: string
          created_at?: string
          day_number: number
          id?: string
          reflection?: string | null
          release?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          commitment?: string | null
          completed_at?: string
          created_at?: string
          day_number?: number
          id?: string
          reflection?: string | null
          release?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_resets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "reset_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reset_sessions: {
        Row: {
          completed_at: string | null
          covenant_accepted: boolean
          covenant_accepted_at: string | null
          created_at: string
          current_day: number
          id: string
          invite_code: string | null
          start_date: string
          status: string
          timezone: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          covenant_accepted?: boolean
          covenant_accepted_at?: string | null
          created_at?: string
          current_day?: number
          id?: string
          invite_code?: string | null
          start_date?: string
          status?: string
          timezone?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          covenant_accepted?: boolean
          covenant_accepted_at?: string | null
          created_at?: string
          current_day?: number
          id?: string
          invite_code?: string | null
          start_date?: string
          status?: string
          timezone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wellness_logs: {
        Row: {
          created_at: string
          id: string
          log_date: string
          movement_rating: number | null
          notes: string | null
          nutrition_rating: number | null
          sleep_rating: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_date?: string
          movement_rating?: number | null
          notes?: string | null
          nutrition_rating?: number | null
          sleep_rating?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          movement_rating?: number | null
          notes?: string | null
          nutrition_rating?: number | null
          sleep_rating?: number | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invite_code: { Args: never; Returns: string }
      is_challenge_participant: {
        Args: { _challenge_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
