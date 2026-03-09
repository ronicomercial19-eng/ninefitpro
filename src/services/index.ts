/**
 * 9FIT PRO Service Layer
 * Centralized exports for all domain services
 * 
 * Usage:
 * import { athleteService, trainingService } from '@/services';
 * 
 * Or import specific functions:
 * import { getAthleteById } from '@/services/athletes.service';
 */

// Athletes
export * from './athletes.service';
export { athleteQueryKeys } from './athletes.service';

// Training
export * from './training.service';
export { trainingQueryKeys } from './training.service';

// Scheduling
export * from './scheduling.service';
export { schedulingQueryKeys } from './scheduling.service';

// Assessments
export * from './assessments.service';
export { assessmentQueryKeys } from './assessments.service';

// Re-export types for convenience
export type {
  Athlete,
  CreateAthleteDTO,
  UpdateAthleteDTO,
  Exercise,
  TrainingAssignment,
  WorkoutProgress,
  WorkoutExecution,
  Assessment,
  StudentMeasurement,
  GymClass,
  ClassBooking,
  Appointment,
  StudentCredits,
  PeriodizationModel,
  AthletePeriodization,
  DietAssignment,
  SystemEvent,
  CheckIn,
  ApiResponse,
  PaginatedResponse,
  DateRange,
} from '@/types/domains';

/**
 * Grouped service namespaces for organized imports
 */
import * as athletesService from './athletes.service';
import * as trainingService from './training.service';
import * as schedulingService from './scheduling.service';
import * as assessmentsService from './assessments.service';

export const services = {
  athletes: athletesService,
  training: trainingService,
  scheduling: schedulingService,
  assessments: assessmentsService,
};

/**
 * All query keys for React Query cache management
 */
export const queryKeys = {
  athletes: athletesService.athleteQueryKeys,
  training: trainingService.trainingQueryKeys,
  scheduling: schedulingService.schedulingQueryKeys,
  assessments: assessmentsService.assessmentQueryKeys,
};
