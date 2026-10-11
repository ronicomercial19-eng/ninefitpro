import type { CoachStudentPerformance } from '@/integrations/coachStudentPerformance';
import { isAdminRole } from './authRole';

/** Professor vê só alunos com coach_id = ele; admin vê o que o RLS liberar. */
export function scopeAthletes(rows: CoachStudentPerformance[], userId: string, role: string | null): CoachStudentPerformance[] {
  if (isAdminRole(role)) return rows;
  return rows.filter((r) => r.coach_id === userId);
}

export interface AssignmentRow { student_id: string; end_date: string | null }

export function computeTrainingCounters(athletes: CoachStudentPerformance[], activeAssignments: AssignmentRow[], today: string) {
  const ids = new Set(athletes.map((a) => a.athlete_id));
  const mine = activeAssignments.filter((a) => ids.has(a.student_id));
  const withTraining = new Set(mine.map((a) => a.student_id));
  return {
    totalClients: athletes.length,
    activeMembers: athletes.filter((a) => a.activated).length,
    studentsWithoutTraining: athletes.filter((a) => a.activated && !withTraining.has(a.athlete_id)).length,
    overdueTraining: new Set(mine.filter((a) => a.end_date && a.end_date < today).map((a) => a.student_id)).size,
  };
}
