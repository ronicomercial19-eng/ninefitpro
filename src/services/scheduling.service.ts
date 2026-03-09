/**
 * Scheduling Service
 * Canonical service for classes, bookings, appointments, and credits
 */

import { supabase } from '@/integrations/supabase/client';
import type { ApiResponse, DateRange } from '@/types/domains';

// ==================== GYM CLASSES ====================

export async function getUpcomingClasses(options?: { 
  limit?: number; 
  classType?: string 
}): Promise<ApiResponse<any[]>> {
  try {
    const now = new Date().toISOString();
    
    let query = supabase
      .from('gym_classes')
      .select('*')
      .gte('class_datetime', now)
      .gt('available_slots', 0)
      .order('class_datetime', { ascending: true });

    if (options?.classType) {
      query = query.eq('class_type', options.classType);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      return {
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      };
    }

    return {
      success: true,
      data: data ?? [],
      metadata: { timestamp: new Date().toISOString(), version: 'v1', count: data?.length ?? 0 }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

export async function getClassById(id: string): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('gym_classes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return {
        success: false,
        error: { code: error.code === 'PGRST116' ? 'NOT_FOUND' : 'FETCH_ERROR', message: error.message }
      };
    }

    return {
      success: true,
      data,
      metadata: { timestamp: new Date().toISOString(), version: 'v1' }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

// ==================== CLASS BOOKINGS ====================

export async function getBookingsByUser(
  userEmail: string,
  options?: { status?: string; upcoming?: boolean }
): Promise<ApiResponse<any[]>> {
  try {
    let query = supabase
      .from('class_bookings')
      .select('*, gym_classes(*)')
      .eq('user_email', userEmail)
      .order('booking_time', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.upcoming) {
      query = query.gte('booking_time', new Date().toISOString());
    }

    const { data, error } = await query;

    if (error) {
      return {
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      };
    }

    return {
      success: true,
      data: data ?? [],
      metadata: { timestamp: new Date().toISOString(), version: 'v1', count: data?.length ?? 0 }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

export async function createBooking(
  classId: string,
  userEmail: string,
  userId?: string
): Promise<ApiResponse<any>> {
  try {
    // Check available slots
    const { data: gymClass, error: classError } = await supabase
      .from('gym_classes')
      .select('available_slots, credits_required')
      .eq('id', classId)
      .single();

    if (classError || !gymClass) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Class not found' }
      };
    }

    if (gymClass.available_slots <= 0) {
      return {
        success: false,
        error: { code: 'NO_SLOTS', message: 'No available slots' }
      };
    }

    // Create booking
    const { data, error } = await supabase
      .from('class_bookings')
      .insert({
        class_id: classId,
        user_id: userId,
        user_email: userEmail,
        status: 'confirmed',
        booking_time: new Date().toISOString(),
        credits_used: gymClass.credits_required ?? 1
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { code: 'CREATE_ERROR', message: error.message }
      };
    }

    // Decrement available slots
    await supabase
      .from('gym_classes')
      .update({ available_slots: gymClass.available_slots - 1 })
      .eq('id', classId);

    return {
      success: true,
      data,
      metadata: { timestamp: new Date().toISOString(), version: 'v1' }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

export async function cancelBooking(
  bookingId: string,
  reason?: string
): Promise<ApiResponse<any>> {
  try {
    const { data: booking, error: fetchError } = await supabase
      .from('class_bookings')
      .select('class_id, status')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Booking not found' }
      };
    }

    if (booking.status === 'cancelled') {
      return {
        success: false,
        error: { code: 'ALREADY_CANCELLED', message: 'Booking already cancelled' }
      };
    }

    const { data, error } = await supabase
      .from('class_bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { code: 'UPDATE_ERROR', message: error.message }
      };
    }

    // Restore slot - manual increment since rpc may not exist
    if (booking.class_id) {
      const { data: currentClass } = await supabase
        .from('gym_classes')
        .select('available_slots')
        .eq('id', booking.class_id)
        .single();
      
      if (currentClass) {
        await supabase
          .from('gym_classes')
          .update({ available_slots: currentClass.available_slots + 1 })
          .eq('id', booking.class_id);
      }
    }

    return {
      success: true,
      data,
      metadata: { timestamp: new Date().toISOString(), version: 'v1' }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

export async function checkInBooking(bookingId: string): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('class_bookings')
      .update({
        check_in_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { code: 'UPDATE_ERROR', message: error.message }
      };
    }

    return {
      success: true,
      data,
      metadata: { timestamp: new Date().toISOString(), version: 'v1' }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

// ==================== APPOINTMENTS ====================

export async function getAppointmentsByAthlete(
  athleteId: string,
  options?: { status?: string; upcoming?: boolean }
): Promise<ApiResponse<any[]>> {
  try {
    let query = supabase
      .from('appointments')
      .select('*')
      .eq('student_id', athleteId)
      .order('scheduled_at', { ascending: true });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.upcoming) {
      query = query.gte('scheduled_at', new Date().toISOString());
    }

    const { data, error } = await query;

    if (error) {
      return {
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      };
    }

    return {
      success: true,
      data: data ?? [],
      metadata: { timestamp: new Date().toISOString(), version: 'v1', count: data?.length ?? 0 }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

export async function getAppointmentsByTeacher(
  teacherId: string,
  dateRange?: DateRange
): Promise<ApiResponse<any[]>> {
  try {
    let query = supabase
      .from('appointments')
      .select('*, athletes:student_id(id, name)')
      .eq('teacher_id', teacherId)
      .order('scheduled_at', { ascending: true });

    if (dateRange) {
      const from = typeof dateRange.from === 'string' ? dateRange.from : dateRange.from.toISOString();
      const to = typeof dateRange.to === 'string' ? dateRange.to : dateRange.to.toISOString();
      query = query.gte('scheduled_at', from).lte('scheduled_at', to);
    }

    const { data, error } = await query;

    if (error) {
      return {
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      };
    }

    return {
      success: true,
      data: data ?? [],
      metadata: { timestamp: new Date().toISOString(), version: 'v1', count: data?.length ?? 0 }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

export async function createAppointment(appointment: {
  student_id: string;
  teacher_id: string;
  title: string;
  description?: string;
  appointment_type?: string;
  scheduled_at: string;
  duration?: number;
  location?: string;
  status?: string;
}): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .insert(appointment)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { code: 'CREATE_ERROR', message: error.message }
      };
    }

    return {
      success: true,
      data,
      metadata: { timestamp: new Date().toISOString(), version: 'v1' }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

export async function updateAppointmentStatus(
  id: string,
  status: string
): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { code: 'UPDATE_ERROR', message: error.message }
      };
    }

    return {
      success: true,
      data,
      metadata: { timestamp: new Date().toISOString(), version: 'v1' }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

// ==================== STUDENT CREDITS ====================

export async function getAthleteCredits(athleteId: string): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('student_credits')
      .select('*')
      .eq('athlete_id', athleteId)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      };
    }

    // Return default if no credits exist
    if (!data) {
      return {
        success: true,
        data: {
          id: '',
          athlete_id: athleteId,
          total_credits: 0,
          used_credits: 0,
          expires_at: null,
          last_purchase_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        metadata: { timestamp: new Date().toISOString(), version: 'v1' }
      };
    }

    return {
      success: true,
      data,
      metadata: { timestamp: new Date().toISOString(), version: 'v1' }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

export async function useCredits(
  athleteId: string, 
  amount: number
): Promise<ApiResponse<any>> {
  try {
    const creditsResult = await getAthleteCredits(athleteId);
    if (!creditsResult.success || !creditsResult.data) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Credits not found' }
      };
    }

    const available = creditsResult.data.total_credits - creditsResult.data.used_credits;
    if (available < amount) {
      return {
        success: false,
        error: { code: 'INSUFFICIENT_CREDITS', message: `Need ${amount} credits, have ${available}` }
      };
    }

    const { data, error } = await supabase
      .from('student_credits')
      .update({ 
        used_credits: creditsResult.data.used_credits + amount,
        updated_at: new Date().toISOString()
      })
      .eq('athlete_id', athleteId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { code: 'UPDATE_ERROR', message: error.message }
      };
    }

    return {
      success: true,
      data,
      metadata: { timestamp: new Date().toISOString(), version: 'v1' }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

// ==================== QUERY KEYS ====================

export const schedulingQueryKeys = {
  classes: {
    all: ['scheduling', 'classes'] as const,
    upcoming: ['scheduling', 'classes', 'upcoming'] as const,
    byId: (id: string) => ['scheduling', 'classes', id] as const,
  },
  bookings: {
    all: ['scheduling', 'bookings'] as const,
    byUser: (email: string) => ['scheduling', 'bookings', 'user', email] as const,
    upcoming: (email: string) => ['scheduling', 'bookings', 'user', email, 'upcoming'] as const,
  },
  appointments: {
    all: ['scheduling', 'appointments'] as const,
    byAthlete: (athleteId: string) => ['scheduling', 'appointments', 'athlete', athleteId] as const,
    byTeacher: (teacherId: string) => ['scheduling', 'appointments', 'teacher', teacherId] as const,
  },
  credits: {
    byAthlete: (athleteId: string) => ['scheduling', 'credits', 'athlete', athleteId] as const,
  },
};
