
export interface UserProfile {
  demographics: {
    age: number;
    biological_sex: 'male' | 'female';
    height: number;
    weight: number;
  };
  fitness: {
    level: 'beginner' | 'intermediate' | 'advanced';
    experience_months: number;
    injuries: string[];
    goals: string[];
    weekly_availability: number;
    session_duration: string;
  };
  preferences: {
    training_environment: 'home' | 'gym' | 'outdoor';
    equipment_available: string[];
    time_preferences: string[];
  };
}

export interface TrainingPhase {
  name: string;
  duration_weeks: number;
  focus: string;
  intensity_level: 'low' | 'moderate' | 'high';
  volume_level: 'low' | 'moderate' | 'high';
  objective: string;
  key_adaptations: string[];
  scientific_rationale: string;
}

export interface Exercise {
  id: string;
  name: string;
  category: string;
  muscle_groups: string[];
  equipment_type: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  instructions: string[];
  sets: number;
  reps: string;
  rest_seconds: number;
  rpe_target?: number;
  load_percentage?: string;
  tempo?: string;
  notes?: string;
  contraindications?: string[];
  alternatives?: string[];
}

export interface DailyWorkout {
  day: string;
  focus: string;
  estimated_duration: number;
  warm_up: Exercise[];
  main_exercises: Exercise[];
  cool_down: Exercise[];
}

export interface TrainingPlan {
  metadata: {
    version: string;
    generated_at: string;
    user_id: string;
  };
  user_profile: UserProfile;
  periodization: {
    type: 'linear' | 'undulating' | 'block';
    total_weeks: number;
    current_phase: number;
    phases: TrainingPhase[];
  };
  weekly_schedule: {
    [key: string]: DailyWorkout;
  };
  additional_modules: {
    nutrition?: {
      daily_macros: {
        calories: number;
        protein_g: number;
        carbs_g: number;
        fat_g: number;
      };
      meal_timing: string[];
    };
    recovery?: {
      recommendations: string[];
      sleep_target_hours: number;
      stress_management: string[];
    };
  };
  progression_rules: {
    load_increase_percentage: number;
    rpe_targets: {
      min: number;
      max: number;
    };
    deload_frequency_weeks: number;
  };
}
