import test from 'node:test';
import assert from 'node:assert/strict';
import { isExecutableTraining } from '../executableTraining';
import { readFailure } from '../readFailure';
const exercise = { name: 'Ponte isométrica', sets: 3, reps: '6 s' };
test('só libera prescrição com exercícios e dose, nunca contagem ou metadados', () => {
  assert.equal(isExecutableTraining({ training_data: { exercises: [exercise] } }), true);
  for (const training of [null, {}, { training_data: {} }, { training_data: { exercises: [] } },
    { training_data: { exercises: [{}] } }, { training_data: { exercises: [{ ...exercise, sets: 0 }] } },
    { training_data: { exercises: [{ ...exercise, reps: '' }] } },
    { prescription_issue: true, training_data: { exercises: [exercise] } },
    { is_active: false, training_data: { exercises: [exercise] } },
    { training_type: 'html', training_data: { exercises: [exercise] } }]) assert.equal(isExecutableTraining(training), false);
  for (const reps of [false, {}, NaN, -1, 0, '—', '-6', 'n/a']) {
    assert.equal(isExecutableTraining({ training_data: { exercises: [{ ...exercise, reps }] } }), false);
  }
});
test('falha de rede, sessão e contrato têm orientações distintas', () => {
  assert.equal(readFailure(new Error('Failed to fetch')).kind, 'network');
  assert.equal(readFailure(new Error('A consulta demorou demais.')).kind, 'network');
  assert.equal(readFailure(null, false).kind, 'network');
  assert.equal(readFailure({ code: 'PGRST301' }).kind, 'auth');
  assert.equal(readFailure({ status: 401 }).action, 'Entrar novamente');
  assert.equal(readFailure(new Error('Ficha incompleta')).kind, 'data');
});
