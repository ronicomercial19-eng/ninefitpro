export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      daily_workouts: {
        Row: {
          created_at: string | null
          day_name: string
          day_number: number
          estimated_duration_minutes: number | null
          focus_muscles: string[]
          id: string
          weekly_structure_id: string | null
          workout_type: string | null
        }
        Insert: {
          created_at?: string | null
          day_name: string
          day_number: number
          estimated_duration_minutes?: number | null
          focus_muscles: string[]
          id?: string
          weekly_structure_id?: string | null
          workout_type?: string | null
        }
        Update: {
          created_at?: string | null
          day_name?: string
          day_number?: number
          estimated_duration_minutes?: number | null
          focus_muscles?: string[]
          id?: string
          weekly_structure_id?: string | null
          workout_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_workouts_weekly_structure_id_fkey"
            columns: ["weekly_structure_id"]
            isOneToOne: false
            referencedRelation: "weekly_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_library: {
        Row: {
          benefits: string[] | null
          category: string | null
          common_mistakes: string[] | null
          contraindications: string[] | null
          created_at: string | null
          description: string | null
          difficulty_level: string | null
          equipment_type: string | null
          exercise_type: string | null
          id: string
          image_url: string | null
          instructions: string[] | null
          muscle_groups: string[]
          name: string
          variations: string[] | null
          video_url: string | null
        }
        Insert: {
          benefits?: string[] | null
          category?: string | null
          common_mistakes?: string[] | null
          contraindications?: string[] | null
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          equipment_type?: string | null
          exercise_type?: string | null
          id?: string
          image_url?: string | null
          instructions?: string[] | null
          muscle_groups: string[]
          name: string
          variations?: string[] | null
          video_url?: string | null
        }
        Update: {
          benefits?: string[] | null
          category?: string | null
          common_mistakes?: string[] | null
          contraindications?: string[] | null
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          equipment_type?: string | null
          exercise_type?: string | null
          id?: string
          image_url?: string | null
          instructions?: string[] | null
          muscle_groups?: string[]
          name?: string
          variations?: string[] | null
          video_url?: string | null
        }
        Relationships: []
      }
      periodization_plans: {
        Row: {
          created_at: string | null
          current_phase: number | null
          id: string
          macrocycle_duration_weeks: number | null
          periodization_type: string | null
          plan_name: string
          status: string | null
          total_phases: number | null
          updated_at: string | null
          user_profile_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_phase?: number | null
          id?: string
          macrocycle_duration_weeks?: number | null
          periodization_type?: string | null
          plan_name: string
          status?: string | null
          total_phases?: number | null
          updated_at?: string | null
          user_profile_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_phase?: number | null
          id?: string
          macrocycle_duration_weeks?: number | null
          periodization_type?: string | null
          plan_name?: string
          status?: string | null
          total_phases?: number | null
          updated_at?: string | null
          user_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "periodization_plans_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_phases: {
        Row: {
          created_at: string | null
          duration_weeks: number
          id: string
          intensity_level: string | null
          key_adaptations: string[] | null
          load_percentage: string
          monitoring_markers: string[] | null
          objective: string
          periodization_plan_id: string | null
          phase_name: string
          phase_number: number
          phase_type: string | null
          reps_range: string
          rest_periods_seconds: string
          scientific_rationale: string | null
          sets_range: string
          volume_level: string | null
        }
        Insert: {
          created_at?: string | null
          duration_weeks: number
          id?: string
          intensity_level?: string | null
          key_adaptations?: string[] | null
          load_percentage: string
          monitoring_markers?: string[] | null
          objective: string
          periodization_plan_id?: string | null
          phase_name: string
          phase_number: number
          phase_type?: string | null
          reps_range: string
          rest_periods_seconds: string
          scientific_rationale?: string | null
          sets_range: string
          volume_level?: string | null
        }
        Update: {
          created_at?: string | null
          duration_weeks?: number
          id?: string
          intensity_level?: string | null
          key_adaptations?: string[] | null
          load_percentage?: string
          monitoring_markers?: string[] | null
          objective?: string
          periodization_plan_id?: string | null
          phase_name?: string
          phase_number?: number
          phase_type?: string | null
          reps_range?: string
          rest_periods_seconds?: string
          scientific_rationale?: string | null
          sets_range?: string
          volume_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_phases_periodization_plan_id_fkey"
            columns: ["periodization_plan_id"]
            isOneToOne: false
            referencedRelation: "periodization_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          age: number | null
          created_at: string | null
          experience_level: string | null
          experience_months: number | null
          gender: string | null
          height: number | null
          id: string
          injuries_limitations: string | null
          name: string
          primary_goal: string | null
          session_duration: string | null
          sleep_quality: number | null
          stress_level: number | null
          technique_knowledge: number | null
          training_environment: string | null
          updated_at: string | null
          user_id: string | null
          weekly_frequency: number | null
          weight: number | null
        }
        Insert: {
          age?: number | null
          created_at?: string | null
          experience_level?: string | null
          experience_months?: number | null
          gender?: string | null
          height?: number | null
          id?: string
          injuries_limitations?: string | null
          name: string
          primary_goal?: string | null
          session_duration?: string | null
          sleep_quality?: number | null
          stress_level?: number | null
          technique_knowledge?: number | null
          training_environment?: string | null
          updated_at?: string | null
          user_id?: string | null
          weekly_frequency?: number | null
          weight?: number | null
        }
        Update: {
          age?: number | null
          created_at?: string | null
          experience_level?: string | null
          experience_months?: number | null
          gender?: string | null
          height?: number | null
          id?: string
          injuries_limitations?: string | null
          name?: string
          primary_goal?: string | null
          session_duration?: string | null
          sleep_quality?: number | null
          stress_level?: number | null
          technique_knowledge?: number | null
          training_environment?: string | null
          updated_at?: string | null
          user_id?: string | null
          weekly_frequency?: number | null
          weight?: number | null
        }
        Relationships: []
      }
      weekly_structures: {
        Row: {
          created_at: string | null
          id: string
          split_type: string | null
          structure_name: string
          training_days_per_week: number | null
          training_phase_id: string | null
          week_number: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          split_type?: string | null
          structure_name: string
          training_days_per_week?: number | null
          training_phase_id?: string | null
          week_number: number
        }
        Update: {
          created_at?: string | null
          id?: string
          split_type?: string | null
          structure_name?: string
          training_days_per_week?: number | null
          training_phase_id?: string | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_structures_training_phase_id_fkey"
            columns: ["training_phase_id"]
            isOneToOne: false
            referencedRelation: "training_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercises: {
        Row: {
          created_at: string | null
          daily_workout_id: string | null
          exercise_id: string | null
          exercise_order: number
          id: string
          load_percentage: string | null
          notes: string | null
          reps_range: string
          rest_seconds: number
          rpe_target: number | null
          sets: number
          tempo: string | null
        }
        Insert: {
          created_at?: string | null
          daily_workout_id?: string | null
          exercise_id?: string | null
          exercise_order: number
          id?: string
          load_percentage?: string | null
          notes?: string | null
          reps_range: string
          rest_seconds: number
          rpe_target?: number | null
          sets: number
          tempo?: string | null
        }
        Update: {
          created_at?: string | null
          daily_workout_id?: string | null
          exercise_id?: string | null
          exercise_order?: number
          id?: string
          load_percentage?: string | null
          notes?: string | null
          reps_range?: string
          rest_seconds?: number
          rpe_target?: number | null
          sets?: number
          tempo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_daily_workout_id_fkey"
            columns: ["daily_workout_id"]
            isOneToOne: false
            referencedRelation: "daily_workouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise_library"
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
