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
            foreignKeyName: "aluno_periodizacao_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "v_students_canonical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aluno_periodizacao_periodizacao_id_fkey"
            columns: ["periodizacao_id"]
            isOneToOne: false
            referencedRelation: "periodizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aluno_periodizacao_periodizacao_id_fkey"
            columns: ["periodizacao_id"]
            isOneToOne: false
            referencedRelation: "v_periodizations_canonical"
            referencedColumns: ["id"]
          },
        ]
      }
      alunos: {
        Row: {
          altura_cm: number | null
          ambiente_treino: string | null
          data_cadastro: string | null
          data_fim_plano: string | null
          data_inicio_plano: string | null
          data_nascimento: string | null
          email: string
          foto_perfil_url: string | null
          frequencia_semanal: number | null
          genero: string | null
          historico_medico: string | null
          id: string
          id_plano_ativo: string | null
          nivel_experiencia: string | null
          nome: string
          nome_completo: string | null
          objetivo: string
          observacoes: string | null
          peso_atual: number | null
          professor_id: string
          restricoes_alimentares: string | null
          restricoes_medicas: string | null
          status: Database["public"]["Enums"]["aluno_status"] | null
          status_plano: string | null
          telefone: string | null
          ultima_atualizacao: string | null
        }
        Insert: {
          altura_cm?: number | null
          ambiente_treino?: string | null
          data_cadastro?: string | null
          data_fim_plano?: string | null
          data_inicio_plano?: string | null
          data_nascimento?: string | null
          email: string
          foto_perfil_url?: string | null
          frequencia_semanal?: number | null
          genero?: string | null
          historico_medico?: string | null
          id?: string
          id_plano_ativo?: string | null
          nivel_experiencia?: string | null
          nome: string
          nome_completo?: string | null
          objetivo: string
          observacoes?: string | null
          peso_atual?: number | null
          professor_id: string
          restricoes_alimentares?: string | null
          restricoes_medicas?: string | null
          status?: Database["public"]["Enums"]["aluno_status"] | null
          status_plano?: string | null
          telefone?: string | null
          ultima_atualizacao?: string | null
        }
        Update: {
          altura_cm?: number | null
          ambiente_treino?: string | null
          data_cadastro?: string | null
          data_fim_plano?: string | null
          data_inicio_plano?: string | null
          data_nascimento?: string | null
          email?: string
          foto_perfil_url?: string | null
          frequencia_semanal?: number | null
          genero?: string | null
          historico_medico?: string | null
          id?: string
          id_plano_ativo?: string | null
          nivel_experiencia?: string | null
          nome?: string
          nome_completo?: string | null
          objetivo?: string
          observacoes?: string | null
          peso_atual?: number | null
          professor_id?: string
          restricoes_alimentares?: string | null
          restricoes_medicas?: string | null
          status?: Database["public"]["Enums"]["aluno_status"] | null
          status_plano?: string | null
          telefone?: string | null
          ultima_atualizacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alunos_id_plano_ativo_fkey"
            columns: ["id_plano_ativo"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id_plano"]
          },
        ]
      }
      ambiente_config: {
        Row: {
          chave: string
          valor: string
        }
        Insert: {
          chave: string
          valor: string
        }
        Update: {
          chave?: string
          valor?: string
        }
        Relationships: []
      }
      analises_ia_aluno: {
        Row: {
          alertas: string[] | null
          aluno_id: string
          confianca_score: number | null
          contexto_analise: string
          created_at: string | null
          dados_entrada: Json
          id: string
          insights: string[] | null
          modelo_ia_usado: string | null
          professor_id: string
          recomendacoes: string[] | null
          resultado_analise: Json
          tempo_processamento_ms: number | null
          tipo_analise: Database["public"]["Enums"]["tipo_analise"]
        }
        Insert: {
          alertas?: string[] | null
          aluno_id: string
          confianca_score?: number | null
          contexto_analise: string
          created_at?: string | null
          dados_entrada: Json
          id?: string
          insights?: string[] | null
          modelo_ia_usado?: string | null
          professor_id: string
          recomendacoes?: string[] | null
          resultado_analise: Json
          tempo_processamento_ms?: number | null
          tipo_analise: Database["public"]["Enums"]["tipo_analise"]
        }
        Update: {
          alertas?: string[] | null
          aluno_id?: string
          confianca_score?: number | null
          contexto_analise?: string
          created_at?: string | null
          dados_entrada?: Json
          id?: string
          insights?: string[] | null
          modelo_ia_usado?: string | null
          professor_id?: string
          recomendacoes?: string[] | null
          resultado_analise?: Json
          tempo_processamento_ms?: number | null
          tipo_analise?: Database["public"]["Enums"]["tipo_analise"]
        }
        Relationships: [
          {
            foreignKeyName: "analises_ia_aluno_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          created_at: string | null
          description: string | null
          duration: number | null
          id: string
          location: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["appointment_status"] | null
          student_id: string
          teacher_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          location?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          student_id: string
          teacher_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          location?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          student_id?: string
          teacher_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      athlete_auth_link: {
        Row: {
          athlete_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_auth_link_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: true
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_auth_link_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: true
            referencedRelation: "v_students_canonical"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_periodizations: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          athlete_id: string | null
          created_at: string | null
          id: string
          match_factors: Json | null
          match_percentage: number | null
          notes: string | null
          periodization_model_id: string
          status: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          athlete_id?: string | null
          created_at?: string | null
          id?: string
          match_factors?: Json | null
          match_percentage?: number | null
          notes?: string | null
          periodization_model_id: string
          status?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          athlete_id?: string | null
          created_at?: string | null
          id?: string
          match_factors?: Json | null
          match_percentage?: number | null
          notes?: string | null
          periodization_model_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_periodizations_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_periodizations_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "v_students_canonical"
            referencedColumns: ["id"]
          },
        ]
      }
      athletes: {
        Row: {
          activated: boolean | null
          age: number | null
          altura_cm: number | null
          auto_password_temp: string | null
          birthdate: string | null
          coach_id: string
          created_at: string
          email: string | null
          experience_level: string | null
          gender: string | null
          goals: string[] | null
          id: string
          injuries: string[] | null
          injuries_limitations: string | null
          invitation_sent: boolean | null
          invitation_token: string | null
          metadata: Json | null
          name: string
          nivel: string | null
          objetivo: string | null
          password_changed: boolean | null
          perfil_classificado: Json | null
          peso_kg: number | null
          phone: string | null
          primary_goal: string | null
          respostas_anamnese: Json | null
          restricoes: Json | null
          session_duration: string | null
          sessions_per_week: number | null
          training_environment: string | null
          training_level: string | null
          updated_at: string
          user_id: string | null
          weekly_frequency: number | null
        }
        Insert: {
          activated?: boolean | null
          age?: number | null
          altura_cm?: number | null
          auto_password_temp?: string | null
          birthdate?: string | null
          coach_id: string
          created_at?: string
          email?: string | null
          experience_level?: string | null
          gender?: string | null
          goals?: string[] | null
          id?: string
          injuries?: string[] | null
          injuries_limitations?: string | null
          invitation_sent?: boolean | null
          invitation_token?: string | null
          metadata?: Json | null
          name: string
          nivel?: string | null
          objetivo?: string | null
          password_changed?: boolean | null
          perfil_classificado?: Json | null
          peso_kg?: number | null
          phone?: string | null
          primary_goal?: string | null
          respostas_anamnese?: Json | null
          restricoes?: Json | null
          session_duration?: string | null
          sessions_per_week?: number | null
          training_environment?: string | null
          training_level?: string | null
          updated_at?: string
          user_id?: string | null
          weekly_frequency?: number | null
        }
        Update: {
          activated?: boolean | null
          age?: number | null
          altura_cm?: number | null
          auto_password_temp?: string | null
          birthdate?: string | null
          coach_id?: string
          created_at?: string
          email?: string | null
          experience_level?: string | null
          gender?: string | null
          goals?: string[] | null
          id?: string
          injuries?: string[] | null
          injuries_limitations?: string | null
          invitation_sent?: boolean | null
          invitation_token?: string | null
          metadata?: Json | null
          name?: string
          nivel?: string | null
          objetivo?: string | null
          password_changed?: boolean | null
          perfil_classificado?: Json | null
          peso_kg?: number | null
          phone?: string | null
          primary_goal?: string | null
          respostas_anamnese?: Json | null
          restricoes?: Json | null
          session_duration?: string | null
          sessions_per_week?: number | null
          training_environment?: string | null
          training_level?: string | null
          updated_at?: string
          user_id?: string | null
          weekly_frequency?: number | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          resource_id: string
          resource_type: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          resource_id: string
          resource_type: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          resource_id?: string
          resource_type?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      avaliacoes: {
        Row: {
          agua_corporal: number | null
          altura: number | null
          avaliacao_exames: string | null
          avaliador_cref: string | null
          avaliador_nome: string | null
          circunferencia_braco: number | null
          circunferencia_cintura: number | null
          circunferencia_coxa: number | null
          circunferencia_panturrilha: number | null
          circunferencia_peitoral: number | null
          circunferencia_quadril: number | null
          created_at: string
          data_avaliacao: string
          dobra_abdominal: number | null
          dobra_axilar_media: number | null
          dobra_coxa: number | null
          dobra_panturrilha: number | null
          dobra_peitoral: number | null
          dobra_subescapular: number | null
          dobra_suprailiaca: number | null
          dobra_triceps: number | null
          estudante_id: string
          exames: Json | null
          gordura_corporal: number | null
          id: string
          imc: number | null
          massa_gorda: number | null
          massa_magra: number | null
          massa_muscular: number | null
          observacoes: string | null
          peso: number | null
          rm1_empurrar_perna: number | null
          rm1_empurrar_superior: number | null
          rm1_puxar_costas: number | null
          rm1_puxar_inferior: number | null
          rml_abs: number | null
          rml_agachamento: number | null
          rml_elevacao_p: number | null
          rml_flexao: number | null
          rml_pull: number | null
          taxa_metabolica: number | null
          updated_at: string
        }
        Insert: {
          agua_corporal?: number | null
          altura?: number | null
          avaliacao_exames?: string | null
          avaliador_cref?: string | null
          avaliador_nome?: string | null
          circunferencia_braco?: number | null
          circunferencia_cintura?: number | null
          circunferencia_coxa?: number | null
          circunferencia_panturrilha?: number | null
          circunferencia_peitoral?: number | null
          circunferencia_quadril?: number | null
          created_at?: string
          data_avaliacao?: string
          dobra_abdominal?: number | null
          dobra_axilar_media?: number | null
          dobra_coxa?: number | null
          dobra_panturrilha?: number | null
          dobra_peitoral?: number | null
          dobra_subescapular?: number | null
          dobra_suprailiaca?: number | null
          dobra_triceps?: number | null
          estudante_id: string
          exames?: Json | null
          gordura_corporal?: number | null
          id?: string
          imc?: number | null
          massa_gorda?: number | null
          massa_magra?: number | null
          massa_muscular?: number | null
          observacoes?: string | null
          peso?: number | null
          rm1_empurrar_perna?: number | null
          rm1_empurrar_superior?: number | null
          rm1_puxar_costas?: number | null
          rm1_puxar_inferior?: number | null
          rml_abs?: number | null
          rml_agachamento?: number | null
          rml_elevacao_p?: number | null
          rml_flexao?: number | null
          rml_pull?: number | null
          taxa_metabolica?: number | null
          updated_at?: string
        }
        Update: {
          agua_corporal?: number | null
          altura?: number | null
          avaliacao_exames?: string | null
          avaliador_cref?: string | null
          avaliador_nome?: string | null
          circunferencia_braco?: number | null
          circunferencia_cintura?: number | null
          circunferencia_coxa?: number | null
          circunferencia_panturrilha?: number | null
          circunferencia_peitoral?: number | null
          circunferencia_quadril?: number | null
          created_at?: string
          data_avaliacao?: string
          dobra_abdominal?: number | null
          dobra_axilar_media?: number | null
          dobra_coxa?: number | null
          dobra_panturrilha?: number | null
          dobra_peitoral?: number | null
          dobra_subescapular?: number | null
          dobra_suprailiaca?: number | null
          dobra_triceps?: number | null
          estudante_id?: string
          exames?: Json | null
          gordura_corporal?: number | null
          id?: string
          imc?: number | null
          massa_gorda?: number | null
          massa_magra?: number | null
          massa_muscular?: number | null
          observacoes?: string | null
          peso?: number | null
          rm1_empurrar_perna?: number | null
          rm1_empurrar_superior?: number | null
          rm1_puxar_costas?: number | null
          rm1_puxar_inferior?: number | null
          rml_abs?: number | null
          rml_agachamento?: number | null
          rml_elevacao_p?: number | null
          rml_flexao?: number | null
          rml_pull?: number | null
          taxa_metabolica?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      avaliacoes_fisicas: {
        Row: {
          altura_cm: number | null
          aluno_id: string
          arquivos_anexos: Json | null
          avaliador_cref: string | null
          avaliador_nome: string | null
          circ_braco: number | null
          circ_cintura: number | null
          circ_coxa: number | null
          circ_panturrilha: number | null
          circ_peitoral: number | null
          circ_quadril: number | null
          created_at: string | null
          data_avaliacao: string
          id: string
          imc: number | null
          massa_gorda_kg: number | null
          massa_magra_kg: number | null
          observacoes: string | null
          percentual_gordura: number | null
          peso_kg: number | null
          rm_agachamento: number | null
          rm_leg_press: number | null
          rm_supino: number | null
          rm_terra: number | null
          rml_abdominal: number | null
          rml_agachamento: number | null
          rml_flexao: number | null
        }
        Insert: {
          altura_cm?: number | null
          aluno_id: string
          arquivos_anexos?: Json | null
          avaliador_cref?: string | null
          avaliador_nome?: string | null
          circ_braco?: number | null
          circ_cintura?: number | null
          circ_coxa?: number | null
          circ_panturrilha?: number | null
          circ_peitoral?: number | null
          circ_quadril?: number | null
          created_at?: string | null
          data_avaliacao?: string
          id?: string
          imc?: number | null
          massa_gorda_kg?: number | null
          massa_magra_kg?: number | null
          observacoes?: string | null
          percentual_gordura?: number | null
          peso_kg?: number | null
          rm_agachamento?: number | null
          rm_leg_press?: number | null
          rm_supino?: number | null
          rm_terra?: number | null
          rml_abdominal?: number | null
          rml_agachamento?: number | null
          rml_flexao?: number | null
        }
        Update: {
          altura_cm?: number | null
          aluno_id?: string
          arquivos_anexos?: Json | null
          avaliador_cref?: string | null
          avaliador_nome?: string | null
          circ_braco?: number | null
          circ_cintura?: number | null
          circ_coxa?: number | null
          circ_panturrilha?: number | null
          circ_peitoral?: number | null
          circ_quadril?: number | null
          created_at?: string | null
          data_avaliacao?: string
          id?: string
          imc?: number | null
          massa_gorda_kg?: number | null
          massa_magra_kg?: number | null
          observacoes?: string | null
          percentual_gordura?: number | null
          peso_kg?: number | null
          rm_agachamento?: number | null
          rm_leg_press?: number | null
          rm_supino?: number | null
          rm_terra?: number | null
          rml_abdominal?: number | null
          rml_agachamento?: number | null
          rml_flexao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_fisicas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes_unificadas: {
        Row: {
          agua_corporal: number | null
          altura: number | null
          aluno_id: string
          avaliacao_exames: string | null
          avaliador_cref: string | null
          avaliador_nome: string | null
          circunferencia_braco: number | null
          circunferencia_cintura: number | null
          circunferencia_coxa: number | null
          circunferencia_panturrilha: number | null
          circunferencia_peitoral: number | null
          circunferencia_quadril: number | null
          created_at: string
          dados_adicionais: Json | null
          data_avaliacao: string
          dobra_abdominal: number | null
          dobra_axilar_media: number | null
          dobra_coxa: number | null
          dobra_panturrilha: number | null
          dobra_peitoral: number | null
          dobra_subescapular: number | null
          dobra_suprailiaca: number | null
          dobra_triceps: number | null
          exames: Json | null
          gordura_corporal: number | null
          id: string
          id_externo: string | null
          imc: number | null
          massa_gorda: number | null
          massa_magra: number | null
          massa_muscular: number | null
          observacoes: string | null
          origem: string
          peso: number | null
          rm1_empurrar_perna: number | null
          rm1_empurrar_superior: number | null
          rm1_puxar_costas: number | null
          rm1_puxar_inferior: number | null
          rml_abs: number | null
          rml_agachamento: number | null
          rml_elevacao_p: number | null
          rml_flexao: number | null
          rml_pull: number | null
          sincronizado: boolean | null
          taxa_metabolica: number | null
          updated_at: string
        }
        Insert: {
          agua_corporal?: number | null
          altura?: number | null
          aluno_id: string
          avaliacao_exames?: string | null
          avaliador_cref?: string | null
          avaliador_nome?: string | null
          circunferencia_braco?: number | null
          circunferencia_cintura?: number | null
          circunferencia_coxa?: number | null
          circunferencia_panturrilha?: number | null
          circunferencia_peitoral?: number | null
          circunferencia_quadril?: number | null
          created_at?: string
          dados_adicionais?: Json | null
          data_avaliacao?: string
          dobra_abdominal?: number | null
          dobra_axilar_media?: number | null
          dobra_coxa?: number | null
          dobra_panturrilha?: number | null
          dobra_peitoral?: number | null
          dobra_subescapular?: number | null
          dobra_suprailiaca?: number | null
          dobra_triceps?: number | null
          exames?: Json | null
          gordura_corporal?: number | null
          id?: string
          id_externo?: string | null
          imc?: number | null
          massa_gorda?: number | null
          massa_magra?: number | null
          massa_muscular?: number | null
          observacoes?: string | null
          origem: string
          peso?: number | null
          rm1_empurrar_perna?: number | null
          rm1_empurrar_superior?: number | null
          rm1_puxar_costas?: number | null
          rm1_puxar_inferior?: number | null
          rml_abs?: number | null
          rml_agachamento?: number | null
          rml_elevacao_p?: number | null
          rml_flexao?: number | null
          rml_pull?: number | null
          sincronizado?: boolean | null
          taxa_metabolica?: number | null
          updated_at?: string
        }
        Update: {
          agua_corporal?: number | null
          altura?: number | null
          aluno_id?: string
          avaliacao_exames?: string | null
          avaliador_cref?: string | null
          avaliador_nome?: string | null
          circunferencia_braco?: number | null
          circunferencia_cintura?: number | null
          circunferencia_coxa?: number | null
          circunferencia_panturrilha?: number | null
          circunferencia_peitoral?: number | null
          circunferencia_quadril?: number | null
          created_at?: string
          dados_adicionais?: Json | null
          data_avaliacao?: string
          dobra_abdominal?: number | null
          dobra_axilar_media?: number | null
          dobra_coxa?: number | null
          dobra_panturrilha?: number | null
          dobra_peitoral?: number | null
          dobra_subescapular?: number | null
          dobra_suprailiaca?: number | null
          dobra_triceps?: number | null
          exames?: Json | null
          gordura_corporal?: number | null
          id?: string
          id_externo?: string | null
          imc?: number | null
          massa_gorda?: number | null
          massa_magra?: number | null
          massa_muscular?: number | null
          observacoes?: string | null
          origem?: string
          peso?: number | null
          rm1_empurrar_perna?: number | null
          rm1_empurrar_superior?: number | null
          rm1_puxar_costas?: number | null
          rm1_puxar_inferior?: number | null
          rml_abs?: number | null
          rml_agachamento?: number | null
          rml_elevacao_p?: number | null
          rml_flexao?: number | null
          rml_pull?: number | null
          sincronizado?: boolean | null
          taxa_metabolica?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_unificadas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      class_bookings: {
        Row: {
          booking_time: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          check_in_at: string | null
          class_id: string | null
          created_at: string | null
          credits_used: number | null
          id: string
          status: string | null
          user_email: string
          user_id: string | null
        }
        Insert: {
          booking_time?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          check_in_at?: string | null
          class_id?: string | null
          created_at?: string | null
          credits_used?: number | null
          id?: string
          status?: string | null
          user_email: string
          user_id?: string | null
        }
        Update: {
          booking_time?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          check_in_at?: string | null
          class_id?: string | null
          created_at?: string | null
          credits_used?: number | null
          id?: string
          status?: string | null
          user_email?: string
          user_id?: string | null
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
      exercise_logs: {
        Row: {
          exercise_id: string
          id: string
          notes: string | null
          reps_completed: string | null
          sets_completed: number | null
          weight_used: number | null
          workout_log_id: string
        }
        Insert: {
          exercise_id: string
          id?: string
          notes?: string | null
          reps_completed?: string | null
          sets_completed?: number | null
          weight_used?: number | null
          workout_log_id: string
        }
        Update: {
          exercise_id?: string
          id?: string
          notes?: string | null
          reps_completed?: string | null
          sets_completed?: number | null
          weight_used?: number | null
          workout_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_logs_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty_level: string | null
          equipment: string | null
          equipment_needed: string | null
          external_video_id: string | null
          gif_url: string | null
          goal: string | null
          id: string
          image_url: string | null
          instructions: string | null
          is_optional: boolean | null
          muscle_groups: Json | null
          name: string
          phase: string | null
          target_muscles: string[]
          updated_at: string | null
          video_cached_at: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          equipment?: string | null
          equipment_needed?: string | null
          external_video_id?: string | null
          gif_url?: string | null
          goal?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_optional?: boolean | null
          muscle_groups?: Json | null
          name: string
          phase?: string | null
          target_muscles?: string[]
          updated_at?: string | null
          video_cached_at?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          equipment?: string | null
          equipment_needed?: string | null
          external_video_id?: string | null
          gif_url?: string | null
          goal?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_optional?: boolean | null
          muscle_groups?: Json | null
          name?: string
          phase?: string | null
          target_muscles?: string[]
          updated_at?: string | null
          video_cached_at?: string | null
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
          class_type: string | null
          created_at: string | null
          credits_required: number | null
          description: string | null
          id: string
          instructor_name: string | null
          location: string
        }
        Insert: {
          available_slots?: number
          class_datetime: string
          class_name: string
          class_type?: string | null
          created_at?: string | null
          credits_required?: number | null
          description?: string | null
          id?: string
          instructor_name?: string | null
          location: string
        }
        Update: {
          available_slots?: number
          class_datetime?: string
          class_name?: string
          class_type?: string | null
          created_at?: string | null
          credits_required?: number | null
          description?: string | null
          id?: string
          instructor_name?: string | null
          location?: string
        }
        Relationships: []
      }
      historico_avaliacoes: {
        Row: {
          agua_corporal: number | null
          altura: number | null
          avaliacao_exames: string | null
          avaliador_cref: string | null
          avaliador_nome: string | null
          circunferencia_braco: number | null
          circunferencia_cintura: number | null
          circunferencia_coxa: number | null
          circunferencia_panturrilha: number | null
          circunferencia_peitoral: number | null
          circunferencia_quadril: number | null
          created_at: string
          data_avaliacao: string
          dobra_abdominal: number | null
          dobra_axilar_media: number | null
          dobra_coxa: number | null
          dobra_panturrilha: number | null
          dobra_peitoral: number | null
          dobra_subescapular: number | null
          dobra_suprailiaca: number | null
          dobra_triceps: number | null
          estudante_id: string
          exames: Json | null
          gordura_corporal: number | null
          id: string
          imc: number | null
          massa_gorda: number | null
          massa_magra: number | null
          massa_muscular: number | null
          observacoes: string | null
          peso: number | null
          rm1_empurrar_perna: number | null
          rm1_empurrar_superior: number | null
          rm1_puxar_costas: number | null
          rm1_puxar_inferior: number | null
          rml_abs: number | null
          rml_agachamento: number | null
          rml_elevacao_p: number | null
          rml_flexao: number | null
          rml_pull: number | null
          taxa_metabolica: number | null
          updated_at: string
        }
        Insert: {
          agua_corporal?: number | null
          altura?: number | null
          avaliacao_exames?: string | null
          avaliador_cref?: string | null
          avaliador_nome?: string | null
          circunferencia_braco?: number | null
          circunferencia_cintura?: number | null
          circunferencia_coxa?: number | null
          circunferencia_panturrilha?: number | null
          circunferencia_peitoral?: number | null
          circunferencia_quadril?: number | null
          created_at?: string
          data_avaliacao?: string
          dobra_abdominal?: number | null
          dobra_axilar_media?: number | null
          dobra_coxa?: number | null
          dobra_panturrilha?: number | null
          dobra_peitoral?: number | null
          dobra_subescapular?: number | null
          dobra_suprailiaca?: number | null
          dobra_triceps?: number | null
          estudante_id: string
          exames?: Json | null
          gordura_corporal?: number | null
          id?: string
          imc?: number | null
          massa_gorda?: number | null
          massa_magra?: number | null
          massa_muscular?: number | null
          observacoes?: string | null
          peso?: number | null
          rm1_empurrar_perna?: number | null
          rm1_empurrar_superior?: number | null
          rm1_puxar_costas?: number | null
          rm1_puxar_inferior?: number | null
          rml_abs?: number | null
          rml_agachamento?: number | null
          rml_elevacao_p?: number | null
          rml_flexao?: number | null
          rml_pull?: number | null
          taxa_metabolica?: number | null
          updated_at?: string
        }
        Update: {
          agua_corporal?: number | null
          altura?: number | null
          avaliacao_exames?: string | null
          avaliador_cref?: string | null
          avaliador_nome?: string | null
          circunferencia_braco?: number | null
          circunferencia_cintura?: number | null
          circunferencia_coxa?: number | null
          circunferencia_panturrilha?: number | null
          circunferencia_peitoral?: number | null
          circunferencia_quadril?: number | null
          created_at?: string
          data_avaliacao?: string
          dobra_abdominal?: number | null
          dobra_axilar_media?: number | null
          dobra_coxa?: number | null
          dobra_panturrilha?: number | null
          dobra_peitoral?: number | null
          dobra_subescapular?: number | null
          dobra_suprailiaca?: number | null
          dobra_triceps?: number | null
          estudante_id?: string
          exames?: Json | null
          gordura_corporal?: number | null
          id?: string
          imc?: number | null
          massa_gorda?: number | null
          massa_magra?: number | null
          massa_muscular?: number | null
          observacoes?: string | null
          peso?: number | null
          rm1_empurrar_perna?: number | null
          rm1_empurrar_superior?: number | null
          rm1_puxar_costas?: number | null
          rm1_puxar_inferior?: number | null
          rml_abs?: number | null
          rml_agachamento?: number | null
          rml_elevacao_p?: number | null
          rml_flexao?: number | null
          rml_pull?: number | null
          taxa_metabolica?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      historico_treinos_realizados: {
        Row: {
          aluno_id: string
          created_at: string | null
          data_treino: string
          dia_treino: number | null
          duracao_minutos: number | null
          exercicios_realizados: Json
          id: string
          intensidade_media: number | null
          notas_aluno: string | null
          notas_professor: string | null
          plano_treino_id: string | null
          pse_sessao: number | null
          semana_treino: number | null
          volume_total_kg: number | null
        }
        Insert: {
          aluno_id: string
          created_at?: string | null
          data_treino: string
          dia_treino?: number | null
          duracao_minutos?: number | null
          exercicios_realizados?: Json
          id?: string
          intensidade_media?: number | null
          notas_aluno?: string | null
          notas_professor?: string | null
          plano_treino_id?: string | null
          pse_sessao?: number | null
          semana_treino?: number | null
          volume_total_kg?: number | null
        }
        Update: {
          aluno_id?: string
          created_at?: string | null
          data_treino?: string
          dia_treino?: number | null
          duracao_minutos?: number | null
          exercicios_realizados?: Json
          id?: string
          intensidade_media?: number | null
          notas_aluno?: string | null
          notas_professor?: string | null
          plano_treino_id?: string | null
          pse_sessao?: number | null
          semana_treino?: number | null
          volume_total_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_treinos_realizados_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_treinos_realizados_plano_treino_id_fkey"
            columns: ["plano_treino_id"]
            isOneToOne: false
            referencedRelation: "planos_treino_aluno"
            referencedColumns: ["id"]
          },
        ]
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
      logs_sincronizacao: {
        Row: {
          created_at: string | null
          dados_enviados: Json | null
          dados_resposta: Json | null
          erro: string | null
          id: string
          status: string
          tipo: string
        }
        Insert: {
          created_at?: string | null
          dados_enviados?: Json | null
          dados_resposta?: Json | null
          erro?: string | null
          id?: string
          status: string
          tipo: string
        }
        Update: {
          created_at?: string | null
          dados_enviados?: Json | null
          dados_resposta?: Json | null
          erro?: string | null
          id?: string
          status?: string
          tipo?: string
        }
        Relationships: []
      }
      modelos_de_treino: {
        Row: {
          criado_em: string | null
          descricao: string | null
          duracao_em_semanas: number | null
          estudante_id: string | null
          id: string
          nivel: string | null
          nome: string
          objetivo: string | null
          periodizacao: Json | null
          tag: string | null
          tipo_modelo: string | null
        }
        Insert: {
          criado_em?: string | null
          descricao?: string | null
          duracao_em_semanas?: number | null
          estudante_id?: string | null
          id?: string
          nivel?: string | null
          nome: string
          objetivo?: string | null
          periodizacao?: Json | null
          tag?: string | null
          tipo_modelo?: string | null
        }
        Update: {
          criado_em?: string | null
          descricao?: string | null
          duracao_em_semanas?: number | null
          estudante_id?: string | null
          id?: string
          nivel?: string | null
          nome?: string
          objetivo?: string | null
          periodizacao?: Json | null
          tag?: string | null
          tipo_modelo?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_type"] | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type?: Database["public"]["Enums"]["notification_type"] | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"] | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          paid_at: string | null
          payment_method: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          student_id: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          student_id: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          student_id?: string
          transaction_id?: string | null
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
      periodization_history: {
        Row: {
          change_description: string | null
          change_type: string
          changed_by: string | null
          changes: Json
          created_at: string | null
          id: string
          saved_periodization_id: string
        }
        Insert: {
          change_description?: string | null
          change_type: string
          changed_by?: string | null
          changes: Json
          created_at?: string | null
          id?: string
          saved_periodization_id: string
        }
        Update: {
          change_description?: string | null
          change_type?: string
          changed_by?: string | null
          changes?: Json
          created_at?: string | null
          id?: string
          saved_periodization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "periodization_history_saved_periodization_id_fkey"
            columns: ["saved_periodization_id"]
            isOneToOne: false
            referencedRelation: "saved_periodizations"
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
      planos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          duracao_dias: number
          id_plano: string
          nome_plano: string
          preco: number
          recursos_incluidos: Json | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          duracao_dias: number
          id_plano?: string
          nome_plano: string
          preco: number
          recursos_incluidos?: Json | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          duracao_dias?: number
          id_plano?: string
          nome_plano?: string
          preco?: number
          recursos_incluidos?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      planos_de_treino_gerados: {
        Row: {
          created_at: string | null
          duracao_semanas: number | null
          estudante_id: string | null
          estudante_id_ref: string | null
          id: string
          modelo_id: string | null
          nivel: string | null
          nome_plano: string | null
          objetivo: string | null
          plano_completo: Json | null
          professor_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          duracao_semanas?: number | null
          estudante_id?: string | null
          estudante_id_ref?: string | null
          id?: string
          modelo_id?: string | null
          nivel?: string | null
          nome_plano?: string | null
          objetivo?: string | null
          plano_completo?: Json | null
          professor_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          duracao_semanas?: number | null
          estudante_id?: string | null
          estudante_id_ref?: string | null
          id?: string
          modelo_id?: string | null
          nivel?: string | null
          nome_plano?: string | null
          objetivo?: string | null
          plano_completo?: Json | null
          professor_id?: string | null
          status?: string | null
          updated_at?: string | null
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
      planos_treino_aluno: {
        Row: {
          aluno_id: string
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          duracao_semanas: number
          estrutura_treino: Json
          fase_atual: string | null
          frequencia_semanal: number
          id: string
          nome_plano: string
          objetivo: string
          professor_id: string
          semana_atual: number | null
          status: string | null
          tipo_periodizacao: string | null
          updated_at: string | null
        }
        Insert: {
          aluno_id: string
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          duracao_semanas: number
          estrutura_treino?: Json
          fase_atual?: string | null
          frequencia_semanal: number
          id?: string
          nome_plano: string
          objetivo: string
          professor_id: string
          semana_atual?: number | null
          status?: string | null
          tipo_periodizacao?: string | null
          updated_at?: string | null
        }
        Update: {
          aluno_id?: string
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          duracao_semanas?: number
          estrutura_treino?: Json
          fase_atual?: string | null
          frequencia_semanal?: number
          id?: string
          nome_plano?: string
          objetivo?: string
          professor_id?: string
          semana_atual?: number | null
          status?: string | null
          tipo_periodizacao?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planos_treino_aluno_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
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
            foreignKeyName: "fk_plans_athlete"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "v_students_canonical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plans_periodization"
            columns: ["periodization_id"]
            isOneToOne: false
            referencedRelation: "periodizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plans_periodization"
            columns: ["periodization_id"]
            isOneToOne: false
            referencedRelation: "v_periodizations_canonical"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          expires_at: string | null
          id: string
          image_url: string | null
          is_published: boolean | null
          published_at: string | null
          target_audience: string | null
          title: string
          type: Database["public"]["Enums"]["post_type"]
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          published_at?: string | null
          target_audience?: string | null
          title: string
          type: Database["public"]["Enums"]["post_type"]
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          published_at?: string | null
          target_audience?: string | null
          title?: string
          type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number | null
          stock_quantity: number | null
          type: Database["public"]["Enums"]["product_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price?: number | null
          stock_quantity?: number | null
          type: Database["public"]["Enums"]["product_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number | null
          stock_quantity?: number | null
          type?: Database["public"]["Enums"]["product_type"]
          updated_at?: string | null
        }
        Relationships: []
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
          date_of_birth: string | null
          email: string
          first_name: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          last_name: string | null
          phone: string | null
          profile_image_url: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["user_status"] | null
          subscription_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          last_name?: string | null
          phone?: string | null
          profile_image_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"] | null
          subscription_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          last_name?: string | null
          phone?: string | null
          profile_image_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"] | null
          subscription_expires_at?: string | null
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
      progresso_aluno: {
        Row: {
          created_at: string | null
          data_registro: string
          desempenho_treino: Json | null
          id_aluno: string
          id_progresso: string
          medidas_corporais: Json | null
          observacoes: string | null
          peso_kg: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_registro?: string
          desempenho_treino?: Json | null
          id_aluno: string
          id_progresso?: string
          medidas_corporais?: Json | null
          observacoes?: string | null
          peso_kg?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_registro?: string
          desempenho_treino?: Json | null
          id_aluno?: string
          id_progresso?: string
          medidas_corporais?: Json | null
          observacoes?: string | null
          peso_kg?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "progresso_aluno_id_aluno_fkey"
            columns: ["id_aluno"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
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
      reference_series: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty_level:
            | Database["public"]["Enums"]["difficulty_level"]
            | null
          duration_weeks: number | null
          exercises: Json
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?:
            | Database["public"]["Enums"]["difficulty_level"]
            | null
          duration_weeks?: number | null
          exercises?: Json
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?:
            | Database["public"]["Enums"]["difficulty_level"]
            | null
          duration_weeks?: number | null
          exercises?: Json
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      saved_periodizations: {
        Row: {
          athlete_id: string | null
          created_at: string | null
          customizations: Json | null
          id: string
          notes: string | null
          periodization_model_id: string
          plan_name: string
          status: string | null
          updated_at: string | null
          user_profile_id: string | null
        }
        Insert: {
          athlete_id?: string | null
          created_at?: string | null
          customizations?: Json | null
          id?: string
          notes?: string | null
          periodization_model_id: string
          plan_name: string
          status?: string | null
          updated_at?: string | null
          user_profile_id?: string | null
        }
        Update: {
          athlete_id?: string | null
          created_at?: string | null
          customizations?: Json | null
          id?: string
          notes?: string | null
          periodization_model_id?: string
          plan_name?: string
          status?: string | null
          updated_at?: string | null
          user_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_periodizations_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_periodizations_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      student_credits: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          student_id: string
          total_credits: number
          updated_at: string
          used_credits: number
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          student_id: string
          total_credits?: number
          updated_at?: string
          used_credits?: number
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          student_id?: string
          total_credits?: number
          updated_at?: string
          used_credits?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_credits_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_credits_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_canonical"
            referencedColumns: ["id"]
          },
        ]
      }
      student_diet_assignments: {
        Row: {
          created_at: string | null
          created_by: string
          diet_data: Json | null
          diet_description: string | null
          diet_file_path: string | null
          diet_file_url: string | null
          diet_name: string
          diet_type: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          start_date: string
          student_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          diet_data?: Json | null
          diet_description?: string | null
          diet_file_path?: string | null
          diet_file_url?: string | null
          diet_name: string
          diet_type?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          diet_data?: Json | null
          diet_description?: string | null
          diet_file_path?: string | null
          diet_file_url?: string | null
          diet_name?: string
          diet_type?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_diet_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_diet_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_canonical"
            referencedColumns: ["id"]
          },
        ]
      }
      student_invitations: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          nome_aluno: string
          professor_id: string
          status: string | null
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          nome_aluno: string
          professor_id: string
          status?: string | null
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          nome_aluno?: string
          professor_id?: string
          status?: string | null
          token?: string
          used_at?: string | null
        }
        Relationships: []
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
      student_pdf_assessments: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_url: string
          id: string
          student_id: string
          uploaded_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_url: string
          id?: string
          student_id: string
          uploaded_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_url?: string
          id?: string
          student_id?: string
          uploaded_at?: string
        }
        Relationships: []
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
      student_profiles: {
        Row: {
          created_at: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          fitness_goals: string | null
          id: string
          medical_conditions: string | null
          notes: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          teacher_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          fitness_goals?: string | null
          id?: string
          medical_conditions?: string | null
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          teacher_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          fitness_goals?: string | null
          id?: string
          medical_conditions?: string | null
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          teacher_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      student_training_assignments: {
        Row: {
          created_at: string | null
          created_by: string
          end_date: string | null
          html_file_path: string | null
          html_file_url: string | null
          id: string
          is_active: boolean | null
          start_date: string
          student_id: string
          training_data: Json
          training_description: string | null
          training_name: string
          training_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          end_date?: string | null
          html_file_path?: string | null
          html_file_url?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string
          student_id: string
          training_data?: Json
          training_description?: string | null
          training_name: string
          training_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          end_date?: string | null
          html_file_path?: string | null
          html_file_url?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string
          student_id?: string
          training_data?: Json
          training_description?: string | null
          training_name?: string
          training_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_training_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_training_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_canonical"
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
      supersets: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty_level:
            | Database["public"]["Enums"]["difficulty_level"]
            | null
          exercises: Json
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?:
            | Database["public"]["Enums"]["difficulty_level"]
            | null
          exercises?: Json
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?:
            | Database["public"]["Enums"]["difficulty_level"]
            | null
          exercises?: Json
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_events: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          metadata: Json | null
          target_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          metadata?: Json | null
          target_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          metadata?: Json | null
          target_id?: string | null
        }
        Relationships: []
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
      uploads_periodizacao: {
        Row: {
          arquivo_url: string
          criado_em: string | null
          estudante_id: string
          id: string
          meta: Json | null
          nome_arquivo: string | null
        }
        Insert: {
          arquivo_url: string
          criado_em?: string | null
          estudante_id: string
          id?: string
          meta?: Json | null
          nome_arquivo?: string | null
        }
        Update: {
          arquivo_url?: string
          criado_em?: string | null
          estudante_id?: string
          id?: string
          meta?: Json | null
          nome_arquivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uploads_periodizacao_estudante_id_fkey"
            columns: ["estudante_id"]
            isOneToOne: false
            referencedRelation: "estudantes"
            referencedColumns: ["id"]
          },
        ]
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
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      vacation_requests: {
        Row: {
          created_at: string
          end_date: string
          id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string
          student_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string
          student_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacation_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacation_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_canonical"
            referencedColumns: ["id"]
          },
        ]
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
      workout_assignments_new: {
        Row: {
          assigned_at: string | null
          assigned_by: string
          end_date: string | null
          id: string
          notes: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["workout_status"] | null
          student_id: string
          workout_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by: string
          end_date?: string | null
          id?: string
          notes?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["workout_status"] | null
          student_id: string
          workout_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["workout_status"] | null
          student_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_assignments_new_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts_new"
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
      workout_exercises_new: {
        Row: {
          created_at: string | null
          exercise_id: string
          id: string
          notes: string | null
          order_index: number | null
          reps: string | null
          rest_time: number | null
          sets: number | null
          weight: number | null
          workout_id: string
        }
        Insert: {
          created_at?: string | null
          exercise_id: string
          id?: string
          notes?: string | null
          order_index?: number | null
          reps?: string | null
          rest_time?: number | null
          sets?: number | null
          weight?: number | null
          workout_id: string
        }
        Update: {
          created_at?: string | null
          exercise_id?: string
          id?: string
          notes?: string | null
          order_index?: number | null
          reps?: string | null
          rest_time?: number | null
          sets?: number | null
          weight?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_new_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_new_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts_new"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_logs: {
        Row: {
          completed_at: string | null
          id: string
          notes: string | null
          rating: number | null
          started_at: string | null
          student_id: string
          workout_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          notes?: string | null
          rating?: number | null
          started_at?: string | null
          student_id: string
          workout_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          notes?: string | null
          rating?: number | null
          started_at?: string | null
          student_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts_new"
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
      workout_progress: {
        Row: {
          aluno_id: string
          created_at: string | null
          date: string
          exercise_name: string
          id: string
          notes: string | null
          reps: number
          rpe: number | null
          sets: number
          weight_kg: number | null
          workout_id: string | null
        }
        Insert: {
          aluno_id: string
          created_at?: string | null
          date?: string
          exercise_name: string
          id?: string
          notes?: string | null
          reps: number
          rpe?: number | null
          sets: number
          weight_kg?: number | null
          workout_id?: string | null
        }
        Update: {
          aluno_id?: string
          created_at?: string | null
          date?: string
          exercise_name?: string
          id?: string
          notes?: string | null
          reps?: number
          rpe?: number | null
          sets?: number
          weight_kg?: number | null
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_progress_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_progress_workout_id_fkey"
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
          data_atribuicao: string | null
          data_conclusao: string | null
          day_number: number
          detalhes_treino: Json | null
          exercises: Json
          id: string
          method: string | null
          nome_treino: string | null
          notes: string | null
          observacoes_treino: string | null
          periodization_id: string | null
          phase: string
          status: string | null
          status_treino: string | null
          student_id: string | null
          updated_at: string | null
          week_number: number
        }
        Insert: {
          created_at?: string | null
          data_atribuicao?: string | null
          data_conclusao?: string | null
          day_number: number
          detalhes_treino?: Json | null
          exercises?: Json
          id?: string
          method?: string | null
          nome_treino?: string | null
          notes?: string | null
          observacoes_treino?: string | null
          periodization_id?: string | null
          phase: string
          status?: string | null
          status_treino?: string | null
          student_id?: string | null
          updated_at?: string | null
          week_number: number
        }
        Update: {
          created_at?: string | null
          data_atribuicao?: string | null
          data_conclusao?: string | null
          day_number?: number
          detalhes_treino?: Json | null
          exercises?: Json
          id?: string
          method?: string | null
          nome_treino?: string | null
          notes?: string | null
          observacoes_treino?: string | null
          periodization_id?: string | null
          phase?: string
          status?: string | null
          status_treino?: string | null
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
            foreignKeyName: "workouts_periodization_id_fkey"
            columns: ["periodization_id"]
            isOneToOne: false
            referencedRelation: "v_periodizations_canonical"
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
      workouts_new: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty_level:
            | Database["public"]["Enums"]["difficulty_level"]
            | null
          estimated_duration: number | null
          id: string
          is_template: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?:
            | Database["public"]["Enums"]["difficulty_level"]
            | null
          estimated_duration?: number | null
          id?: string
          is_template?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?:
            | Database["public"]["Enums"]["difficulty_level"]
            | null
          estimated_duration?: number | null
          id?: string
          is_template?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_assessments_canonical: {
        Row: {
          altura: number | null
          assessment_date: string | null
          athlete_id: string | null
          circunferencia_braco: number | null
          circunferencia_cintura: number | null
          circunferencia_coxa: number | null
          circunferencia_panturrilha: number | null
          circunferencia_peitoral: number | null
          circunferencia_quadril: number | null
          created_at: string | null
          evaluator_name: string | null
          gordura_corporal: number | null
          id: string | null
          imc: number | null
          massa_gorda: number | null
          massa_magra: number | null
          massa_muscular: number | null
          notes: string | null
          peso: number | null
          rml_abs: number | null
          rml_agachamento: number | null
          rml_flexao: number | null
          source: string | null
          updated_at: string | null
        }
        Insert: {
          altura?: number | null
          assessment_date?: string | null
          athlete_id?: string | null
          circunferencia_braco?: number | null
          circunferencia_cintura?: number | null
          circunferencia_coxa?: number | null
          circunferencia_panturrilha?: number | null
          circunferencia_peitoral?: number | null
          circunferencia_quadril?: number | null
          created_at?: string | null
          evaluator_name?: string | null
          gordura_corporal?: number | null
          id?: string | null
          imc?: number | null
          massa_gorda?: number | null
          massa_magra?: number | null
          massa_muscular?: number | null
          notes?: string | null
          peso?: number | null
          rml_abs?: number | null
          rml_agachamento?: number | null
          rml_flexao?: number | null
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          altura?: number | null
          assessment_date?: string | null
          athlete_id?: string | null
          circunferencia_braco?: number | null
          circunferencia_cintura?: number | null
          circunferencia_coxa?: number | null
          circunferencia_panturrilha?: number | null
          circunferencia_peitoral?: number | null
          circunferencia_quadril?: number | null
          created_at?: string | null
          evaluator_name?: string | null
          gordura_corporal?: number | null
          id?: string | null
          imc?: number | null
          massa_gorda?: number | null
          massa_magra?: number | null
          massa_muscular?: number | null
          notes?: string | null
          peso?: number | null
          rml_abs?: number | null
          rml_agachamento?: number | null
          rml_flexao?: number | null
          source?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_unificadas_aluno_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      v_assignments_canonical: {
        Row: {
          assigned_at: string | null
          athlete_id: string | null
          created_at: string | null
          id: string | null
          match_factors: Json | null
          match_percentage: number | null
          notes: string | null
          periodization_model_id: string | null
          professor_id: string | null
          status: string | null
        }
        Insert: {
          assigned_at?: string | null
          athlete_id?: string | null
          created_at?: string | null
          id?: string | null
          match_factors?: Json | null
          match_percentage?: number | null
          notes?: string | null
          periodization_model_id?: string | null
          professor_id?: string | null
          status?: string | null
        }
        Update: {
          assigned_at?: string | null
          athlete_id?: string | null
          created_at?: string | null
          id?: string | null
          match_factors?: Json | null
          match_percentage?: number | null
          notes?: string | null
          periodization_model_id?: string | null
          professor_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_periodizations_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_periodizations_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "v_students_canonical"
            referencedColumns: ["id"]
          },
        ]
      }
      v_periodizations_canonical: {
        Row: {
          athlete_id: string | null
          created_at: string | null
          current_phase: string | null
          description: string | null
          duration: string | null
          graph_data: Json | null
          id: string | null
          macrocycle: Json | null
          mesocycle: Json | null
          microcycle: Json | null
          periodization_data: Json | null
          professor_id: string | null
          title: string | null
          total_phases: number | null
          updated_at: string | null
        }
        Insert: {
          athlete_id?: string | null
          created_at?: string | null
          current_phase?: string | null
          description?: string | null
          duration?: string | null
          graph_data?: Json | null
          id?: string | null
          macrocycle?: Json | null
          mesocycle?: Json | null
          microcycle?: Json | null
          periodization_data?: Json | null
          professor_id?: string | null
          title?: string | null
          total_phases?: number | null
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string | null
          created_at?: string | null
          current_phase?: string | null
          description?: string | null
          duration?: string | null
          graph_data?: Json | null
          id?: string | null
          macrocycle?: Json | null
          mesocycle?: Json | null
          microcycle?: Json | null
          periodization_data?: Json | null
          professor_id?: string | null
          title?: string | null
          total_phases?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
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
      v_students_canonical: {
        Row: {
          altura_cm: number | null
          ambiente_treino: string | null
          ativo: boolean | null
          created_at: string | null
          data_nascimento: string | null
          frequencia_semanal: number | null
          genero: string | null
          id: string | null
          metadata: Json | null
          nivel_experiencia: string | null
          nome: string | null
          objetivo: string | null
          peso_kg: number | null
          professor_id: string | null
          restricoes_medicas: string | null
          telefone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          altura_cm?: number | null
          ambiente_treino?: string | null
          ativo?: boolean | null
          created_at?: string | null
          data_nascimento?: string | null
          frequencia_semanal?: never
          genero?: string | null
          id?: string | null
          metadata?: Json | null
          nivel_experiencia?: never
          nome?: string | null
          objetivo?: never
          peso_kg?: number | null
          professor_id?: string | null
          restricoes_medicas?: string | null
          telefone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          altura_cm?: number | null
          ambiente_treino?: string | null
          ativo?: boolean | null
          created_at?: string | null
          data_nascimento?: string | null
          frequencia_semanal?: never
          genero?: string | null
          id?: string | null
          metadata?: Json | null
          nivel_experiencia?: never
          nome?: string | null
          objetivo?: never
          peso_kg?: number | null
          professor_id?: string | null
          restricoes_medicas?: string | null
          telefone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      v_system_health: {
        Row: {
          active_assignments: number | null
          active_athletes: number | null
          checked_at: string | null
          events_last_24h: number | null
          pending_notifications: number | null
          workouts_last_7_days: number | null
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
      create_athlete_auth_user: {
        Args: {
          p_athlete_id: string
          p_email: string
          p_name: string
          p_password: string
        }
        Returns: Json
      }
      current_user_email: { Args: never; Returns: string }
      generate_invitation_token: { Args: never; Returns: string }
      gerar_modelo_treino: {
        Args: {
          p_estudante_id: string
          p_nivel: string
          p_objetivo: string
          p_periodizacao?: Json
        }
        Returns: {
          modelo_id: string
        }[]
      }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { check_user_id: string }; Returns: boolean }
      is_professor: { Args: { check_user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_trainer: { Args: { _user_id: string }; Returns: boolean }
      is_user_approved: { Args: { _user_id: string }; Returns: boolean }
      log_audit: {
        Args: {
          p_action: string
          p_resource_id: string
          p_resource_type: string
        }
        Returns: undefined
      }
      log_event: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_event_type: Database["public"]["Enums"]["event_type"]
          p_metadata?: Json
          p_target_id?: string
        }
        Returns: string
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
      salvar_avaliacao: {
        Args: { p_dados: Json; p_estudante_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
    }
    Enums: {
      aluno_status: "ativo" | "inativo" | "suspenso"
      app_role:
        | "admin"
        | "professor"
        | "student"
        | "demo"
        | "user"
        | "super_admin"
        | "trainer"
      appointment_status: "scheduled" | "completed" | "cancelled" | "no_show"
      assignment_status:
        | "pending"
        | "assigned"
        | "in_progress"
        | "completed"
        | "cancelled"
      difficulty_level: "beginner" | "intermediate" | "advanced"
      entity_status: "active" | "inactive" | "pending" | "archived" | "deleted"
      event_type:
        | "created"
        | "updated"
        | "deleted"
        | "assigned"
        | "started"
        | "completed"
        | "approved"
        | "rejected"
        | "notified"
        | "viewed"
      execution_status:
        | "not_started"
        | "in_progress"
        | "paused"
        | "completed"
        | "skipped"
      notification_type: "info" | "warning" | "success" | "error"
      payment_status: "pending" | "paid" | "overdue" | "cancelled"
      post_type: "announcement" | "workout" | "nutrition" | "tips"
      product_type: "supplement" | "equipment" | "apparel" | "membership"
      tipo_analise:
        | "composicao_corporal"
        | "performance"
        | "progresso"
        | "periodizacao"
      user_role: "admin" | "student" | "professor"
      user_status: "active" | "inactive" | "suspended" | "pending"
      workout_status: "pending" | "active" | "completed" | "cancelled"
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
      aluno_status: ["ativo", "inativo", "suspenso"],
      app_role: [
        "admin",
        "professor",
        "student",
        "demo",
        "user",
        "super_admin",
        "trainer",
      ],
      appointment_status: ["scheduled", "completed", "cancelled", "no_show"],
      assignment_status: [
        "pending",
        "assigned",
        "in_progress",
        "completed",
        "cancelled",
      ],
      difficulty_level: ["beginner", "intermediate", "advanced"],
      entity_status: ["active", "inactive", "pending", "archived", "deleted"],
      event_type: [
        "created",
        "updated",
        "deleted",
        "assigned",
        "started",
        "completed",
        "approved",
        "rejected",
        "notified",
        "viewed",
      ],
      execution_status: [
        "not_started",
        "in_progress",
        "paused",
        "completed",
        "skipped",
      ],
      notification_type: ["info", "warning", "success", "error"],
      payment_status: ["pending", "paid", "overdue", "cancelled"],
      post_type: ["announcement", "workout", "nutrition", "tips"],
      product_type: ["supplement", "equipment", "apparel", "membership"],
      tipo_analise: [
        "composicao_corporal",
        "performance",
        "progresso",
        "periodizacao",
      ],
      user_role: ["admin", "student", "professor"],
      user_status: ["active", "inactive", "suspended", "pending"],
      workout_status: ["pending", "active", "completed", "cancelled"],
    },
  },
} as const
