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
      admin_broadcasts: {
        Row: {
          body_html: string
          created_at: string
          id: string
          recipient_count: number
          segment_emails: string[] | null
          segment_type: string
          sent_at: string
          sent_by: string
          subject: string
          template_key: string
        }
        Insert: {
          body_html: string
          created_at?: string
          id?: string
          recipient_count?: number
          segment_emails?: string[] | null
          segment_type: string
          sent_at?: string
          sent_by: string
          subject: string
          template_key?: string
        }
        Update: {
          body_html?: string
          created_at?: string
          id?: string
          recipient_count?: number
          segment_emails?: string[] | null
          segment_type?: string
          sent_at?: string
          sent_by?: string
          subject?: string
          template_key?: string
        }
        Relationships: []
      }
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
      automation_run_steps: {
        Row: {
          affected_system: string
          completed_at: string | null
          error_message: string | null
          id: string
          result: Json | null
          run_id: string
          started_at: string | null
          status: string
          step_key: string
        }
        Insert: {
          affected_system: string
          completed_at?: string | null
          error_message?: string | null
          id?: string
          result?: Json | null
          run_id: string
          started_at?: string | null
          status?: string
          step_key: string
        }
        Update: {
          affected_system?: string
          completed_at?: string | null
          error_message?: string | null
          id?: string
          result?: Json | null
          run_id?: string
          started_at?: string | null
          status?: string
          step_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_run_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "automation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          inputs: Json | null
          recipe_key: string
          result: Json | null
          started_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          inputs?: Json | null
          recipe_key: string
          result?: Json | null
          started_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          inputs?: Json | null
          recipe_key?: string
          result?: Json | null
          started_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      budget_buckets: {
        Row: {
          bucket_name: string
          bucket_type: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          monthly_target: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bucket_name: string
          bucket_type?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          monthly_target?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bucket_name?: string
          bucket_type?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          monthly_target?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_buckets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          certificate_type: string | null
          certificate_url: string | null
          created_at: string | null
          display_name: string
          end_date: string
          id: string
          level: number | null
          reflection_text: string | null
          reset_session_id: string | null
          season_id: string | null
          start_date: string
          total_xp: number | null
          user_id: string
        }
        Insert: {
          badges_earned?: Json | null
          certificate_type?: string | null
          certificate_url?: string | null
          created_at?: string | null
          display_name: string
          end_date: string
          id?: string
          level?: number | null
          reflection_text?: string | null
          reset_session_id?: string | null
          season_id?: string | null
          start_date: string
          total_xp?: number | null
          user_id: string
        }
        Update: {
          badges_earned?: Json | null
          certificate_type?: string | null
          certificate_url?: string | null
          created_at?: string | null
          display_name?: string
          end_date?: string
          id?: string
          level?: number | null
          reflection_text?: string | null
          reset_session_id?: string | null
          season_id?: string | null
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
          {
            foreignKeyName: "certificates_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
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
          display_name: string | null
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
          display_name?: string | null
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
          display_name?: string | null
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
          journey_id: string | null
          max_members: number
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
          journey_id?: string | null
          max_members?: number
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
          journey_id?: string | null
          max_members?: number
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
      daily_briefings: {
        Row: {
          briefing_date: string
          content: string
          controllable: string | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          briefing_date?: string
          content: string
          controllable?: string | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          briefing_date?: string
          content?: string
          controllable?: string | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
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
      daily_os_plans: {
        Row: {
          created_at: string
          id: string
          interactions: Json
          plan_data: Json
          plan_date: string
          refresh_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interactions?: Json
          plan_data?: Json
          plan_date?: string
          refresh_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interactions?: Json
          plan_data?: Json
          plan_date?: string
          refresh_count?: number
          updated_at?: string
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
      daily_rings: {
        Row: {
          align_completed: boolean
          align_response: string | null
          charge_completed: boolean
          charge_response: string | null
          choose_completed: boolean
          choose_response: string | null
          created_at: string
          daily_recap: string | null
          id: string
          notice_completed: boolean
          notice_response: string | null
          prove_completed: boolean
          prove_response: string | null
          ring_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          align_completed?: boolean
          align_response?: string | null
          charge_completed?: boolean
          charge_response?: string | null
          choose_completed?: boolean
          choose_response?: string | null
          created_at?: string
          daily_recap?: string | null
          id?: string
          notice_completed?: boolean
          notice_response?: string | null
          prove_completed?: boolean
          prove_response?: string | null
          ring_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          align_completed?: boolean
          align_response?: string | null
          charge_completed?: boolean
          charge_response?: string | null
          choose_completed?: boolean
          choose_response?: string | null
          created_at?: string
          daily_recap?: string | null
          id?: string
          notice_completed?: boolean
          notice_response?: string | null
          prove_completed?: boolean
          prove_response?: string | null
          ring_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      daily_synthesis: {
        Row: {
          created_at: string | null
          id: string
          project_id: string | null
          synthesis_date: string
          synthesis_text: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id?: string | null
          synthesis_date: string
          synthesis_text: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string | null
          synthesis_date?: string
          synthesis_text?: string
          user_id?: string
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
      environment_resets: {
        Row: {
          action_type: string
          category: string
          created_at: string
          draining: string | null
          energizing: string | null
          id: string
          note: string | null
          reset_date: string
          user_id: string
        }
        Insert: {
          action_type: string
          category: string
          created_at?: string
          draining?: string | null
          energizing?: string | null
          id?: string
          note?: string | null
          reset_date?: string
          user_id: string
        }
        Update: {
          action_type?: string
          category?: string
          created_at?: string
          draining?: string | null
          energizing?: string | null
          id?: string
          note?: string | null
          reset_date?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_accounts: {
        Row: {
          account_name: string
          account_number_last4: string | null
          account_type: string
          bank_connection_id: string | null
          created_at: string | null
          current_balance: number | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_name: string
          account_number_last4?: string | null
          account_type: string
          bank_connection_id?: string | null
          created_at?: string | null
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_name?: string
          account_number_last4?: string | null
          account_type?: string
          bank_connection_id?: string | null
          created_at?: string | null
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      health_sync_data: {
        Row: {
          active_minutes: number | null
          attributed_project_ids: string[] | null
          created_at: string
          heart_rate_avg: number | null
          hrv_ms: number | null
          id: string
          project_id: string | null
          raw_data: Json | null
          recovery_score: number | null
          sleep_minutes: number | null
          source: string
          steps: number | null
          strain_score: number | null
          sync_date: string
          synced_at: string
          user_id: string
        }
        Insert: {
          active_minutes?: number | null
          attributed_project_ids?: string[] | null
          created_at?: string
          heart_rate_avg?: number | null
          hrv_ms?: number | null
          id?: string
          project_id?: string | null
          raw_data?: Json | null
          recovery_score?: number | null
          sleep_minutes?: number | null
          source?: string
          steps?: number | null
          strain_score?: number | null
          sync_date: string
          synced_at?: string
          user_id: string
        }
        Update: {
          active_minutes?: number | null
          attributed_project_ids?: string[] | null
          created_at?: string
          heart_rate_avg?: number | null
          hrv_ms?: number | null
          id?: string
          project_id?: string | null
          raw_data?: Json | null
          recovery_score?: number | null
          sleep_minutes?: number | null
          source?: string
          steps?: number | null
          strain_score?: number | null
          sync_date?: string
          synced_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_sync_data_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_proof_entries: {
        Row: {
          ai_interpretation: string | null
          attached_to_ring: boolean
          caption_text: string | null
          created_at: string
          id: string
          image_url: string | null
          ring_key: string
          source_type: string
          tags: string[] | null
          user_id: string
        }
        Insert: {
          ai_interpretation?: string | null
          attached_to_ring?: boolean
          caption_text?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          ring_key: string
          source_type: string
          tags?: string[] | null
          user_id: string
        }
        Update: {
          ai_interpretation?: string | null
          attached_to_ring?: boolean
          caption_text?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          ring_key?: string
          source_type?: string
          tags?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      integration_connections: {
        Row: {
          access_token: string | null
          created_at: string | null
          error_message: string | null
          id: string
          last_synced_at: string | null
          metadata: Json | null
          provider: string
          provider_account_id: string | null
          refresh_token: string | null
          scopes: string[] | null
          status: string
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_synced_at?: string | null
          metadata?: Json | null
          provider: string
          provider_account_id?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_synced_at?: string | null
          metadata?: Json | null
          provider?: string
          provider_account_id?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      integration_sync_logs: {
        Row: {
          completed_at: string | null
          connection_id: string
          error_message: string | null
          id: string
          items_created: number | null
          items_processed: number | null
          items_skipped: number | null
          items_updated: number | null
          metadata: Json | null
          provider: string
          started_at: string | null
          status: string
          sync_type: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          connection_id: string
          error_message?: string | null
          id?: string
          items_created?: number | null
          items_processed?: number | null
          items_skipped?: number | null
          items_updated?: number | null
          metadata?: Json | null
          provider: string
          started_at?: string | null
          status: string
          sync_type: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          connection_id?: string
          error_message?: string | null
          id?: string
          items_created?: number | null
          items_processed?: number | null
          items_skipped?: number | null
          items_updated?: number | null
          metadata?: Json | null
          provider?: string
          started_at?: string | null
          status?: string
          sync_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
        ]
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
      meal_logs: {
        Row: {
          ai_analysis: Json | null
          created_at: string
          description: string | null
          id: string
          image_path: string | null
          log_date: string
          meal_type: string
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          log_date?: string
          meal_type: string
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          log_date?: string
          meal_type?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          created_at: string
          generated_by: string | null
          id: string
          meals: Json
          plan_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          generated_by?: string | null
          id?: string
          meals?: Json
          plan_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          generated_by?: string | null
          id?: string
          meals?: Json
          plan_date?: string
          user_id?: string
        }
        Relationships: []
      }
      notice_entries: {
        Row: {
          created_at: string
          dominant_emotion: string | null
          energy_level: number
          entry_date: string
          id: string
          interpretation: string | null
          mood: string
          note: string | null
          stress_level: number
          user_id: string
        }
        Insert: {
          created_at?: string
          dominant_emotion?: string | null
          energy_level: number
          entry_date?: string
          id?: string
          interpretation?: string | null
          mood: string
          note?: string | null
          stress_level: number
          user_id: string
        }
        Update: {
          created_at?: string
          dominant_emotion?: string | null
          energy_level?: number
          entry_date?: string
          id?: string
          interpretation?: string | null
          mood?: string
          note?: string | null
          stress_level?: number
          user_id?: string
        }
        Relationships: []
      }
      operator_suggestions: {
        Row: {
          alternate_actions: Json | null
          confidence: number | null
          created_at: string | null
          generated_by: string | null
          headline: string
          id: string
          mode: string
          rationale: string | null
          recommended_actions: Json | null
          status: string
          status_changed_at: string | null
          suggestion_date: string
          summary: string | null
          user_id: string
          warnings: Json | null
        }
        Insert: {
          alternate_actions?: Json | null
          confidence?: number | null
          created_at?: string | null
          generated_by?: string | null
          headline: string
          id?: string
          mode: string
          rationale?: string | null
          recommended_actions?: Json | null
          status?: string
          status_changed_at?: string | null
          suggestion_date?: string
          summary?: string | null
          user_id: string
          warnings?: Json | null
        }
        Update: {
          alternate_actions?: Json | null
          confidence?: number | null
          created_at?: string | null
          generated_by?: string | null
          headline?: string
          id?: string
          mode?: string
          rationale?: string | null
          recommended_actions?: Json | null
          status?: string
          status_changed_at?: string | null
          suggestion_date?: string
          summary?: string | null
          user_id?: string
          warnings?: Json | null
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
      planner_connections: {
        Row: {
          access_token: string | null
          calendar_ids: Json | null
          created_at: string
          id: string
          is_active: boolean
          last_synced_at: string | null
          provider: string
          provider_account_id: string | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          calendar_ids?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          provider: string
          provider_account_id?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          calendar_ids?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          provider?: string
          provider_account_id?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planner_items: {
        Row: {
          completed_at: string | null
          connection_id: string | null
          created_at: string
          description: string | null
          end_time: string | null
          energy_level: string | null
          external_event_id: string | null
          id: string
          item_type: Database["public"]["Enums"]["planner_item_type"]
          project_id: string | null
          promise_id: string | null
          routine_id: string | null
          scheduled_date: string
          skipped_at: string | null
          snapshot_action_ref: Json | null
          sort_order: number
          start_time: string | null
          status: Database["public"]["Enums"]["planner_item_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          connection_id?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          energy_level?: string | null
          external_event_id?: string | null
          id?: string
          item_type?: Database["public"]["Enums"]["planner_item_type"]
          project_id?: string | null
          promise_id?: string | null
          routine_id?: string | null
          scheduled_date: string
          skipped_at?: string | null
          snapshot_action_ref?: Json | null
          sort_order?: number
          start_time?: string | null
          status?: Database["public"]["Enums"]["planner_item_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          connection_id?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          energy_level?: string | null
          external_event_id?: string | null
          id?: string
          item_type?: Database["public"]["Enums"]["planner_item_type"]
          project_id?: string | null
          promise_id?: string | null
          routine_id?: string | null
          scheduled_date?: string
          skipped_at?: string | null
          snapshot_action_ref?: Json | null
          sort_order?: number
          start_time?: string | null
          status?: Database["public"]["Enums"]["planner_item_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planner_items_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "planner_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planner_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planner_items_promise_id_fkey"
            columns: ["promise_id"]
            isOneToOne: false
            referencedRelation: "integrity_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planner_items_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "planner_routines"
            referencedColumns: ["id"]
          },
        ]
      }
      planner_routines: {
        Row: {
          created_at: string
          default_end_time: string | null
          default_start_time: string | null
          description: string | null
          energy_level: string | null
          id: string
          is_active: boolean
          recurrence: string
          recurrence_days: number[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_end_time?: string | null
          default_start_time?: string | null
          description?: string | null
          energy_level?: string | null
          id?: string
          is_active?: boolean
          recurrence?: string
          recurrence_days?: number[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_end_time?: string | null
          default_start_time?: string | null
          description?: string | null
          energy_level?: string | null
          id?: string
          is_active?: boolean
          recurrence?: string
          recurrence_days?: number[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planner_sync_logs: {
        Row: {
          connection_id: string
          errors: Json | null
          events_imported: number | null
          events_updated: number | null
          id: string
          synced_at: string
          user_id: string
        }
        Insert: {
          connection_id: string
          errors?: Json | null
          events_imported?: number | null
          events_updated?: number | null
          id?: string
          synced_at?: string
          user_id: string
        }
        Update: {
          connection_id?: string
          errors?: Json | null
          events_imported?: number | null
          events_updated?: number | null
          id?: string
          synced_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planner_sync_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "planner_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email_nudge_enabled: boolean | null
          email_nudge_time: string | null
          id: string
          meal_preferences: Json | null
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
          meal_preferences?: Json | null
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
          meal_preferences?: Json | null
          nudge_frequency?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_calendar_mappings: {
        Row: {
          calendar_event_keyword: string
          created_at: string | null
          gcal_calendar_id: string | null
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          calendar_event_keyword: string
          created_at?: string | null
          gcal_calendar_id?: string | null
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          calendar_event_keyword?: string
          created_at?: string | null
          gcal_calendar_id?: string | null
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_calendar_mappings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          color_hex: string | null
          controllable: Database["public"]["Enums"]["controllable_focus"] | null
          created_at: string | null
          emoji: string | null
          id: string
          momentum_score: number | null
          name: string
          season_id: string | null
          status: Database["public"]["Enums"]["project_status"] | null
          user_id: string
        }
        Insert: {
          color_hex?: string | null
          controllable?:
            | Database["public"]["Enums"]["controllable_focus"]
            | null
          created_at?: string | null
          emoji?: string | null
          id?: string
          momentum_score?: number | null
          name: string
          season_id?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          user_id: string
        }
        Update: {
          color_hex?: string | null
          controllable?:
            | Database["public"]["Enums"]["controllable_focus"]
            | null
          created_at?: string | null
          emoji?: string | null
          id?: string
          momentum_score?: number | null
          name?: string
          season_id?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      proof_actions: {
        Row: {
          action_date: string
          category: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          proof_action: string
          reflection: string | null
          user_id: string
        }
        Insert: {
          action_date?: string
          category?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          proof_action: string
          reflection?: string | null
          user_id: string
        }
        Update: {
          action_date?: string
          category?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          proof_action?: string
          reflection?: string | null
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recharge_logs: {
        Row: {
          created_at: string
          id: string
          log_date: string
          note: string | null
          recharge_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_date?: string
          note?: string | null
          recharge_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          note?: string | null
          recharge_type?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_bills: {
        Row: {
          account_id: string | null
          amount: number
          bill_name: string
          category: string | null
          created_at: string | null
          due_date: number
          frequency: string | null
          id: string
          is_active: boolean | null
          last_paid_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          bill_name: string
          category?: string | null
          created_at?: string | null
          due_date: number
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          last_paid_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          bill_name?: string
          category?: string | null
          created_at?: string | null
          due_date?: number
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          last_paid_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_bills_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_bills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reframe_entries: {
        Row: {
          created_at: string
          entry_date: string
          fear_story: string
          id: string
          reframe_best_self: string | null
          reframe_love_response: string | null
          reframe_teaching: string | null
          reframe_what_else: string | null
          scenario_tag: string | null
          situation: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_date?: string
          fear_story: string
          id?: string
          reframe_best_self?: string | null
          reframe_love_response?: string | null
          reframe_teaching?: string | null
          reframe_what_else?: string | null
          scenario_tag?: string | null
          situation: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_date?: string
          fear_story?: string
          id?: string
          reframe_best_self?: string | null
          reframe_love_response?: string | null
          reframe_teaching?: string | null
          reframe_what_else?: string | null
          scenario_tag?: string | null
          situation?: string
          user_id?: string
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
          season_id: string | null
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
          season_id?: string | null
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
          season_id?: string | null
          start_date?: string
          status?: string
          timezone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reset_sessions_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_recipes: {
        Row: {
          created_at: string
          description: string | null
          emoji: string | null
          est_calories: number | null
          est_carbs: number | null
          est_fat: number | null
          est_protein: number | null
          id: string
          image_url: string | null
          ingredients: Json | null
          instructions: Json | null
          meal_type: string
          name: string
          prep_minutes: number | null
          source: string | null
          tags: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          emoji?: string | null
          est_calories?: number | null
          est_carbs?: number | null
          est_fat?: number | null
          est_protein?: number | null
          id?: string
          image_url?: string | null
          ingredients?: Json | null
          instructions?: Json | null
          meal_type?: string
          name: string
          prep_minutes?: number | null
          source?: string | null
          tags?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          emoji?: string | null
          est_calories?: number | null
          est_carbs?: number | null
          est_fat?: number | null
          est_protein?: number | null
          id?: string
          image_url?: string | null
          ingredients?: Json | null
          instructions?: Json | null
          meal_type?: string
          name?: string
          prep_minutes?: number | null
          source?: string | null
          tags?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          created_at: string | null
          current_amount: number | null
          goal_name: string
          id: string
          is_completed: boolean | null
          linked_account_id: string | null
          monthly_contribution: number | null
          target_amount: number
          target_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_amount?: number | null
          goal_name: string
          id?: string
          is_completed?: boolean | null
          linked_account_id?: string | null
          monthly_contribution?: number | null
          target_amount: number
          target_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_amount?: number | null
          goal_name?: string
          id?: string
          is_completed?: boolean | null
          linked_account_id?: string | null
          monthly_contribution?: number | null
          target_amount?: number
          target_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_goals_linked_account_id_fkey"
            columns: ["linked_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "savings_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          completed_at: string | null
          controllable_focus:
            | Database["public"]["Enums"]["controllable_focus"]
            | null
          created_at: string
          ends_at: string | null
          id: string
          name: string | null
          started_at: string
          status: string
          theme_text: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          controllable_focus?:
            | Database["public"]["Enums"]["controllable_focus"]
            | null
          created_at?: string
          ends_at?: string | null
          id?: string
          name?: string | null
          started_at?: string
          status?: string
          theme_text?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          controllable_focus?:
            | Database["public"]["Enums"]["controllable_focus"]
            | null
          created_at?: string
          ends_at?: string | null
          id?: string
          name?: string | null
          started_at?: string
          status?: string
          theme_text?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          account_id: string | null
          amount: number
          billing_cycle: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          next_billing_date: string
          service_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          billing_cycle?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          next_billing_date: string
          service_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          billing_cycle?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          next_billing_date?: string
          service_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          budget_bucket_id: string | null
          category: string | null
          created_at: string | null
          description: string
          external_transaction_id: string | null
          id: string
          is_pending: boolean | null
          transaction_date: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          budget_bucket_id?: string | null
          category?: string | null
          created_at?: string | null
          description: string
          external_transaction_id?: string | null
          id?: string
          is_pending?: boolean | null
          transaction_date: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          budget_bucket_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string
          external_transaction_id?: string | null
          id?: string
          is_pending?: boolean | null
          transaction_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_budget_bucket_id_fkey"
            columns: ["budget_bucket_id"]
            isOneToOne: false
            referencedRelation: "budget_buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          source?: string
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_modes: {
        Row: {
          activated_at: string
          active_mode: string
          created_at: string
          expires_at: string | null
          id: string
          previous_mode: string | null
          reasons: Json
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string
          active_mode?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          previous_mode?: string | null
          reasons?: Json
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string
          active_mode?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          previous_mode?: string | null
          reasons?: Json
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_observations: {
        Row: {
          confidence: number | null
          created_at: string | null
          description: string | null
          first_seen_at: string | null
          id: string
          last_seen_at: string | null
          observation_type: string
          occurrences: number | null
          source: string
          status: string
          supporting_refs: Json | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          description?: string | null
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          observation_type: string
          occurrences?: number | null
          source: string
          status?: string
          supporting_refs?: Json | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          description?: string | null
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          observation_type?: string
          occurrences?: number | null
          source?: string
          status?: string
          supporting_refs?: Json | null
          title?: string
          updated_at?: string | null
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
          operator_onboarding_answers: Json
          operator_onboarding_completed: boolean
          operator_onboarding_completed_at: string | null
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
          operator_onboarding_answers?: Json
          operator_onboarding_completed?: boolean
          operator_onboarding_completed_at?: string | null
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
          operator_onboarding_answers?: Json
          operator_onboarding_completed?: boolean
          operator_onboarding_completed_at?: string | null
          simplified_mode_completed?: boolean
          user_id?: string
          welcome_foundation_progress?: Json | null
        }
        Relationships: []
      }
      user_predictions: {
        Row: {
          accuracy_evaluated_at: string | null
          confidence: number
          created_at: string
          explanation: string | null
          forecast: string
          id: string
          intervention_deep_link: string | null
          intervention_taken: boolean | null
          intervention_taken_at: string | null
          prediction_accurate: boolean | null
          prediction_date: string
          prediction_type: string
          reasons: Json
          recommended_intervention: string | null
          updated_at: string
          urgency: string
          user_id: string
        }
        Insert: {
          accuracy_evaluated_at?: string | null
          confidence?: number
          created_at?: string
          explanation?: string | null
          forecast: string
          id?: string
          intervention_deep_link?: string | null
          intervention_taken?: boolean | null
          intervention_taken_at?: string | null
          prediction_accurate?: boolean | null
          prediction_date?: string
          prediction_type: string
          reasons?: Json
          recommended_intervention?: string | null
          updated_at?: string
          urgency?: string
          user_id: string
        }
        Update: {
          accuracy_evaluated_at?: string | null
          confidence?: number
          created_at?: string
          explanation?: string | null
          forecast?: string
          id?: string
          intervention_deep_link?: string | null
          intervention_taken?: boolean | null
          intervention_taken_at?: string | null
          prediction_accurate?: boolean | null
          prediction_date?: string
          prediction_type?: string
          reasons?: Json
          recommended_intervention?: string | null
          updated_at?: string
          urgency?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences_inferred: {
        Row: {
          confidence: number | null
          first_derived_at: string | null
          id: string
          last_updated_at: string | null
          preference_key: string
          preference_value: Json
          source_observations: Json | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          first_derived_at?: string | null
          id?: string
          last_updated_at?: string | null
          preference_key: string
          preference_value: Json
          source_observations?: Json | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          first_derived_at?: string | null
          id?: string
          last_updated_at?: string | null
          preference_key?: string
          preference_value?: Json
          source_observations?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_recipes: {
        Row: {
          calories: number | null
          created_at: string
          description: string | null
          emoji: string | null
          id: string
          ingredients: Json | null
          instructions: string | null
          meal_type: string | null
          name: string
          prep_minutes: number | null
          source: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calories?: number | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          ingredients?: Json | null
          instructions?: string | null
          meal_type?: string | null
          name: string
          prep_minutes?: number | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calories?: number | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          ingredients?: Json | null
          instructions?: string | null
          meal_type?: string | null
          name?: string
          prep_minutes?: number | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
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
      vault_entries: {
        Row: {
          body: string
          controllable: string | null
          created_at: string
          entry_date: string
          entry_type: string
          id: string
          is_favorite: boolean
          is_pinned: boolean
          season_id: string | null
          snapshot_id: string | null
          source_ref: Json | null
          tags: string[]
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          controllable?: string | null
          created_at?: string
          entry_date?: string
          entry_type?: string
          id?: string
          is_favorite?: boolean
          is_pinned?: boolean
          season_id?: string | null
          snapshot_id?: string | null
          source_ref?: Json | null
          tags?: string[]
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          controllable?: string | null
          created_at?: string
          entry_date?: string
          entry_type?: string
          id?: string
          is_favorite?: boolean
          is_pinned?: boolean
          season_id?: string | null
          snapshot_id?: string | null
          source_ref?: Json | null
          tags?: string[]
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_entries_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_entries_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "reset_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_saved_views: {
        Row: {
          created_at: string
          filters: Json
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      wearable_connections: {
        Row: {
          access_token: string | null
          connected_at: string
          id: string
          last_synced_at: string | null
          metadata: Json | null
          provider: string
          refresh_token: string | null
          scopes: string | null
          token_expires_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          connected_at?: string
          id?: string
          last_synced_at?: string | null
          metadata?: Json | null
          provider: string
          refresh_token?: string | null
          scopes?: string | null
          token_expires_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          connected_at?: string
          id?: string
          last_synced_at?: string | null
          metadata?: Json | null
          provider?: string
          refresh_token?: string | null
          scopes?: string | null
          token_expires_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      weekly_tracking: {
        Row: {
          created_at: string
          days_active: number | null
          id: string
          money_score: number | null
          nutrition_score: number | null
          overall_score: number | null
          planner_score: number | null
          recap_data: Json | null
          recap_generated: boolean | null
          rings_score: number | null
          total_xp_earned: number | null
          updated_at: string
          user_id: string
          wearable_score: number | null
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string
          days_active?: number | null
          id?: string
          money_score?: number | null
          nutrition_score?: number | null
          overall_score?: number | null
          planner_score?: number | null
          recap_data?: Json | null
          recap_generated?: boolean | null
          rings_score?: number | null
          total_xp_earned?: number | null
          updated_at?: string
          user_id: string
          wearable_score?: number | null
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string
          days_active?: number | null
          id?: string
          money_score?: number | null
          nutrition_score?: number | null
          overall_score?: number | null
          planner_score?: number | null
          recap_data?: Json | null
          recap_generated?: boolean | null
          rings_score?: number | null
          total_xp_earned?: number | null
          updated_at?: string
          user_id?: string
          wearable_score?: number | null
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      wellness_goals: {
        Row: {
          created_at: string
          goal_type: string
          id: string
          target_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal_type: string
          id?: string
          target_value: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal_type?: string
          id?: string
          target_value?: number
          updated_at?: string
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
      whoop_cycles: {
        Row: {
          avg_heart_rate: number | null
          created_at: string
          end_time: string | null
          id: string
          kilojoules: number | null
          max_heart_rate: number | null
          start_time: string | null
          strain: number | null
          user_id: string
          whoop_id: string
        }
        Insert: {
          avg_heart_rate?: number | null
          created_at?: string
          end_time?: string | null
          id?: string
          kilojoules?: number | null
          max_heart_rate?: number | null
          start_time?: string | null
          strain?: number | null
          user_id: string
          whoop_id: string
        }
        Update: {
          avg_heart_rate?: number | null
          created_at?: string
          end_time?: string | null
          id?: string
          kilojoules?: number | null
          max_heart_rate?: number | null
          start_time?: string | null
          strain?: number | null
          user_id?: string
          whoop_id?: string
        }
        Relationships: []
      }
      whoop_recoveries: {
        Row: {
          created_at: string
          hrv_rmssd_milli: number | null
          id: string
          recorded_at: string | null
          recovery_score: number | null
          resting_heart_rate: number | null
          skin_temp_celsius: number | null
          spo2_percentage: number | null
          user_id: string
          whoop_cycle_id: string | null
          whoop_id: string
        }
        Insert: {
          created_at?: string
          hrv_rmssd_milli?: number | null
          id?: string
          recorded_at?: string | null
          recovery_score?: number | null
          resting_heart_rate?: number | null
          skin_temp_celsius?: number | null
          spo2_percentage?: number | null
          user_id: string
          whoop_cycle_id?: string | null
          whoop_id: string
        }
        Update: {
          created_at?: string
          hrv_rmssd_milli?: number | null
          id?: string
          recorded_at?: string | null
          recovery_score?: number | null
          resting_heart_rate?: number | null
          skin_temp_celsius?: number | null
          spo2_percentage?: number | null
          user_id?: string
          whoop_cycle_id?: string | null
          whoop_id?: string
        }
        Relationships: []
      }
      whoop_sleeps: {
        Row: {
          created_at: string
          disturbance_count: number | null
          end_time: string | null
          id: string
          respiratory_rate: number | null
          sleep_consistency_pct: number | null
          sleep_cycle_count: number | null
          sleep_efficiency_pct: number | null
          sleep_performance_pct: number | null
          start_time: string | null
          total_awake_ms: number | null
          total_in_bed_ms: number | null
          total_light_ms: number | null
          total_rem_ms: number | null
          total_sws_ms: number | null
          user_id: string
          whoop_id: string
        }
        Insert: {
          created_at?: string
          disturbance_count?: number | null
          end_time?: string | null
          id?: string
          respiratory_rate?: number | null
          sleep_consistency_pct?: number | null
          sleep_cycle_count?: number | null
          sleep_efficiency_pct?: number | null
          sleep_performance_pct?: number | null
          start_time?: string | null
          total_awake_ms?: number | null
          total_in_bed_ms?: number | null
          total_light_ms?: number | null
          total_rem_ms?: number | null
          total_sws_ms?: number | null
          user_id: string
          whoop_id: string
        }
        Update: {
          created_at?: string
          disturbance_count?: number | null
          end_time?: string | null
          id?: string
          respiratory_rate?: number | null
          sleep_consistency_pct?: number | null
          sleep_cycle_count?: number | null
          sleep_efficiency_pct?: number | null
          sleep_performance_pct?: number | null
          start_time?: string | null
          total_awake_ms?: number | null
          total_in_bed_ms?: number | null
          total_light_ms?: number | null
          total_rem_ms?: number | null
          total_sws_ms?: number | null
          user_id?: string
          whoop_id?: string
        }
        Relationships: []
      }
      whoop_webhook_events: {
        Row: {
          created_at: string
          event_type: string | null
          id: string
          payload: Json | null
          processed: boolean | null
          whoop_user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type?: string | null
          id?: string
          payload?: Json | null
          processed?: boolean | null
          whoop_user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string | null
          id?: string
          payload?: Json | null
          processed?: boolean | null
          whoop_user_id?: string | null
        }
        Relationships: []
      }
      whoop_workouts: {
        Row: {
          activity_type: string | null
          avg_heart_rate: number | null
          created_at: string
          end_time: string | null
          id: string
          start_time: string | null
          strain: number | null
          user_id: string
          whoop_cycle_id: string | null
          whoop_id: string
        }
        Insert: {
          activity_type?: string | null
          avg_heart_rate?: number | null
          created_at?: string
          end_time?: string | null
          id?: string
          start_time?: string | null
          strain?: number | null
          user_id: string
          whoop_cycle_id?: string | null
          whoop_id: string
        }
        Update: {
          activity_type?: string | null
          avg_heart_rate?: number | null
          created_at?: string
          end_time?: string | null
          id?: string
          start_time?: string | null
          strain?: number | null
          user_id?: string
          whoop_cycle_id?: string | null
          whoop_id?: string
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
      get_circle_wellness_streaks: {
        Args: { p_challenge_id: string }
        Returns: {
          display_name: string
          streak: number
          user_id: string
        }[]
      }
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
      controllable_focus:
        | "awareness"
        | "perspective"
        | "habit"
        | "wellness"
        | "environment"
      planner_item_status: "todo" | "in_progress" | "done" | "skipped"
      planner_item_type:
        | "task"
        | "time_block"
        | "routine_instance"
        | "external_event"
      project_status: "active" | "paused" | "complete"
      season_status: "active" | "closed"
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
      controllable_focus: [
        "awareness",
        "perspective",
        "habit",
        "wellness",
        "environment",
      ],
      planner_item_status: ["todo", "in_progress", "done", "skipped"],
      planner_item_type: [
        "task",
        "time_block",
        "routine_instance",
        "external_event",
      ],
      project_status: ["active", "paused", "complete"],
      season_status: ["active", "closed"],
    },
  },
} as const
