import { describe, it, expect } from 'vitest';
import { scopeAthletes, computeTrainingCounters } from '../coachDashboard';
import type { CoachStudentPerformance } from '@/integrations/coachStudentPerformance';

const row = (id: string, coach: string, activated = true) => ({ athlete_id: id, coach_id: coach, activated } as CoachStudentPerformance);
const rows = [row('a1', 'coachA'), row('a2', 'coachA', false), row('b1', 'coachB'), row('self', 'otherCoach')];

describe('horizontal isolation', () => {
  it('trainer only sees own students', () => {
    expect(scopeAthletes(rows, 'coachA', 'trainer').map(r => r.athlete_id)).toEqual(['a1', 'a2']);
  });
  it('admin keeps what RLS returned', () => {
    expect(scopeAthletes(rows, 'adm', 'admin')).toHaveLength(4);
  });
});

describe('counters', () => {
  it('uses athlete_id and ignores other coaches assignments', () => {
    const mine = scopeAthletes(rows, 'coachA', 'trainer');
    const c = computeTrainingCounters(mine, [
      { student_id: 'a1', end_date: '2026-01-01' },
      { student_id: 'b1', end_date: null },
    ], '2026-10-11');
    expect(c).toEqual({ totalClients: 2, activeMembers: 1, studentsWithoutTraining: 0, overdueTraining: 1 });
  });
  it('active student without assignment counts as without training', () => {
    const c = computeTrainingCounters([row('x', 'c')], [], '2026-10-11');
    expect(c.studentsWithoutTraining).toBe(1);
  });
});
