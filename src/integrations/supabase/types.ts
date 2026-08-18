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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      books: {
        Row: {
          author: string
          cover_url: string | null
          created_at: string
          current_page: number
          finished_at: string | null
          id: string
          notes: string | null
          primary_category: string
          started_at: string | null
          status: string
          tags: string[]
          title: string
          total_pages: number
          updated_at: string
          user_id: string
        }
        Insert: {
          author?: string
          cover_url?: string | null
          created_at?: string
          current_page?: number
          finished_at?: string | null
          id?: string
          notes?: string | null
          primary_category?: string
          started_at?: string | null
          status?: string
          tags?: string[]
          title: string
          total_pages?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          author?: string
          cover_url?: string | null
          created_at?: string
          current_page?: number
          finished_at?: string | null
          id?: string
          notes?: string | null
          primary_category?: string
          started_at?: string | null
          status?: string
          tags?: string[]
          title?: string
          total_pages?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      demerit_occurrences: {
        Row: {
          created_at: string
          demerit_id: string
          id: string
          note: string | null
          occurred_on: string
          user_id: string
          xp_lost: number
        }
        Insert: {
          created_at?: string
          demerit_id: string
          id?: string
          note?: string | null
          occurred_on?: string
          user_id: string
          xp_lost: number
        }
        Update: {
          created_at?: string
          demerit_id?: string
          id?: string
          note?: string | null
          occurred_on?: string
          user_id?: string
          xp_lost?: number
        }
        Relationships: [
          {
            foreignKeyName: "demerit_occurrences_demerit_id_fkey"
            columns: ["demerit_id"]
            isOneToOne: false
            referencedRelation: "demerits"
            referencedColumns: ["id"]
          },
        ]
      }
      demerits: {
        Row: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
          user_id: string
          xp_penalty: number
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
          user_id: string
          xp_penalty?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          user_id?: string
          xp_penalty?: number
        }
        Relationships: []
      }
      habit_completions: {
        Row: {
          completed_on: string
          created_at: string
          habit_id: string
          id: string
          note: string | null
          user_id: string
          xp_earned: number
        }
        Insert: {
          completed_on?: string
          created_at?: string
          habit_id: string
          id?: string
          note?: string | null
          user_id: string
          xp_earned?: number
        }
        Update: {
          completed_on?: string
          created_at?: string
          habit_id?: string
          id?: string
          note?: string | null
          user_id?: string
          xp_earned?: number
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
          area: string
          created_at: string
          description: string | null
          frequency: string
          id: string
          is_active: boolean
          name: string
          target_per_week: number
          updated_at: string
          user_id: string
          weekdays: number[]
          xp_reward: number
        }
        Insert: {
          area: string
          created_at?: string
          description?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          name: string
          target_per_week?: number
          updated_at?: string
          user_id: string
          weekdays?: number[]
          xp_reward?: number
        }
        Update: {
          area?: string
          created_at?: string
          description?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          name?: string
          target_per_week?: number
          updated_at?: string
          user_id?: string
          weekdays?: number[]
          xp_reward?: number
        }
        Relationships: []
      }
      investments: {
        Row: {
          asset_type: string
          created_at: string
          earnings: number
          id: string
          institution: string
          invested_value: number
          name: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_type: string
          created_at?: string
          earnings?: number
          id?: string
          institution: string
          invested_value?: number
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          earnings?: number
          id?: string
          institution?: string
          invested_value?: number
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reward_transactions: {
        Row: {
          coin_amount: number
          created_at: string
          id: string
          reward_id: string | null
          reward_title: string | null
          transaction_type: string
          user_id: string
          xp_amount: number
        }
        Insert: {
          coin_amount: number
          created_at?: string
          id?: string
          reward_id?: string | null
          reward_title?: string | null
          transaction_type: string
          user_id: string
          xp_amount?: number
        }
        Update: {
          coin_amount?: number
          created_at?: string
          id?: string
          reward_id?: string | null
          reward_title?: string | null
          transaction_type?: string
          user_id?: string
          xp_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "reward_transactions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          coin_cost: number
          created_at: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          coin_cost: number
          created_at?: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          coin_cost?: number
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subtasks: {
        Row: {
          created_at: string
          id: string
          is_completed: boolean
          task_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_completed?: boolean
          task_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_completed?: boolean
          task_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      task_tags: {
        Row: {
          created_at: string
          tag_id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          tag_id: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          tag_id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tags_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          area: string
          completed_at: string | null
          created_at: string
          description: string | null
          difficulty: string
          due_date: string | null
          duration_minutes: number | null
          energy: string
          id: string
          priority: string
          project_id: string | null
          recurrence: string
          status: string
          title: string
          updated_at: string
          user_id: string
          xp_reward: number
        }
        Insert: {
          area: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string
          due_date?: string | null
          duration_minutes?: number | null
          energy?: string
          id?: string
          priority?: string
          project_id?: string | null
          recurrence?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
          xp_reward?: number
        }
        Update: {
          area?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string
          due_date?: string | null
          duration_minutes?: number | null
          energy?: string
          id?: string
          priority?: string
          project_id?: string | null
          recurrence?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_reviews: {
        Row: {
          created_at: string
          execution_goal: number
          focus_1: string
          focus_2: string
          focus_3: string
          id: string
          next_week_priority: string
          pending_notes: string
          priority_habit: string
          updated_at: string
          user_id: string
          week_start: string
          wins: string
        }
        Insert: {
          created_at?: string
          execution_goal?: number
          focus_1?: string
          focus_2?: string
          focus_3?: string
          id?: string
          next_week_priority?: string
          pending_notes?: string
          priority_habit?: string
          updated_at?: string
          user_id: string
          week_start: string
          wins?: string
        }
        Update: {
          created_at?: string
          execution_goal?: number
          focus_1?: string
          focus_2?: string
          focus_3?: string
          id?: string
          next_week_priority?: string
          pending_notes?: string
          priority_habit?: string
          updated_at?: string
          user_id?: string
          week_start?: string
          wins?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      convert_xp_to_coins: {
        Args: { p_coins: number }
        Returns: {
          available_xp: number
          coin_balance: number
        }[]
      }
      get_reward_wallet_summary: {
        Args: never
        Returns: {
          available_xp: number
          coin_balance: number
          converted_xp: number
          net_xp: number
          total_earned_xp: number
        }[]
      }
      get_weekly_area_breakdown: {
        Args: { p_week_start: string }
        Returns: {
          activity_count: number
          area: string
        }[]
      }
      get_weekly_dashboard_metrics: {
        Args: { p_week_start: string }
        Returns: {
          completed_planned_tasks: number
          demerit_occurrences: number
          execution_rate: number
          habit_completion_rate: number
          habit_target: number
          planned_tasks: number
          week_end: string
          week_start: string
        }[]
      }
      get_weekly_demerit_breakdown: {
        Args: { p_week_start: string }
        Returns: {
          demerit_id: string
          occurrences: number
          title: string
          xp_lost: number
        }[]
      }
      get_weekly_habit_breakdown: {
        Args: { p_week_start: string }
        Returns: {
          area: string
          completed: number
          habit_id: string
          habit_name: string
          target: number
        }[]
      }
      get_weekly_review_metrics: {
        Args: { p_week_start: string }
        Returns: {
          habits_completed: number
          neglected_area: string
          overdue_tasks: number
          pending_tasks: number
          planned_minutes: number
          tasks_completed: number
          top_area: string
          week_end: string
          week_start: string
          xp_gained: number
          xp_lost: number
        }[]
      }
      get_weekly_review_pending_tasks: {
        Args: { p_week_start: string }
        Returns: {
          area: string
          due_date: string
          id: string
          title: string
        }[]
      }
      purchase_reward: {
        Args: { p_reward_id: string }
        Returns: {
          coin_balance: number
          purchased_title: string
        }[]
      }
      record_demerit: {
        Args: { p_demerit_id: string; p_note?: string }
        Returns: {
          occurrence_id: string
          xp_lost: number
        }[]
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
