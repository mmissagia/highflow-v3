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
      campaigns: {
        Row: {
          channel: string
          created_at: string
          edge_source: string
          edge_target: string
          id: string
          name: string
          status: string
          strategy_id: string
          type: string
        }
        Insert: {
          channel: string
          created_at?: string
          edge_source: string
          edge_target: string
          id?: string
          name: string
          status?: string
          strategy_id: string
          type: string
        }
        Update: {
          channel?: string
          created_at?: string
          edge_source?: string
          edge_target?: string
          id?: string
          name?: string
          status?: string
          strategy_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_records: {
        Row: {
          commission_value: number
          created_at: string
          deal_id: string
          id: string
          period_month: string
          sales_user_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          commission_value?: number
          created_at?: string
          deal_id: string
          id?: string
          period_month: string
          sales_user_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          commission_value?: number
          created_at?: string
          deal_id?: string
          id?: string
          period_month?: string
          sales_user_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_records_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_records_sales_user_id_fkey"
            columns: ["sales_user_id"]
            isOneToOne: false
            referencedRelation: "sales_users"
            referencedColumns: ["id"]
          },
        ]
      }
      connected_products: {
        Row: {
          avg_engagement: number | null
          completion_rate: number | null
          connection_id: string | null
          created_at: string
          external_id: string
          id: string
          last_sync_at: string | null
          metadata: Json | null
          name: string
          platform: string
          revenue_total: number | null
          status: string
          sync_enabled: boolean
          total_enrolled: number | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_engagement?: number | null
          completion_rate?: number | null
          connection_id?: string | null
          created_at?: string
          external_id: string
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          name: string
          platform: string
          revenue_total?: number | null
          status?: string
          sync_enabled?: boolean
          total_enrolled?: number | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_engagement?: number | null
          completion_rate?: number | null
          connection_id?: string | null
          created_at?: string
          external_id?: string
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          name?: string
          platform?: string
          revenue_total?: number | null
          status?: string
          sync_enabled?: boolean
          total_enrolled?: number | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connected_products_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          api_key_encrypted: string | null
          created_at: string
          id: string
          last_sync_at: string | null
          provider: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key_encrypted?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          provider: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key_encrypted?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          provider?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          amount_value: number
          closer_id: string | null
          created_at: string
          event_id: string | null
          id: string
          lead_id: string
          lost_at: string | null
          notes: string | null
          product_id: string | null
          sdr_id: string | null
          stage: string
          updated_at: string
          user_id: string
          won_at: string | null
        }
        Insert: {
          amount_value?: number
          closer_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          lead_id: string
          lost_at?: string | null
          notes?: string | null
          product_id?: string | null
          sdr_id?: string | null
          stage?: string
          updated_at?: string
          user_id: string
          won_at?: string | null
        }
        Update: {
          amount_value?: number
          closer_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          lead_id?: string
          lost_at?: string | null
          notes?: string | null
          product_id?: string | null
          sdr_id?: string | null
          stage?: string
          updated_at?: string
          user_id?: string
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_closer_id_fkey"
            columns: ["closer_id"]
            isOneToOne: false
            referencedRelation: "sales_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_sdr_id_fkey"
            columns: ["sdr_id"]
            isOneToOne: false
            referencedRelation: "sales_users"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_assignments: {
        Row: {
          active: boolean
          assigned_at: string
          assigned_by_user_id: string
          assigned_to_sales_user_id: string
          assignment_type: string
          created_at: string
          id: string
          lead_id: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          assigned_at?: string
          assigned_by_user_id: string
          assigned_to_sales_user_id: string
          assignment_type: string
          created_at?: string
          id?: string
          lead_id: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          assigned_at?: string
          assigned_by_user_id?: string
          assigned_to_sales_user_id?: string
          assignment_type?: string
          created_at?: string
          id?: string
          lead_id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignments_assigned_to_sales_user_id_fkey"
            columns: ["assigned_to_sales_user_id"]
            isOneToOne: false
            referencedRelation: "sales_users"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          cached_count: number | null
          connection_id: string | null
          created_at: string
          id: string
          last_sync_at: string | null
          name: string
          provider: string | null
          reference_id: string | null
          reference_name: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cached_count?: number | null
          connection_id?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          name: string
          provider?: string | null
          reference_id?: string | null
          reference_name?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cached_count?: number | null
          connection_id?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          name?: string
          provider?: string | null
          reference_id?: string | null
          reference_name?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_sources_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_stage_overrides: {
        Row: {
          lead_id: string
          stage: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          lead_id: string
          stage: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          lead_id?: string
          stage?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      manual_leads: {
        Row: {
          closer_user_id: string
          created_at: string
          created_via: string
          email: string | null
          id: string
          name: string
          origin: string
          phone: string | null
          pipeline_value: number | null
          pitch: string | null
          sdr_user_id: string | null
          stage: string
          updated_at: string
          user_id: string
        }
        Insert: {
          closer_user_id: string
          created_at?: string
          created_via?: string
          email?: string | null
          id?: string
          name: string
          origin?: string
          phone?: string | null
          pipeline_value?: number | null
          pitch?: string | null
          sdr_user_id?: string | null
          stage?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          closer_user_id?: string
          created_at?: string
          created_via?: string
          email?: string | null
          id?: string
          name?: string
          origin?: string
          phone?: string | null
          pipeline_value?: number | null
          pitch?: string | null
          sdr_user_id?: string | null
          stage?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_leads_closer_user_id_fkey"
            columns: ["closer_user_id"]
            isOneToOne: false
            referencedRelation: "sales_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_leads_sdr_user_id_fkey"
            columns: ["sdr_user_id"]
            isOneToOne: false
            referencedRelation: "sales_users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_links: {
        Row: {
          closer_initials: string | null
          closer_name: string | null
          closer_role: string | null
          created_at: string
          description: string
          due_date: string | null
          expires_at: string | null
          flexible_config: Json | null
          id: string
          lead_cpf: string | null
          lead_email: string | null
          lead_name: string
          lead_phone: string | null
          mode: string
          paid_amount: number
          paid_at: string | null
          paid_method: string | null
          payment_lines: Json
          producer_id: string
          status: string
          transactions: Json
          value: number
        }
        Insert: {
          closer_initials?: string | null
          closer_name?: string | null
          closer_role?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          expires_at?: string | null
          flexible_config?: Json | null
          id: string
          lead_cpf?: string | null
          lead_email?: string | null
          lead_name: string
          lead_phone?: string | null
          mode?: string
          paid_amount?: number
          paid_at?: string | null
          paid_method?: string | null
          payment_lines?: Json
          producer_id: string
          status?: string
          transactions?: Json
          value: number
        }
        Update: {
          closer_initials?: string | null
          closer_name?: string | null
          closer_role?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          expires_at?: string | null
          flexible_config?: Json | null
          id?: string
          lead_cpf?: string | null
          lead_email?: string | null
          lead_name?: string
          lead_phone?: string | null
          mode?: string
          paid_amount?: number
          paid_at?: string | null
          paid_method?: string | null
          payment_lines?: Json
          producer_id?: string
          status?: string
          transactions?: Json
          value?: number
        }
        Relationships: []
      }
      product_enrollments: {
        Row: {
          completed_at: string | null
          connected_product_id: string
          created_at: string
          engagement_score: number | null
          enrolled_at: string
          external_enrollment_id: string | null
          id: string
          last_activity_at: string | null
          lead_id: string
          metadata: Json | null
          progress: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          connected_product_id: string
          created_at?: string
          engagement_score?: number | null
          enrolled_at?: string
          external_enrollment_id?: string | null
          id?: string
          last_activity_at?: string | null
          lead_id: string
          metadata?: Json | null
          progress?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          connected_product_id?: string
          created_at?: string
          engagement_score?: number | null
          enrolled_at?: string
          external_enrollment_id?: string | null
          id?: string
          last_activity_at?: string | null
          lead_id?: string
          metadata?: Json | null
          progress?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_enrollments_connected_product_id_fkey"
            columns: ["connected_product_id"]
            isOneToOne: false
            referencedRelation: "connected_products"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_activities: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          lead_id: string
          loss_reason: string | null
          next_step: string | null
          occurred_at: string | null
          outcome: string | null
          sales_user_id: string
          scheduled_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          lead_id: string
          loss_reason?: string | null
          next_step?: string | null
          occurred_at?: string | null
          outcome?: string | null
          sales_user_id: string
          scheduled_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          lead_id?: string
          loss_reason?: string | null
          next_step?: string | null
          occurred_at?: string | null
          outcome?: string | null
          sales_user_id?: string
          scheduled_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_activities_sales_user_id_fkey"
            columns: ["sales_user_id"]
            isOneToOne: false
            referencedRelation: "sales_users"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_users: {
        Row: {
          commission_fixed_value: number | null
          commission_percent: number | null
          commission_type: string | null
          cost_fixed_monthly: number | null
          created_at: string
          email: string | null
          id: string
          monthly_goal_value: number | null
          name: string
          phone: string | null
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          commission_fixed_value?: number | null
          commission_percent?: number | null
          commission_type?: string | null
          cost_fixed_monthly?: number | null
          created_at?: string
          email?: string | null
          id?: string
          monthly_goal_value?: number | null
          name: string
          phone?: string | null
          role: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          commission_fixed_value?: number | null
          commission_percent?: number | null
          commission_type?: string | null
          cost_fixed_monthly?: number | null
          created_at?: string
          email?: string | null
          id?: string
          monthly_goal_value?: number | null
          name?: string
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      strategies: {
        Row: {
          created_at: string
          edges: Json
          id: string
          name: string
          nodes: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          edges?: Json
          id?: string
          name?: string
          nodes?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          edges?: Json
          id?: string
          name?: string
          nodes?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users_access: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_at: string
          last_access: string | null
          name: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_at?: string
          last_access?: string | null
          name: string
          role: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_at?: string
          last_access?: string | null
          name?: string
          role?: string
          status?: string
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
