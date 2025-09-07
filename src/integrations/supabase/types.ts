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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      aluno_periodizacao: {
        Row: {
          aluno_id: string
          compatibilidade: number | null
          created_at: string
          explicacao: string | null
          id: string
          periodizacao_id: string
          updated_at: string
        }
        Insert: {
          aluno_id: string
          compatibilidade?: number | null
          created_at?: string
          explicacao?: string | null
          id?: string
          periodizacao_id: string
          updated_at?: string
        }
        Update: {
          aluno_id?: string
          compatibilidade?: number | null
          created_at?: string
          explicacao?: string | null
          id?: string
          periodizacao_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aluno_periodizacao_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aluno_periodizacao_periodizacao_id_fkey"
            columns: ["periodizacao_id"]
            isOneToOne: false
            referencedRelation: "periodizations"
            referencedColumns: ["id"]
          },
        ]
      }
      athletes: {
        Row: {
          altura_cm: number | null
          birthdate: string | null
          coach_id: string
          created_at: string
          goals: string[] | null
          id: string
          injuries: string[] | null
          metadata: Json | null
          name: string
          nivel: string | null
          objetivo: string | null
          perfil_classificado: Json | null
          peso_kg: number | null
          respostas_anamnese: Json | null
          restricoes: Json | null
          sessions_per_week: number | null
          training_level: string | null
          updated_at: string
        }
        Insert: {
          altura_cm?: number | null
          birthdate?: string | null
          coach_id: string
          created_at?: string
          goals?: string[] | null
          id?: string
          injuries?: string[] | null
          metadata?: Json | null
          name: string
          nivel?: string | null
          objetivo?: string | null
          perfil_classificado?: Json | null
          peso_kg?: number | null
          respostas_anamnese?: Json | null
          restricoes?: Json | null
          sessions_per_week?: number | null
          training_level?: string | null
          updated_at?: string
        }
        Update: {
          altura_cm?: number | null
          birthdate?: string | null
          coach_id?: string
          created_at?: string
          goals?: string[] | null
          id?: string
          injuries?: string[] | null
          metadata?: Json | null
          name?: string
          nivel?: string | null
          objetivo?: string | null
          perfil_classificado?: Json | null
          peso_kg?: number | null
          respostas_anamnese?: Json | null
          restricoes?: Json | null
          sessions_per_week?: number | null
          training_level?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      class_bookings: {
        Row: {
          booking_time: string | null
          class_id: string | null
          created_at: string | null
          id: string
          status: string | null
          user_email: string
        }
        Insert: {
          booking_time?: string | null
          class_id?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          user_email: string
        }
        Update: {
          booking_time?: string | null
          class_id?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_bookings_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "gym_classes"
            referencedColumns: ["id"]
          },
        ]
      }
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
      estruturas_de_treinamento: {
        Row: {
          carga: number | null
          dia: number
          exercicio_id: string | null
          id: string
          modelo_id: string | null
          ordem: number
          repeticoes: string | null
          series: number | null
        }
        Insert: {
          carga?: number | null
          dia: number
          exercicio_id?: string | null
          id?: string
          modelo_id?: string | null
          ordem: number
          repeticoes?: string | null
          series?: number | null
        }
        Update: {
          carga?: number | null
          dia?: number
          exercicio_id?: string | null
          id?: string
          modelo_id?: string | null
          ordem?: number
          repeticoes?: string | null
          series?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estruturas_de_treinamento_exercicio_id_fkey"
            columns: ["exercicio_id"]
            isOneToOne: false
            referencedRelation: "exercicios_novos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estruturas_de_treinamento_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "modelos_de_treino"
            referencedColumns: ["id"]
          },
        ]
      }
      estudantes: {
        Row: {
          altura: number | null
          criado_em: string | null
          data_nascimento: string | null
          email: string
          id: string
          nome: string
          peso: number | null
        }
        Insert: {
          altura?: number | null
          criado_em?: string | null
          data_nascimento?: string | null
          email: string
          id?: string
          nome: string
          peso?: number | null
        }
        Update: {
          altura?: number | null
          criado_em?: string | null
          data_nascimento?: string | null
          email?: string
          id?: string
          nome?: string
          peso?: number | null
        }
        Relationships: []
      }
      exercicios_novos: {
        Row: {
          criado_em: string | null
          grupo_muscular: string
          id: string
          nome: string
          video_url: string | null
        }
        Insert: {
          criado_em?: string | null
          grupo_muscular: string
          id?: string
          nome: string
          video_url?: string | null
        }
        Update: {
          criado_em?: string | null
          grupo_muscular?: string
          id?: string
          nome?: string
          video_url?: string | null
        }
        Relationships: []
      }
      exercise_library: {
        Row: {
          categoria: Json | null
          id: string
          nome: Json | null
        }
        Insert: {
          categoria?: Json | null
          id?: string
          nome?: Json | null
        }
        Update: {
          categoria?: Json | null
          id?: string
          nome?: Json | null
        }
        Relationships: []
      }
      exercises: {
        Row: {
          created_at: string | null
          description: string | null
          difficulty_level: string | null
          equipment: string | null
          goal: string | null
          id: string
          instructions: string | null
          is_optional: boolean | null
          name: string
          phase: string | null
          target_muscles: string[]
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          equipment?: string | null
          goal?: string | null
          id?: string
          instructions?: string | null
          is_optional?: boolean | null
          name: string
          phase?: string | null
          target_muscles?: string[]
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          equipment?: string | null
          goal?: string | null
          id?: string
          instructions?: string | null
          is_optional?: boolean | null
          name?: string
          phase?: string | null
          target_muscles?: string[]
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      generated_workout_plans: {
        Row: {
          duration_months: number
          feedback_data: Json | null
          generated_at: string | null
          id: string
          plan_data: Json
          status: string | null
          user_profile_id: string | null
          variation_used: string
        }
        Insert: {
          duration_months: number
          feedback_data?: Json | null
          generated_at?: string | null
          id?: string
          plan_data: Json
          status?: string | null
          user_profile_id?: string | null
          variation_used: string
        }
        Update: {
          duration_months?: number
          feedback_data?: Json | null
          generated_at?: string | null
          id?: string
          plan_data?: Json
          status?: string | null
          user_profile_id?: string | null
          variation_used?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_workout_plans_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_classes: {
        Row: {
          available_slots: number
          class_datetime: string
          class_name: string
          created_at: string | null
          description: string | null
          id: string
          instructor_name: string | null
          location: string
        }
        Insert: {
          available_slots?: number
          class_datetime: string
          class_name: string
          created_at?: string | null
          description?: string | null
          id?: string
          instructor_name?: string | null
          location: string
        }
        Update: {
          available_slots?: number
          class_datetime?: string
          class_name?: string
          created_at?: string | null
          description?: string | null
          id?: string
          instructor_name?: string | null
          location?: string
        }
        Relationships: []
      }
      link_de_video: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      modelos_de_treino: {
        Row: {
          criado_em: string | null
          descricao: string | null
          duracao_em_semanas: number | null
          id: string
          nome: string
        }
        Insert: {
          criado_em?: string | null
          descricao?: string | null
          duracao_em_semanas?: number | null
          id?: string
          nome: string
        }
        Update: {
          criado_em?: string | null
          descricao?: string | null
          duracao_em_semanas?: number | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      periodizacoes_novas: {
        Row: {
          carga_prevista: number | null
          carga_real: number | null
          criado_em: string | null
          estudante_id: string | null
          id: string
          semana: number
        }
        Insert: {
          carga_prevista?: number | null
          carga_real?: number | null
          criado_em?: string | null
          estudante_id?: string | null
          id?: string
          semana: number
        }
        Update: {
          carga_prevista?: number | null
          carga_real?: number | null
          criado_em?: string | null
          estudante_id?: string | null
          id?: string
          semana?: number
        }
        Relationships: [
          {
            foreignKeyName: "periodizacoes_novas_estudante_id_fkey"
            columns: ["estudante_id"]
            isOneToOne: false
            referencedRelation: "estudantes"
            referencedColumns: ["id"]
          },
        ]
      }
      periodization_models: {
        Row: {
          created_at: string | null
          description: string
          duration: string
          goal: string
          graph_data: Json
          id: string
          macrocycle: Json
          mesocycle: Json
          microcycle: Json
          recommended_for: Json
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          duration: string
          goal: string
          graph_data?: Json
          id: string
          macrocycle?: Json
          mesocycle?: Json
          microcycle?: Json
          recommended_for?: Json
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          duration?: string
          goal?: string
          graph_data?: Json
          id?: string
          macrocycle?: Json
          mesocycle?: Json
          microcycle?: Json
          recommended_for?: Json
          title?: string
          updated_at?: string | null
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
      periodization_variations: {
        Row: {
          created_at: string | null
          duration_months: number
          id: string
          structure_data: Json
          variation_name: string
        }
        Insert: {
          created_at?: string | null
          duration_months: number
          id?: string
          structure_data: Json
          variation_name: string
        }
        Update: {
          created_at?: string | null
          duration_months?: number
          id?: string
          structure_data?: Json
          variation_name?: string
        }
        Relationships: []
      }
      periodizations: {
        Row: {
          created_at: string | null
          current_phase: string | null
          description: string | null
          duration: string | null
          file_type: string | null
          file_url: string | null
          graph_data: Json | null
          id: string
          macrocycle: Json | null
          mesocycle: Json | null
          microcycle: Json | null
          periodization_data: Json | null
          phase_duration_weeks: number | null
          professor_id: string
          recommended_for: Json | null
          title: string
          total_phases: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_phase?: string | null
          description?: string | null
          duration?: string | null
          file_type?: string | null
          file_url?: string | null
          graph_data?: Json | null
          id?: string
          macrocycle?: Json | null
          mesocycle?: Json | null
          microcycle?: Json | null
          periodization_data?: Json | null
          phase_duration_weeks?: number | null
          professor_id: string
          recommended_for?: Json | null
          title: string
          total_phases?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_phase?: string | null
          description?: string | null
          duration?: string | null
          file_type?: string | null
          file_url?: string | null
          graph_data?: Json | null
          id?: string
          macrocycle?: Json | null
          mesocycle?: Json | null
          microcycle?: Json | null
          periodization_data?: Json | null
          phase_duration_weeks?: number | null
          professor_id?: string
          recommended_for?: Json | null
          title?: string
          total_phases?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      physical_assessments: {
        Row: {
          assessment_date: string
          core_resistance_after: number | null
          core_resistance_before: number | null
          created_at: string | null
          id: string
          lower_pull_after: number | null
          lower_pull_before: number | null
          lower_push_after: number | null
          lower_push_before: number | null
          notes: string | null
          professor_id: string
          updated_at: string | null
          upper_pull_after: number | null
          upper_pull_before: number | null
          upper_push_after: number | null
          upper_push_before: number | null
          user_id: string
        }
        Insert: {
          assessment_date?: string
          core_resistance_after?: number | null
          core_resistance_before?: number | null
          created_at?: string | null
          id?: string
          lower_pull_after?: number | null
          lower_pull_before?: number | null
          lower_push_after?: number | null
          lower_push_before?: number | null
          notes?: string | null
          professor_id: string
          updated_at?: string | null
          upper_pull_after?: number | null
          upper_pull_before?: number | null
          upper_push_after?: number | null
          upper_push_before?: number | null
          user_id: string
        }
        Update: {
          assessment_date?: string
          core_resistance_after?: number | null
          core_resistance_before?: number | null
          created_at?: string | null
          id?: string
          lower_pull_after?: number | null
          lower_pull_before?: number | null
          lower_push_after?: number | null
          lower_push_before?: number | null
          notes?: string | null
          professor_id?: string
          updated_at?: string | null
          upper_pull_after?: number | null
          upper_pull_before?: number | null
          upper_push_after?: number | null
          upper_push_before?: number | null
          user_id?: string
        }
        Relationships: []
      }
      planos_de_treino_gerados: {
        Row: {
          criado_em: string | null
          estudante_id: string | null
          id: string
          modelo_id: string | null
        }
        Insert: {
          criado_em?: string | null
          estudante_id?: string | null
          id?: string
          modelo_id?: string | null
        }
        Update: {
          criado_em?: string | null
          estudante_id?: string | null
          id?: string
          modelo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planos_de_treino_gerados_estudante_id_fkey"
            columns: ["estudante_id"]
            isOneToOne: false
            referencedRelation: "estudantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_de_treino_gerados_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "modelos_de_treino"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          athlete_id: string
          created_at: string
          filled_variables: Json | null
          generated_html: string | null
          id: string
          pdf_url: string | null
          periodization_id: string
          start_date: string
          status: string | null
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          filled_variables?: Json | null
          generated_html?: string | null
          id?: string
          pdf_url?: string | null
          periodization_id: string
          start_date: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          filled_variables?: Json | null
          generated_html?: string | null
          id?: string
          pdf_url?: string | null
          periodization_id?: string
          start_date?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_plans_athlete"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plans_periodization"
            columns: ["periodization_id"]
            isOneToOne: false
            referencedRelation: "periodizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_periodization_matches: {
        Row: {
          created_at: string | null
          id: string
          match_factors: Json
          match_percentage: number
          periodization_model_id: string | null
          recommended_rank: number
          user_profile_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          match_factors: Json
          match_percentage: number
          periodization_model_id?: string | null
          recommended_rank: number
          user_profile_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          match_factors?: Json
          match_percentage?: number
          periodization_model_id?: string | null
          recommended_rank?: number
          user_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_periodization_matches_periodization_model_id_fkey"
            columns: ["periodization_model_id"]
            isOneToOne: false
            referencedRelation: "periodization_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_periodization_matches_periodization_model_id_fkey"
            columns: ["periodization_model_id"]
            isOneToOne: false
            referencedRelation: "v_periodizations_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_periodization_matches_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      program_workouts: {
        Row: {
          created_at: string | null
          id: string
          program_id: string | null
          workout_id: string | null
          workout_order: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          program_id?: string | null
          workout_id?: string | null
          workout_order: number
        }
        Update: {
          created_at?: string | null
          id?: string
          program_id?: string | null
          workout_id?: string | null
          workout_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_workouts_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_workouts_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string | null
          description: string
          id: string
          program_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          program_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          program_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      questionnaire_responses: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          questionnaire_id: string
          recommendations: string[] | null
          responses: Json
          score: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          questionnaire_id: string
          recommendations?: string[] | null
          responses: Json
          score?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          questionnaire_id?: string
          recommendations?: string[] | null
          responses?: Json
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_responses_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "questionnaires"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaires: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          questions: Json
          recommendations: Json | null
          scoring_system: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          questions: Json
          recommendations?: Json | null
          scoring_system?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          questions?: Json
          recommendations?: Json | null
          scoring_system?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      real_time_analytics: {
        Row: {
          analysis_type: string
          confidence_score: number | null
          data: Json
          generated_at: string | null
          id: string
          insights: string[] | null
          recommendations: string[] | null
          user_id: string
        }
        Insert: {
          analysis_type: string
          confidence_score?: number | null
          data: Json
          generated_at?: string | null
          id?: string
          insights?: string[] | null
          recommendations?: string[] | null
          user_id: string
        }
        Update: {
          analysis_type?: string
          confidence_score?: number | null
          data?: Json
          generated_at?: string | null
          id?: string
          insights?: string[] | null
          recommendations?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      strength_records: {
        Row: {
          created_at: string
          exercise_name: string
          id: string
          notes: string | null
          recorded_at: string
          reps: number
          sets: number
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          exercise_name: string
          id?: string
          notes?: string | null
          recorded_at?: string
          reps?: number
          sets?: number
          user_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          exercise_name?: string
          id?: string
          notes?: string | null
          recorded_at?: string
          reps?: number
          sets?: number
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      student_activity_history: {
        Row: {
          activity_date: string
          activity_name: string
          activity_type: string
          created_at: string | null
          details: Json | null
          id: string
          status: string | null
          student_id: string
        }
        Insert: {
          activity_date?: string
          activity_name: string
          activity_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          status?: string | null
          student_id: string
        }
        Update: {
          activity_date?: string
          activity_name?: string
          activity_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_activity_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_anamnesis: {
        Row: {
          category: string
          completed_at: string | null
          created_at: string | null
          id: string
          questions_answers: Json
          student_id: string
          title: string
        }
        Insert: {
          category: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          questions_answers?: Json
          student_id: string
          title: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          questions_answers?: Json
          student_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_anamnesis_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_measurements: {
        Row: {
          altura_cm: number | null
          circunferencia_braco_cm: number | null
          circunferencia_cintura_cm: number | null
          circunferencia_coxa_cm: number | null
          circunferencia_panturrilha_cm: number | null
          circunferencia_peitoral_cm: number | null
          circunferencia_quadril_cm: number | null
          created_at: string | null
          gordura_corporal: number | null
          id: string
          imc: number | null
          massa_muscular: number | null
          measurement_date: string
          observacoes: string | null
          peso_kg: number | null
          student_id: string
        }
        Insert: {
          altura_cm?: number | null
          circunferencia_braco_cm?: number | null
          circunferencia_cintura_cm?: number | null
          circunferencia_coxa_cm?: number | null
          circunferencia_panturrilha_cm?: number | null
          circunferencia_peitoral_cm?: number | null
          circunferencia_quadril_cm?: number | null
          created_at?: string | null
          gordura_corporal?: number | null
          id?: string
          imc?: number | null
          massa_muscular?: number | null
          measurement_date?: string
          observacoes?: string | null
          peso_kg?: number | null
          student_id: string
        }
        Update: {
          altura_cm?: number | null
          circunferencia_braco_cm?: number | null
          circunferencia_cintura_cm?: number | null
          circunferencia_coxa_cm?: number | null
          circunferencia_panturrilha_cm?: number | null
          circunferencia_peitoral_cm?: number | null
          circunferencia_quadril_cm?: number | null
          created_at?: string | null
          gordura_corporal?: number | null
          id?: string
          imc?: number | null
          massa_muscular?: number | null
          measurement_date?: string
          observacoes?: string | null
          peso_kg?: number | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_measurements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_photos: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          photo_category: string | null
          photo_type: string
          photo_url: string
          student_id: string
          taken_date: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          photo_category?: string | null
          photo_type: string
          photo_url: string
          student_id: string
          taken_date?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          photo_category?: string | null
          photo_type?: string
          photo_url?: string
          student_id?: string
          taken_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_photos_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_training_assignments: {
        Row: {
          created_at: string | null
          created_by: string
          end_date: string | null
          id: string
          is_active: boolean | null
          start_date: string
          student_id: string
          training_data: Json
          training_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string
          student_id: string
          training_data?: Json
          training_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string
          student_id?: string
          training_data?: Json
          training_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_training_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          altura_cm: number | null
          ativo: boolean | null
          cpf: string | null
          created_at: string | null
          data_nascimento: string | null
          data_vencimento_plano: string | null
          email: string
          endereco_completo: string | null
          estado_civil: string | null
          forma_pagamento: string | null
          foto_url: string | null
          id: string
          nivel_experiencia: string | null
          nome: string
          objetivo: string
          observacoes: string | null
          peso_kg: number | null
          professor_id: string
          profile_id: string | null
          profissao: string | null
          status_pagamento: string | null
          telefone: string | null
          updated_at: string | null
          valor_mensalidade: number | null
          whatsapp: string | null
        }
        Insert: {
          altura_cm?: number | null
          ativo?: boolean | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          data_vencimento_plano?: string | null
          email: string
          endereco_completo?: string | null
          estado_civil?: string | null
          forma_pagamento?: string | null
          foto_url?: string | null
          id?: string
          nivel_experiencia?: string | null
          nome: string
          objetivo: string
          observacoes?: string | null
          peso_kg?: number | null
          professor_id: string
          profile_id?: string | null
          profissao?: string | null
          status_pagamento?: string | null
          telefone?: string | null
          updated_at?: string | null
          valor_mensalidade?: number | null
          whatsapp?: string | null
        }
        Update: {
          altura_cm?: number | null
          ativo?: boolean | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          data_vencimento_plano?: string | null
          email?: string
          endereco_completo?: string | null
          estado_civil?: string | null
          forma_pagamento?: string | null
          foto_url?: string | null
          id?: string
          nivel_experiencia?: string | null
          nome?: string
          objetivo?: string
          observacoes?: string | null
          peso_kg?: number | null
          professor_id?: string
          profile_id?: string | null
          profissao?: string | null
          status_pagamento?: string | null
          telefone?: string | null
          updated_at?: string | null
          valor_mensalidade?: number | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          key: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          key: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          key?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
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
      training_programs: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty_level: string | null
          duration_weeks: number | null
          equipment_needed: string[] | null
          frequency_per_week: number | null
          goal: string | null
          id: string
          is_ai_generated: boolean | null
          name: string
          program_structure: Json | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration_weeks?: number | null
          equipment_needed?: string[] | null
          frequency_per_week?: number | null
          goal?: string | null
          id?: string
          is_ai_generated?: boolean | null
          name: string
          program_structure?: Json | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration_weeks?: number | null
          equipment_needed?: string[] | null
          frequency_per_week?: number | null
          goal?: string | null
          id?: string
          is_ai_generated?: boolean | null
          name?: string
          program_structure?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      training_structures: {
        Row: {
          created_at: string | null
          description: string | null
          duration_months: number
          id: string
          name: string
          structure_data: Json
          target_level: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_months: number
          id?: string
          name: string
          structure_data: Json
          target_level: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_months?: number
          id?: string
          name?: string
          structure_data?: Json
          target_level?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_name: string
          achievement_type: string
          created_at: string | null
          description: string | null
          id: string
          points: number | null
          unlocked_at: string | null
          user_email: string
        }
        Insert: {
          achievement_name: string
          achievement_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          points?: number | null
          unlocked_at?: string | null
          user_email: string
        }
        Update: {
          achievement_name?: string
          achievement_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          points?: number | null
          unlocked_at?: string | null
          user_email?: string
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          created_at: string | null
          credits_remaining: number | null
          id: string
          plan_type: string | null
          total_credits: number | null
          updated_at: string | null
          user_email: string
        }
        Insert: {
          created_at?: string | null
          credits_remaining?: number | null
          id?: string
          plan_type?: string | null
          total_credits?: number | null
          updated_at?: string | null
          user_email: string
        }
        Update: {
          created_at?: string | null
          credits_remaining?: number | null
          id?: string
          plan_type?: string | null
          total_credits?: number | null
          updated_at?: string | null
          user_email?: string
        }
        Relationships: []
      }
      user_metrics: {
        Row: {
          category: string | null
          id: string
          metric_type: string
          notes: string | null
          recorded_at: string | null
          source: string | null
          test_date: string | null
          unit: string
          user_id: string
          value: number
        }
        Insert: {
          category?: string | null
          id?: string
          metric_type: string
          notes?: string | null
          recorded_at?: string | null
          source?: string | null
          test_date?: string | null
          unit: string
          user_id: string
          value: number
        }
        Update: {
          category?: string | null
          id?: string
          metric_type?: string
          notes?: string | null
          recorded_at?: string | null
          source?: string | null
          test_date?: string | null
          unit?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          created_at: string | null
          expires_at: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          monthly_price: number | null
          plan_name: string
          plan_type: string
          started_at: string | null
          user_email: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          monthly_price?: number | null
          plan_name: string
          plan_type: string
          started_at?: string | null
          user_email: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          monthly_price?: number | null
          plan_name?: string
          plan_type?: string
          started_at?: string | null
          user_email?: string
        }
        Relationships: []
      }
      user_profile_details: {
        Row: {
          body_fat_percentage: number | null
          created_at: string | null
          goal: string | null
          id: string
          name: string | null
          payment_method: string | null
          photo_url: string | null
          updated_at: string | null
          user_email: string
          weight: number | null
        }
        Insert: {
          body_fat_percentage?: number | null
          created_at?: string | null
          goal?: string | null
          id?: string
          name?: string | null
          payment_method?: string | null
          photo_url?: string | null
          updated_at?: string | null
          user_email: string
          weight?: number | null
        }
        Update: {
          body_fat_percentage?: number | null
          created_at?: string | null
          goal?: string | null
          id?: string
          name?: string | null
          payment_method?: string | null
          photo_url?: string | null
          updated_at?: string | null
          user_email?: string
          weight?: number | null
        }
        Relationships: []
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
      user_profiles_extended: {
        Row: {
          age: number | null
          created_at: string | null
          email: string | null
          experience_level: string | null
          gender: string | null
          height: number | null
          id: string
          injuries_limitations: string | null
          name: string
          phone: string | null
          primary_goal: string | null
          training_environment: string | null
          updated_at: string | null
          user_id: string
          user_type: string
          weight: number | null
        }
        Insert: {
          age?: number | null
          created_at?: string | null
          email?: string | null
          experience_level?: string | null
          gender?: string | null
          height?: number | null
          id?: string
          injuries_limitations?: string | null
          name: string
          phone?: string | null
          primary_goal?: string | null
          training_environment?: string | null
          updated_at?: string | null
          user_id: string
          user_type?: string
          weight?: number | null
        }
        Update: {
          age?: number | null
          created_at?: string | null
          email?: string | null
          experience_level?: string | null
          gender?: string | null
          height?: number | null
          id?: string
          injuries_limitations?: string | null
          name?: string
          phone?: string | null
          primary_goal?: string | null
          training_environment?: string | null
          updated_at?: string | null
          user_id?: string
          user_type?: string
          weight?: number | null
        }
        Relationships: []
      }
      user_program_progress: {
        Row: {
          created_at: string | null
          current_workout_index: number | null
          id: string
          is_active: boolean | null
          program_id: string | null
          program_start_date: string | null
          support_level: string | null
          updated_at: string | null
          user_email: string
          workouts_completed: number | null
        }
        Insert: {
          created_at?: string | null
          current_workout_index?: number | null
          id?: string
          is_active?: boolean | null
          program_id?: string | null
          program_start_date?: string | null
          support_level?: string | null
          updated_at?: string | null
          user_email: string
          workouts_completed?: number | null
        }
        Update: {
          created_at?: string | null
          current_workout_index?: number | null
          id?: string
          is_active?: boolean | null
          program_id?: string | null
          program_start_date?: string | null
          support_level?: string | null
          updated_at?: string | null
          user_email?: string
          workouts_completed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_program_progress_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_workout_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          date: string | null
          exercise_name: string
          id: string
          program_id: string | null
          sets_completed: Json | null
          total_time_minutes: number | null
          user_email: string
          workout_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          date?: string | null
          exercise_name: string
          id?: string
          program_id?: string | null
          sets_completed?: Json | null
          total_time_minutes?: number | null
          user_email: string
          workout_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          date?: string | null
          exercise_name?: string
          id?: string
          program_id?: string | null
          sets_completed?: Json | null
          total_time_minutes?: number | null
          user_email?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_workout_logs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_workout_logs_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      vacation_freeze_requests: {
        Row: {
          created_at: string | null
          freeze_end_date: string
          freeze_start_date: string
          id: string
          reason: string | null
          request_date: string | null
          status: string | null
          user_email: string
        }
        Insert: {
          created_at?: string | null
          freeze_end_date: string
          freeze_start_date: string
          id?: string
          reason?: string | null
          request_date?: string | null
          status?: string | null
          user_email: string
        }
        Update: {
          created_at?: string | null
          freeze_end_date?: string
          freeze_start_date?: string
          id?: string
          reason?: string | null
          request_date?: string | null
          status?: string | null
          user_email?: string
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
      workout_models: {
        Row: {
          additional_observations: string | null
          created_at: string | null
          exercise_fields: Json | null
          format_type: string
          general_objective: string
          id: string
          initial_activation: string
          level: string
          method_description: string
          model_order: number
          name: string
          periodization_phase: string
          sequence_description: string | null
          stimulus_type: string
          structure_description: string
          timer_enabled: boolean
          timer_type: string | null
          updated_at: string | null
          voice_cadence_enabled: boolean
          voice_cadence_pattern: string | null
          week_number: number
        }
        Insert: {
          additional_observations?: string | null
          created_at?: string | null
          exercise_fields?: Json | null
          format_type: string
          general_objective: string
          id?: string
          initial_activation: string
          level: string
          method_description: string
          model_order: number
          name: string
          periodization_phase: string
          sequence_description?: string | null
          stimulus_type: string
          structure_description: string
          timer_enabled?: boolean
          timer_type?: string | null
          updated_at?: string | null
          voice_cadence_enabled?: boolean
          voice_cadence_pattern?: string | null
          week_number: number
        }
        Update: {
          additional_observations?: string | null
          created_at?: string | null
          exercise_fields?: Json | null
          format_type?: string
          general_objective?: string
          id?: string
          initial_activation?: string
          level?: string
          method_description?: string
          model_order?: number
          name?: string
          periodization_phase?: string
          sequence_description?: string | null
          stimulus_type?: string
          structure_description?: string
          timer_enabled?: boolean
          timer_type?: string | null
          updated_at?: string | null
          voice_cadence_enabled?: boolean
          voice_cadence_pattern?: string | null
          week_number?: number
        }
        Relationships: []
      }
      workout_program_exercises: {
        Row: {
          created_at: string | null
          default_reps: string
          default_series: number
          description: string | null
          exercise_name: string
          exercise_order: number
          id: string
          rest_time_seconds: number | null
          video_url: string | null
          workout_id: string | null
        }
        Insert: {
          created_at?: string | null
          default_reps?: string
          default_series?: number
          description?: string | null
          exercise_name: string
          exercise_order: number
          id?: string
          rest_time_seconds?: number | null
          video_url?: string | null
          workout_id?: string | null
        }
        Update: {
          created_at?: string | null
          default_reps?: string
          default_series?: number
          description?: string | null
          exercise_name?: string
          exercise_order?: number
          id?: string
          rest_time_seconds?: number | null
          video_url?: string | null
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_program_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_schedules: {
        Row: {
          created_at: string | null
          id: string
          is_recurring: boolean | null
          notes: string | null
          professor_id: string | null
          recurrence_pattern: string | null
          scheduled_date: string
          scheduled_time: string
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
          workout_plan_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          professor_id?: string | null
          recurrence_pattern?: string | null
          scheduled_date: string
          scheduled_time: string
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          workout_plan_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          professor_id?: string | null
          recurrence_pattern?: string | null
          scheduled_date?: string
          scheduled_time?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          workout_plan_id?: string | null
        }
        Relationships: []
      }
      workout_templates: {
        Row: {
          created_at: string | null
          exercise_count: number | null
          goal: string
          id: string
          name: string
          phase: string
          template_data: Json
        }
        Insert: {
          created_at?: string | null
          exercise_count?: number | null
          goal: string
          id?: string
          name: string
          phase: string
          template_data: Json
        }
        Update: {
          created_at?: string | null
          exercise_count?: number | null
          goal?: string
          id?: string
          name?: string
          phase?: string
          template_data?: Json
        }
        Relationships: []
      }
      workouts: {
        Row: {
          created_at: string | null
          day_number: number
          exercises: Json
          id: string
          method: string | null
          notes: string | null
          periodization_id: string | null
          phase: string
          status: string | null
          student_id: string | null
          updated_at: string | null
          week_number: number
        }
        Insert: {
          created_at?: string | null
          day_number: number
          exercises?: Json
          id?: string
          method?: string | null
          notes?: string | null
          periodization_id?: string | null
          phase: string
          status?: string | null
          student_id?: string | null
          updated_at?: string | null
          week_number: number
        }
        Update: {
          created_at?: string | null
          day_number?: number
          exercises?: Json
          id?: string
          method?: string | null
          notes?: string | null
          periodization_id?: string | null
          phase?: string
          status?: string | null
          student_id?: string | null
          updated_at?: string | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "workouts_periodization_id_fkey"
            columns: ["periodization_id"]
            isOneToOne: false
            referencedRelation: "periodizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workouts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_periodizations_catalog: {
        Row: {
          created_at: string | null
          description: string | null
          duration: string | null
          goal: string | null
          graph_data: Json | null
          id: string | null
          macrocycle: Json | null
          mesocycle: Json | null
          microcycle: Json | null
          recommended_for: Json | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration?: string | null
          goal?: string | null
          graph_data?: Json | null
          id?: string | null
          macrocycle?: Json | null
          mesocycle?: Json | null
          microcycle?: Json | null
          recommended_for?: Json | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration?: string | null
          goal?: string | null
          graph_data?: Json | null
          id?: string | null
          macrocycle?: Json | null
          mesocycle?: Json | null
          microcycle?: Json | null
          recommended_for?: Json | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calcular_periodizacao_correspondencia: {
        Args: { estudante: string }
        Returns: {
          carga_prevista: number
          carga_real: number
          diferenca: number
          semana: number
        }[]
      }
      calculate_periodization_match: {
        Args: {
          model_goal: string
          model_recommended_for: Json
          profile_age: number
          profile_experience: string
          profile_goal: string
          profile_injuries: string
        }
        Returns: number
      }
      match_periodizations_for_profile: {
        Args: { p_user_profile_id: string }
        Returns: {
          match_factors: Json
          match_percentage: number
          periodization_model_id: string
          title: string
        }[]
      }
    }
    Enums: {
      user_role: "admin" | "student" | "professor"
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
      user_role: ["admin", "student", "professor"],
    },
  },
} as const
