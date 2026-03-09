/**
 * 9FIT PRO Domain Types
 * Canonical type definitions for the ecosystem
 * All services and components should use these types
 */

// ==================== USERS DOMAIN ====================

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: 'student' | 'professor' | 'admin';
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'user' | 'student' | 'trainer' | 'professor' | 'admin' | 'super_admin';
  created_at: string;
}

// ==================== ATHLETES DOMAIN ====================

export interface Athlete {
  id: string;
  coach_id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  birthdate: string | null;
  age: number | null;
  gender: string | null;
  
  // Physical attributes
  altura_cm: number | null;
  peso_kg: number | null;
  
  // Training profile
  nivel: string | null;
  objetivo: string | null;
  primary_goal: string | null;
  goals: string[] | null;
  experience_level: string | null;
  training_level: string | null;
  training_environment: string | null;
  sessions_per_week: number | null;
  weekly_frequency: number | null;
  session_duration: string | null;
  injuries: string[] | null;
  injuries_limitations: string | null;
  restricoes: Record<string, unknown> | null;
  
  // Gamification
  level: number | null;
  total_xp: number | null;
  
  // Onboarding
  activated: boolean | null;
  password_changed: boolean | null;
  auto_password_temp: string | null;
  invitation_sent: boolean | null;
  invitation_token: string | null;
  
  // AI data
  perfil_classificado: Record<string, unknown> | null;
  respostas_anamnese: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  
  created_at: string;
  updated_at: string;
}

export interface CreateAthleteDTO {
  coach_id: string;
  name: string;
  email?: string;
  phone?: string;
  birthdate?: string;
  gender?: string;
  altura_cm?: number;
  peso_kg?: number;
  nivel?: string;
  objetivo?: string;
  primary_goal?: string;
  experience_level?: string;
  sessions_per_week?: number;
  training_environment?: string;
}

export interface UpdateAthleteDTO extends Partial<CreateAthleteDTO> {
  activated?: boolean;
  password_changed?: boolean;
  level?: number;
  total_xp?: number;
}

// ==================== TRAINING DOMAIN ====================

