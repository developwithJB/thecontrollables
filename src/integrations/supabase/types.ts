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
      ai_usage_logs: {
        Row: {
          created_at: string
          id: string
          message_count: number
          updated_at: string
          usage_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_count?: number
          updated_at?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_count?: number
          updated_at?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      app_analytics: {
        Row: {
          created_at: string
          dimensions: Json | null
          id: string
          metric_name: string
          metric_type: string
          metric_value: number | null
          period_end: string
          period_start: string
        }
        Insert: {
          created_at?: string
          dimensions?: Json | null
          id?: string
          metric_name: string
          metric_type: string
          metric_value?: number | null
          period_end: string
          period_start: string
        }
        Update: {
          created_at?: string
          dimensions?: Json | null
          id?: string
          metric_name?: string
          metric_type?: string
          metric_value?: number | null
          period_end?: string
          period_start?: string
        }
        Relationships: []
      }
      app_errors: {
        Row: {
          additional_context: Json | null
          component_name: string | null
          created_at: string
          error_message: string
          error_stack: string | null
          error_type: string | null
          id: string
          page_path: string | null
          resolved: boolean | null
          resolved_at: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          additional_context?: Json | null
          component_name?: string | null
          created_at?: string
          error_message: string
          error_stack?: string | null
          error_type?: string | null
          id?: string
          page_path?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          additional_context?: Json | null
          component_name?: string | null
          created_at?: string
          error_message?: string
          error_stack?: string | null
          error_type?: string | null
          id?: string
          page_path?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_name: string
          event_type: string
          id: string
          page_path: string | null
          screen_size: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_name: string
          event_type: string
          id?: string
          page_path?: string | null
          screen_size?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_name?: string
          event_type?: string
          id?: string
          page_path?: string | null
          screen_size?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      build_answers: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          question_id: string
          score: number
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          question_id: string
          score: number
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          question_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "build_answers_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "build_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "build_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      build_assessments: {
        Row: {
          id: string
          period_days: number
          submitted_at: string
          user_id: string
        }
        Insert: {
          id?: string
          period_days?: number
          submitted_at?: string
          user_id: string
        }
        Update: {
          id?: string
          period_days?: number
          submitted_at?: string
          user_id?: string
        }
        Relationships: []
      }
      build_questions: {
        Row: {
          controllable: string
          created_at: string
          id: string
          is_active: boolean
          order_index: number
          prompt: string
          question_key: string
        }
        Insert: {
          controllable: string
          created_at?: string
          id?: string
          is_active?: boolean
          order_index: number
          prompt: string
          question_key: string
        }
        Update: {
          controllable?: string
          created_at?: string
          id?: string
          is_active?: boolean
          order_index?: number
          prompt?: string
          question_key?: string
        }
        Relationships: []
      }
      build_scores: {
        Row: {
          assessment_id: string
          awareness: number
          build_archetype_key: string
          computed_at: string
          environment: number
          habit: number
          id: string
          overall: number
          perspective: number
          user_id: string
          wellness: number
        }
        Insert: {
          assessment_id: string
          awareness: number
          build_archetype_key: string
          computed_at?: string
          environment: number
          habit: number
          id?: string
          overall: number
          perspective: number
          user_id: string
          wellness: number
        }
        Update: {
          assessment_id?: string
          awareness?: number
          build_archetype_key?: string
          computed_at?: string
          environment?: number
          habit?: number
          id?: string
          overall?: number
          perspective?: number
          user_id?: string
          wellness?: number
        }
        Relationships: [
          {
            foreignKeyName: "build_scores_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: true
            referencedRelation: "build_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          badges_earned: Json | null
          certificate_url: string | null
          created_at: string | null
          display_name: string
          end_date: string
          id: string
          level: number | null
          reset_session_id: string
          start_date: string
          total_xp: number | null
          user_id: string
        }
        Insert: {
          badges_earned?: Json | null
          certificate_url?: string | null
          created_at?: string | null
          display_name: string
          end_date: string
          id?: string
          level?: number | null
          reset_session_id: string
          start_date: string
          total_xp?: number | null
          user_id: string
        }
        Update: {
          badges_earned?: Json | null
          certificate_url?: string | null
          created_at?: string | null
          display_name?: string
          end_date?: string
          id?: string
          level?: number | null
          reset_session_id?: string
          start_date?: string
          total_xp?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_reset_session_id_fkey"
            columns: ["reset_session_id"]
            isOneToOne: true
            referencedRelation: "reset_sessions"
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
      completed_actions: {
        Row: {
          action_text: string
          completed_at: string
          controllable: string | null
          created_at: string
          id: string
          user_id: string
          xp_awarded: number
        }
        Insert: {
          action_text: string
          completed_at?: string
          controllable?: string | null
          created_at?: string
          id?: string
          user_id: string
          xp_awarded?: number
        }
        Update: {
          action_text?: string
          completed_at?: string
          controllable?: string | null
          created_at?: string
          id?: string
          user_id?: string
          xp_awarded?: number
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
        Relationships: []
      }
      daily_alignment_logs: {
        Row: {
          created_at: string
          generated_content: Json
          id: string
          nudge_date: string
          scripture_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          generated_content?: Json
          id?: string
          nudge_date: string
          scripture_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          generated_content?: Json
          id?: string
          nudge_date?: string
          scripture_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_alignment_logs_scripture_id_fkey"
            columns: ["scripture_id"]
            isOneToOne: false
            referencedRelation: "daily_scriptures"
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
      daily_readings: {
        Row: {
          completion_button_text: string
          control_line: string
          controllable: string
          created_at: string
          day_number: number
          emoji: string
          framing_line: string
          id: string
          integrity_rep: string
          prompt: string
          quest_action: string
          reading_chapter: string
          reading_source: string
          reading_text: string
          reflection: string
          surrender_line: string
          updated_at: string
        }
        Insert: {
          completion_button_text: string
          control_line: string
          controllable: string
          created_at?: string
          day_number: number
          emoji: string
          framing_line: string
          id?: string
          integrity_rep: string
          prompt: string
          quest_action: string
          reading_chapter: string
          reading_source?: string
          reading_text: string
          reflection: string
          surrender_line: string
          updated_at?: string
        }
        Update: {
          completion_button_text?: string
          control_line?: string
          controllable?: string
          created_at?: string
          day_number?: number
          emoji?: string
          framing_line?: string
          id?: string
          integrity_rep?: string
          prompt?: string
          quest_action?: string
          reading_chapter?: string
          reading_source?: string
          reading_text?: string
          reflection?: string
          surrender_line?: string
          updated_at?: string
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
      daily_scriptures: {
        Row: {
          created_at: string
          id: string
          rotation_order: number
          theme_tag: string
          verse_reference: string
          verse_text: string
        }
        Insert: {
          created_at?: string
          id?: string
          rotation_order: number
          theme_tag: string
          verse_reference: string
          verse_text: string
        }
        Update: {
          created_at?: string
          id?: string
          rotation_order?: number
          theme_tag?: string
          verse_reference?: string
          verse_text?: string
        }
        Relationships: []
      }
      email_nudge_logs: {
        Row: {
          created_at: string
          id: string
          nudge_date: string
          sent_at: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nudge_date: string
          sent_at?: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nudge_date?: string
          sent_at?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      guide_sessions: {
        Row: {
          context: string | null
          created_at: string
          id: string
          messages: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          id?: string
          messages?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          context?: string | null
          created_at?: string
          id?: string
          messages?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      integrity_logs: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          kept: boolean | null
          kept_at: string | null
          promise_text: string
          promised_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          kept?: boolean | null
          kept_at?: string | null
          promise_text: string
          promised_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          kept?: boolean | null
          kept_at?: string | null
          promise_text?: string
          promised_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journey_changes: {
        Row: {
          changed_on_day: number
          created_at: string
          id: string
          new_journey_id: string
          previous_journey_id: string | null
          reason: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          changed_on_day: number
          created_at?: string
          id?: string
          new_journey_id: string
          previous_journey_id?: string | null
          reason?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          changed_on_day?: number
          created_at?: string
          id?: string
          new_journey_id?: string
          previous_journey_id?: string | null
          reason?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_changes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "reset_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      main_quests: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_days: number
          ends_at: string | null
          id: string
          started_at: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_days?: number
          ends_at?: string | null
          id?: string
          started_at?: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_days?: number
          ends_at?: string | null
          id?: string
          started_at?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          id: string
          load_time_ms: number | null
          page_path: string
          referrer: string | null
          screen_size: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          load_time_ms?: number | null
          page_path: string
          referrer?: string | null
          screen_size?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          load_time_ms?: number | null
          page_path?: string
          referrer?: string | null
          screen_size?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email_nudge_enabled: boolean | null
          email_nudge_time: string | null
          id: string
          nudge_frequency: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email_nudge_enabled?: boolean | null
          email_nudge_time?: string | null
          id: string
          nudge_frequency?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email_nudge_enabled?: boolean | null
          email_nudge_time?: string | null
          id?: string
          nudge_frequency?: string | null
          timezone?: string | null
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
          foundation_level: number | null
          id: string
          invite_code: string | null
          is_maintenance_mode: boolean | null
          journey_changed_at: string | null
          journey_id: string | null
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
          foundation_level?: number | null
          id?: string
          invite_code?: string | null
          is_maintenance_mode?: boolean | null
          journey_changed_at?: string | null
          journey_id?: string | null
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
          foundation_level?: number | null
          id?: string
          invite_code?: string | null
          is_maintenance_mode?: boolean | null
          journey_changed_at?: string | null
          journey_id?: string | null
          start_date?: string
          status?: string
          timezone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      time_logs: {
        Row: {
          created_at: string
          id: string
          log_date: string
          notes: string | null
          time_invested_minutes: number | null
          time_wasted_minutes: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_date?: string
          notes?: string | null
          time_invested_minutes?: number | null
          time_wasted_minutes?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          notes?: string | null
          time_invested_minutes?: number | null
          time_wasted_minutes?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_key: string
          created_at: string
          earned_at: string
          id: string
          trigger_context: Json | null
          user_id: string
        }
        Insert: {
          badge_key: string
          created_at?: string
          earned_at?: string
          id?: string
          trigger_context?: Json | null
          user_id: string
        }
        Update: {
          badge_key?: string
          created_at?: string
          earned_at?: string
          id?: string
          trigger_context?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_build_current: {
        Row: {
          awareness: number
          build_archetype_key: string | null
          environment: number
          habit: number
          last_assessment_id: string | null
          overall: number
          perspective: number
          updated_at: string
          user_id: string
          wellness: number
        }
        Insert: {
          awareness?: number
          build_archetype_key?: string | null
          environment?: number
          habit?: number
          last_assessment_id?: string | null
          overall?: number
          perspective?: number
          updated_at?: string
          user_id: string
          wellness?: number
        }
        Update: {
          awareness?: number
          build_archetype_key?: string | null
          environment?: number
          habit?: number
          last_assessment_id?: string | null
          overall?: number
          perspective?: number
          updated_at?: string
          user_id?: string
          wellness?: number
        }
        Relationships: []
      }
      user_builds: {
        Row: {
          awareness_base: number | null
          created_at: string
          environment_base: number | null
          environment_modifier: number | null
          habit_base: number | null
          id: string
          inputs_modifier: number | null
          movement_modifier: number | null
          perspective_base: number | null
          sleep_modifier: number | null
          updated_at: string
          user_id: string
          wellness_base: number | null
        }
        Insert: {
          awareness_base?: number | null
          created_at?: string
          environment_base?: number | null
          environment_modifier?: number | null
          habit_base?: number | null
          id?: string
          inputs_modifier?: number | null
          movement_modifier?: number | null
          perspective_base?: number | null
          sleep_modifier?: number | null
          updated_at?: string
          user_id: string
          wellness_base?: number | null
        }
        Update: {
          awareness_base?: number | null
          created_at?: string
          environment_base?: number | null
          environment_modifier?: number | null
          habit_base?: number | null
          id?: string
          inputs_modifier?: number | null
          movement_modifier?: number | null
          perspective_base?: number | null
          sleep_modifier?: number | null
          updated_at?: string
          user_id?: string
          wellness_base?: number | null
        }
        Relationships: []
      }
      user_entitlements: {
        Row: {
          created_at: string
          entitlement_type: string
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          plan_tier: string | null
          source: string
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          entitlement_type?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          plan_tier?: string | null
          source: string
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          entitlement_type?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          plan_tier?: string | null
          source?: string
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_onboarding: {
        Row: {
          build_assessment_completed: boolean | null
          build_assessment_completed_at: string | null
          created_at: string
          features_unlocked: Json | null
          first_action_completed_at: string | null
          first_action_type: string | null
          journey_controllable: string | null
          journey_selected_at: string | null
          onboarding_step: string | null
          simplified_mode_completed: boolean
          user_id: string
          welcome_foundation_progress: Json | null
        }
        Insert: {
          build_assessment_completed?: boolean | null
          build_assessment_completed_at?: string | null
          created_at?: string
          features_unlocked?: Json | null
          first_action_completed_at?: string | null
          first_action_type?: string | null
          journey_controllable?: string | null
          journey_selected_at?: string | null
          onboarding_step?: string | null
          simplified_mode_completed?: boolean
          user_id: string
          welcome_foundation_progress?: Json | null
        }
        Update: {
          build_assessment_completed?: boolean | null
          build_assessment_completed_at?: string | null
          created_at?: string
          features_unlocked?: Json | null
          first_action_completed_at?: string | null
          first_action_type?: string | null
          journey_controllable?: string | null
          journey_selected_at?: string | null
          onboarding_step?: string | null
          simplified_mode_completed?: boolean
          user_id?: string
          welcome_foundation_progress?: Json | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
      xp_logs: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          source: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          source: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_admin: { Args: { admin_user_id: string }; Returns: boolean }
      compute_build_scores: {
        Args: { p_assessment_id: string }
        Returns: {
          assessment_id: string
          awareness: number
          build_archetype_key: string
          computed_at: string
          environment: number
          habit: number
          id: string
          overall: number
          perspective: number
          user_id: string
          wellness: number
        }
        SetofOptions: {
          from: "*"
          to: "build_scores"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_invite_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_challenge_participant: {
        Args: { _challenge_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
