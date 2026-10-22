import test from 'node:test';
import assert from 'node:assert/strict';
import { trainingFollowUp } from './trainingFollowUp';

test('conta pessoas únicas, não atribuições, e ignora alunos fora do escopo', () => {
  assert.deepEqual(trainingFollowUp(['a', 'a', 'b'], [
    { student_id: 'a', end_date: null },
    { student_id: 'a', end_date: null },
    { student_id: 'outside', end_date: null },
  ], '2026-10-22'), { total: 2, withoutTraining: 1, withoutEndDate: 1, expired: 0, current: 0 });
});

test('plano vigente prevalece sobre antigo; sem data prevalece sobre vencido', () => {
  assert.deepEqual(trainingFollowUp(['a', 'b', 'c'], [
    { student_id: 'a', end_date: '2026-10-01' },
    { student_id: 'a', end_date: '2026-10-22' },
    { student_id: 'b', end_date: '2026-10-01' },
    { student_id: 'b', end_date: null },
    { student_id: 'c', end_date: '2026-10-21' },
  ], '2026-10-22'), { total: 3, withoutTraining: 0, withoutEndDate: 1, expired: 1, current: 1 });
});
