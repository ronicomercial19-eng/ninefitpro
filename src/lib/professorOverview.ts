import { trainingFollowUp } from "./trainingFollowUp";
export interface CoachOverviewRow {
  id: string;
  name: string;
  active: boolean;
  goal: string | null;
  completed_workouts: number;
  prescribed_sessions: number;
  avg_rpe: number | null;
  duration_minutes: number;
  assignments: Array<{
    student_id: string;
    end_date: string | null;
    is_active: boolean;
  }>;
}
export function summarizeOverview(rows: CoachOverviewRow[], today: string) {
  const unique = [...new Map(rows.map((row) => [row.id, row])).values()];
  return {
    students: unique.length,
    active: unique.filter((r) => r.active).length,
    completed: unique.reduce((n, r) => n + r.completed_workouts, 0),
    prescribed: unique.reduce((n, r) => n + r.prescribed_sessions, 0),
    ...trainingFollowUp(
      unique.map((r) => r.id),
      unique.flatMap((r) => r.assignments),
      today,
    ),
  };
}
