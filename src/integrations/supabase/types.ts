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
      debug_reports: {
        Row: {
          comment: string | null
          console_logs: Json | null
          created_at: string
          error_logs: Json | null
          id: string
          interaction_logs: Json | null
          network_logs: Json | null
          page_url: string
          screenshot_url: string | null
          session_id: string
          status: string | null
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          console_logs?: Json | null
          created_at?: string
          error_logs?: Json | null
          id?: string
          interaction_logs?: Json | null
          network_logs?: Json | null
          page_url: string
          screenshot_url?: string | null
          session_id: string
          status?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          console_logs?: Json | null
          created_at?: string
          error_logs?: Json | null
          id?: string
          interaction_logs?: Json | null
          network_logs?: Json | null
          page_url?: string
          screenshot_url?: string | null
          session_id?: string
          status?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      eval_axes: {
        Row: {
          created_at: string
          default_value: number
          description: string
          id: string
          is_active: boolean
          key: string
          left_label: string
          name: string
          right_label: string
          sort_order: number
          tooltip: string
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          default_value?: number
          description?: string
          id?: string
          is_active?: boolean
          key: string
          left_label?: string
          name: string
          right_label?: string
          sort_order?: number
          tooltip?: string
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          default_value?: number
          description?: string
          id?: string
          is_active?: boolean
          key?: string
          left_label?: string
          name?: string
          right_label?: string
          sort_order?: number
          tooltip?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      eval_settings: {
        Row: {
          cost_efficiency: number
          created_at: string
          cross_functional: number
          id: string
          innovation: number
          reproducibility_weight: number
          speed: number
          updated_at: string
          updated_by: string
        }
        Insert: {
          cost_efficiency?: number
          created_at?: string
          cross_functional?: number
          id?: string
          innovation?: number
          reproducibility_weight?: number
          speed?: number
          updated_at?: string
          updated_by?: string
        }
        Update: {
          cost_efficiency?: number
          created_at?: string
          cross_functional?: number
          id?: string
          innovation?: number
          reproducibility_weight?: number
          speed?: number
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      eval_settings_history: {
        Row: {
          cost_efficiency: number
          created_at: string
          cross_functional: number
          id: string
          innovation: number
          reproducibility_weight: number
          speed: number
          updated_by: string
        }
        Insert: {
          cost_efficiency?: number
          created_at?: string
          cross_functional: number
          id?: string
          innovation?: number
          reproducibility_weight?: number
          speed: number
          updated_by?: string
        }
        Update: {
          cost_efficiency?: number
          created_at?: string
          cross_functional?: number
          id?: string
          innovation?: number
          reproducibility_weight?: number
          speed?: number
          updated_by?: string
        }
        Relationships: []
      }
      kaizen_items: {
        Row: {
          adopted_by: string[]
          author_id: string
          category: string
          cause: string
          created_at: string
          department: string
          effect: string
          frequency: string
          id: string
          impact_score: number
          numerical_evidence: string
          occurrence_place: string
          problem: string
          reproducibility: string
          solution: string
          status: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          adopted_by?: string[]
          author_id: string
          category: string
          cause: string
          created_at?: string
          department: string
          effect: string
          frequency?: string
          id?: string
          impact_score?: number
          numerical_evidence?: string
          occurrence_place?: string
          problem: string
          reproducibility?: string
          solution: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          adopted_by?: string[]
          author_id?: string
          category?: string
          cause?: string
          created_at?: string
          department?: string
          effect?: string
          frequency?: string
          id?: string
          impact_score?: number
          numerical_evidence?: string
          occurrence_place?: string
          problem?: string
          reproducibility?: string
          solution?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          avatar_initial: string
          created_at: string
          department: string
          id: string
          is_active: boolean
          name: string
          role: string
          updated_at: string
          years_at_company: number
        }
        Insert: {
          avatar_initial?: string
          created_at?: string
          department: string
          id?: string
          is_active?: boolean
          name: string
          role?: string
          updated_at?: string
          years_at_company?: number
        }
        Update: {
          avatar_initial?: string
          created_at?: string
          department?: string
          id?: string
          is_active?: boolean
          name?: string
          role?: string
          updated_at?: string
          years_at_company?: number
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
