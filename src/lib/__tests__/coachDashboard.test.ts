import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scopeAthletes, computeTrainingCounters } from '../coachDashboard';
import type { CoachStudentPerformance } from '@/integrations/coachStudentPerformance';

const row = (id: string, coach: string, activated = true) => ({ athlete_id: id, coach_id: coach, activated } as CoachStudentPerformance);
const rows = [row('a1', 'coachA'), row('a2', 'coachA', false), row('b1', 'coachB'), row('self', 'otherCoach')];

describe('horizontal isolation', () => {
  it('trainer only sees own students', () => {
    assert.deepEqual(scopeAthletes(rows, 'coachA', 'trainer').map(r => r.athlete_id), ['a1', 'a2']);
  });
  it('admin keeps what RLS returned', () => {
    assert.equal(scopeAthletes(rows, 'adm', 'admin').length, 4);
  });
});

describe('counters', () => {
  it('uses athlete_id and ignores other coaches assignments', () => {
    const mine = scopeAthletes(rows, 'coachA', 'trainer');
    const c = computeTrainingCounters(mine, [
      { student_id: 'a1', end_date: '2026-01-01' },
      { student_id: 'b1', end_date: null },
    ], '2026-10-11');
    assert.deepEqual(c, { totalClients: 2, activeMembers: 1, studentsWithoutTraining: 0, overdueTraining: 1 });
  });
  it('active student without assignment counts as without training', () => {
    const c = computeTrainingCounters([row('x', 'c')], [], '2026-10-11');
    assert.equal(c.studentsWithoutTraining, 1);
  });
});
