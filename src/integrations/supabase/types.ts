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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_reports: {
        Row: {
          generated_at: string | null
          id: string
          pension_gap: number | null
          readiness_score: number | null
          report_json: Json | null
          top_business_ideas: Json | null
          user_id: string
        }
        Insert: {
          generated_at?: string | null
          id?: string
          pension_gap?: number | null
          readiness_score?: number | null
          report_json?: Json | null
          top_business_ideas?: Json | null
          user_id: string
        }
        Update: {
          generated_at?: string | null
          id?: string
          pension_gap?: number | null
          readiness_score?: number | null
          report_json?: Json | null
          top_business_ideas?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      business_ideas: {
        Row: {
          created_at: string | null
          description: string | null
          gamma_deck_url: string | null
          id: string
          idea_title: string
          projected_monthly_income: number | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          gamma_deck_url?: string | null
          id?: string
          idea_title: string
          projected_monthly_income?: number | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          gamma_deck_url?: string | null
          id?: string
          idea_title?: string
          projected_monthly_income?: number | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      events_announcements: {
        Row: {
          created_at: string | null
          date: string
          description: string | null
          id: string
          is_active: boolean | null
          link: string | null
          sector: string[] | null
          title: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          link?: string | null
          sector?: string[] | null
          title: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          link?: string | null
          sector?: string[] | null
          title?: string
          type?: string | null
        }
        Relationships: []
      }
      habit_completions: {
        Row: {
          completed_on: string
          created_at: string
          habit_id: string
          id: string
          user_id: string
        }
        Insert: {
          completed_on?: string
          created_at?: string
          habit_id: string
          id?: string
          user_id: string
        }
        Update: {
          completed_on?: string
          created_at?: string
          habit_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_completions_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_archived: boolean
          target_per_week: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean
          target_per_week?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean
          target_per_week?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          business_interests: Json | null
          created_at: string | null
          current_salary: number | null
          full_name: string | null
          grade_level: string | null
          id: string
          pension_projection: number | null
          sector: string | null
          skills: Json | null
          updated_at: string | null
          user_id: string
          years_in_service: number | null
        }
        Insert: {
          age?: number | null
          business_interests?: Json | null
          created_at?: string | null
          current_salary?: number | null
          full_name?: string | null
          grade_level?: string | null
          id?: string
          pension_projection?: number | null
          sector?: string | null
          skills?: Json | null
          updated_at?: string | null
          user_id: string
          years_in_service?: number | null
        }
        Update: {
          age?: number | null
          business_interests?: Json | null
          created_at?: string | null
          current_salary?: number | null
          full_name?: string | null
          grade_level?: string | null
          id?: string
          pension_projection?: number | null
          sector?: string | null
          skills?: Json | null
          updated_at?: string | null
          user_id?: string
          years_in_service?: number | null
        }
        Relationships: []
      }
      project_budgets: {
        Row: {
          ai_analysis: Json | null
          cost_items: Json
          created_at: string
          description: string | null
          id: string
          last_analysis_at: string | null
          last_inflation_rate: number | null
          linked_idea_id: string | null
          project_name: string
          timeline_months: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          cost_items?: Json
          created_at?: string
          description?: string | null
          id?: string
          last_analysis_at?: string | null
          last_inflation_rate?: number | null
          linked_idea_id?: string | null
          project_name: string
          timeline_months?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          cost_items?: Json
          created_at?: string
          description?: string | null
          id?: string
          last_analysis_at?: string | null
          last_inflation_rate?: number | null
          linked_idea_id?: string | null
          project_name?: string
          timeline_months?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      savings_plans: {
        Row: {
          ai_recommendations: Json | null
          business_income_projection: number | null
          created_at: string
          current_savings: number | null
          desired_retirement_income: number | null
          emergency_fund_goal: number | null
          id: string
          last_inflation_check: string | null
          last_inflation_rate: number | null
          monthly_savings_target: number | null
          updated_at: string
          user_id: string
          years_horizon: number | null
        }
        Insert: {
          ai_recommendations?: Json | null
          business_income_projection?: number | null
          created_at?: string
          current_savings?: number | null
          desired_retirement_income?: number | null
          emergency_fund_goal?: number | null
          id?: string
          last_inflation_check?: string | null
          last_inflation_rate?: number | null
          monthly_savings_target?: number | null
          updated_at?: string
          user_id: string
          years_horizon?: number | null
        }
        Update: {
          ai_recommendations?: Json | null
          business_income_projection?: number | null
          created_at?: string
          current_savings?: number | null
          desired_retirement_income?: number | null
          emergency_fund_goal?: number | null
          id?: string
          last_inflation_check?: string | null
          last_inflation_rate?: number | null
          monthly_savings_target?: number | null
          updated_at?: string
          user_id?: string
          years_horizon?: number | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          priority: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_metrics: {
        Row: {
          anxiety_score: number | null
          businesses_launched: number | null
          id: string
          last_updated: string | null
          side_income: number | null
          students_enrolled: number | null
          user_id: string
        }
        Insert: {
          anxiety_score?: number | null
          businesses_launched?: number | null
          id?: string
          last_updated?: string | null
          side_income?: number | null
          students_enrolled?: number | null
          user_id: string
        }
        Update: {
          anxiety_score?: number | null
          businesses_launched?: number | null
          id?: string
          last_updated?: string | null
          side_income?: number | null
          students_enrolled?: number | null
          user_id?: string
        }
        Relationships: []
      }
      worksheets: {
        Row: {
          answer_key: Json
          created_at: string
          difficulty: string
          grade_level: string | null
          id: string
          instructions: string | null
          question_count: number
          questions: Json
          subject: string
          title: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer_key?: Json
          created_at?: string
          difficulty?: string
          grade_level?: string | null
          id?: string
          instructions?: string | null
          question_count?: number
          questions?: Json
          subject: string
          title: string
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer_key?: Json
          created_at?: string
          difficulty?: string
          grade_level?: string | null
          id?: string
          instructions?: string | null
          question_count?: number
          questions?: Json
          subject?: string
          title?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