export interface Exercise {
  id: string;
  name: string;
  description: string | null;
  target_muscles: string[];
  muscle_groups: Record<string, unknown> | null;
  equipment: string | null;
  equipment_needed: string | null;
  difficulty_level: string | null;
  instructions: string | null;
  video_url: string | null;
  gif_url: string | null;
  image_url: string | null;
  external_video_id: string | null;
  is_optional: boolean | null;
  phase: string | null;
  goal: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingAssignment {
  id: string;
  athlete_id: string;
  coach_id: string;
  title: string;
  description: string | null;
  content_type: 'link' | 'html' | 'file';
  content_url: string | null;
  html_content: string | null;
  file_path: string | null;
  week_number: number | null;
  day_number: number | null;
  status: 'active' | 'paused' | 'completed' | 'expired';
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkoutProgress {
  id: string;
  aluno_id: string; // Legacy - will add athlete_id
  athlete_id?: string; // Canonical FK (to be added via migration)
  workout_date: string;
  workout_type: string | null;
  duration_minutes: number | null;
  calories_burned: number | null;
  exercises_completed: number | null;
  total_volume: number | null;
  avg_rpe: number | null;
  notes: string | null;
  status: string | null;
  created_at: string;
}

export interface WorkoutExecution {
  id: string;
  athlete_id: string;
  assignment_id: string | null;
  template_id: string | null;
  started_at: string;
  completed_at: string | null;
  status: 'in_progress' | 'completed' | 'cancelled';
  duration_minutes: number | null;
  total_volume_kg: number | null;
  avg_rpe: number | null;
  notes: string | null;
  created_at: string;
}

// ==================== ASSESSMENTS DOMAIN ====================

export interface Assessment {
  id: string;
  aluno_id: string; // Legacy - will add athlete_id
  athlete_id?: string; // Canonical FK (to be added via migration)
  origem: string;
  data_avaliacao: string;
  
  // Anthropometry
  peso: number | null;
  altura: number | null;
  imc: number | null;
  gordura_corporal: number | null;
  massa_muscular: number | null;
  massa_magra: number | null;
  massa_gorda: number | null;
  agua_corporal: number | null;
  taxa_metabolica: number | null;
  
  // Circumferences
  circunferencia_braco: number | null;
  circunferencia_peitoral: number | null;
  circunferencia_cintura: number | null;
  circunferencia_quadril: number | null;
  circunferencia_coxa: number | null;
  circunferencia_panturrilha: number | null;
  
  // Skin folds
  dobra_triceps: number | null;
  dobra_peitoral: number | null;
  dobra_abdominal: number | null;
  dobra_suprailiaca: number | null;
  dobra_coxa: number | null;
  dobra_panturrilha: number | null;
  dobra_subescapular: number | null;
  dobra_axilar_media: number | null;
  
  // Strength tests
  rml_abs: number | null;
  rml_flexao: number | null;
  rml_agachamento: number | null;
  rml_pull: number | null;
  rml_elevacao_p: number | null;
  rm1_empurrar_perna: number | null;
  rm1_puxar_costas: number | null;
  rm1_empurrar_superior: number | null;
  rm1_puxar_inferior: number | null;
  
  // Evaluator info
  avaliador_nome: string | null;
  avaliador_cref: string | null;
  observacoes: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface StudentMeasurement {
  id: string;
  student_id: string; // Legacy - references students table
  athlete_id?: string; // Canonical FK (to be added via migration)
  measurement_date: string;
  weight_kg: number | null;
  height_cm: number | null;
  body_fat_percentage: number | null;
  muscle_mass_kg: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  calf_cm: number | null;
  notes: string | null;
  created_at: string;
}

// ==================== SCHEDULING DOMAIN ====================

export interface GymClass {
  id: string;
  class_name: string;
  class_type: string | null;
  class_datetime: string;
  instructor_name: string | null;
  location: string;
  available_slots: number;
  credits_required: number | null;
  description: string | null;
  created_at: string;
}

export interface ClassBooking {
  id: string;
  class_id: string | null;
  user_id: string | null;
  user_email: string;
  status: string | null;
  booking_time: string | null;
  check_in_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  credits_used: number | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  student_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  appointment_type: string | null;
  scheduled_at: string;
  duration: number | null;
  location: string | null;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  recurrence_pattern: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface StudentCredits {
  id: string;
  athlete_id: string;
  total_credits: number;
  used_credits: number;
  expires_at: string | null;
  last_purchase_at: string | null;
  created_at: string;
  updated_at: string;
}

// ==================== PERIODIZATION DOMAIN ====================

export interface PeriodizationModel {
  id: string;
  title: string;
  description: string | null;
  goal: string | null;
  duration: string | null;
  phases_count: number | null;
  recommended_for: Record<string, unknown> | null;
  structure: Record<string, unknown> | null;
  created_by: string | null;
  is_template: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface AthletePeriodization {
  id: string;
  athlete_id: string | null;
  periodization_model_id: string;
  assigned_by: string | null;
  assigned_at: string | null;
  status: string | null;
  match_percentage: number | null;
  match_factors: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
}

// ==================== DIET DOMAIN ====================

export interface DietAssignment {
  id: string;
  athlete_id: string;
  coach_id: string;
  title: string;
  description: string | null;
  content_type: 'link' | 'html' | 'file';
  content_url: string | null;
  html_content: string | null;
  file_path: string | null;
  status: 'active' | 'paused' | 'completed' | 'expired';
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// ==================== ANALYTICS DOMAIN ====================

export interface SystemEvent {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  actor_id: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface CheckIn {
  id: string;
  aluno_id: string;
  professor_id: string;
  tipo: 'semanal' | 'mensal';
  data_checkin: string;
  energia: number | null;
  sono: number | null;
  alimentacao: number | null;
  dor: number | null;
  dor_local: string | null;
  treinos_semana: number | null;
  fator_consistencia: string | null;
  fator_atrapalhou: string | null;
  vitoria_mes: string | null;
  dificuldade_mes: string | null;
  meta_proximo_mes: string | null;
  medida_chave: string | null;
  created_at: string;
}

// ==================== API RESPONSE CONTRACT ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  metadata?: {
    timestamp: string;
    version: string;
    count?: number;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ==================== DATE RANGE HELPER ====================

export interface DateRange {
  from: Date | string;
  to: Date | string;
}
