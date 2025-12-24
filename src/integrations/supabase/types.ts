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
      alerts: {
        Row: {
          acknowledged_at: string | null
          created_at: string | null
          current_value: number
          fired_at: string | null
          id: string
          message: string
          metric_name: string
          name: string
          service_id: string | null
          severity: string
          silenced_until: string | null
          threshold: number
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string | null
          current_value: number
          fired_at?: string | null
          id?: string
          message: string
          metric_name: string
          name: string
          service_id?: string | null
          severity?: string
          silenced_until?: string | null
          threshold: number
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string | null
          current_value?: number
          fired_at?: string | null
          id?: string
          message?: string
          metric_name?: string
          name?: string
          service_id?: string | null
          severity?: string
          silenced_until?: string | null
          threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "alerts_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_events: {
        Row: {
          author_id: string | null
          created_at: string | null
          event_type: string
          id: string
          incident_id: string
          message: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          incident_id: string
          message: string
        }
        Update: {
          author_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          incident_id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_events_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          acknowledged_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          incident_number: string
          resolved_at: string | null
          service_id: string | null
          severity: string
          started_at: string | null
          status: string
          title: string
          triggered_by: string | null
          updated_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          incident_number: string
          resolved_at?: string | null
          service_id?: string | null
          severity?: string
          started_at?: string | null
          status?: string
          title: string
          triggered_by?: string | null
          updated_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          incident_number?: string
          resolved_at?: string | null
          service_id?: string | null
          severity?: string
          started_at?: string | null
          status?: string
          title?: string
          triggered_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      logs: {
        Row: {
          created_at: string | null
          id: string
          level: string
          message: string
          metadata: Json | null
          service_id: string | null
          trace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          level: string
          message: string
          metadata?: Json | null
          service_id?: string | null
          trace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          service_id?: string | null
          trace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics: {
        Row: {
          id: string
          metric_name: string
          recorded_at: string | null
          service_id: string | null
          unit: string | null
          value: number
        }
        Insert: {
          id?: string
          metric_name: string
          recorded_at?: string | null
          service_id?: string | null
          unit?: string | null
          value: number
        }
        Update: {
          id?: string
          metric_name?: string
          recorded_at?: string | null
          service_id?: string | null
          unit?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "metrics_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          cpu_usage: number | null
          created_at: string | null
          description: string | null
          error_rate: number | null
          id: string
          last_checked_at: string | null
          latency_p50: number | null
          latency_p99: number | null
          memory_usage: number | null
          name: string
          requests_per_second: number | null
          status: string
          updated_at: string | null
          uptime: number | null
        }
        Insert: {
          cpu_usage?: number | null
          created_at?: string | null
          description?: string | null
          error_rate?: number | null
          id?: string
          last_checked_at?: string | null
          latency_p50?: number | null
          latency_p99?: number | null
          memory_usage?: number | null
          name: string
          requests_per_second?: number | null
          status?: string
          updated_at?: string | null
          uptime?: number | null
        }
        Update: {
          cpu_usage?: number | null
          created_at?: string | null
          description?: string | null
          error_rate?: number | null
          id?: string
          last_checked_at?: string | null
          latency_p50?: number | null
          latency_p99?: number | null
          memory_usage?: number | null
          name?: string
          requests_per_second?: number | null
          status?: string
          updated_at?: string | null
          uptime?: number | null
        }
        Relationships: []
      }
      slos: {
        Row: {
          created_at: string | null
          current_availability: number
          current_latency_p99: number | null
          error_budget: number | null
          error_budget_consumed: number | null
          id: string
          name: string
          period: string | null
          service_id: string | null
          target_availability: number
          target_latency_p99: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_availability?: number
          current_latency_p99?: number | null
          error_budget?: number | null
          error_budget_consumed?: number | null
          id?: string
          name: string
          period?: string | null
          service_id?: string | null
          target_availability?: number
          target_latency_p99?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_availability?: number
          current_latency_p99?: number | null
          error_budget?: number | null
          error_budget_consumed?: number | null
          id?: string
          name?: string
          period?: string | null
          service_id?: string | null
          target_availability?: number
          target_latency_p99?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slos_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
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
