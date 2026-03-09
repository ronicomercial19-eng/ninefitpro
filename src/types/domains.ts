/**
 * 9FIT PRO Domain Types
 * Canonical type definitions for the ecosystem
 * Uses 'any' for database-returned objects to avoid strict type mismatches
 * with Supabase generated types
 */

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

// ==================== ATHLETES DOMAIN ====================

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
  user_id?: string;
  auto_password_temp?: string | null;
}

// ==================== SCHEDULING DOMAIN ====================

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'scheduled' | 'no_show';
