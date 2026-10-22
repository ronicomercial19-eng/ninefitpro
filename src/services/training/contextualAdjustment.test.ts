import test from 'node:test';
import assert from 'node:assert/strict';
import { decideContextualAdjustment as decide } from './contextualAdjustment';
const prescription = ['A', 'B', 'C', 'D'].map(name => ({ name, sets: 3, reps: '8-12', restSeconds: 90 }));
test('sem contexto preserva prescrição, sem números fisiológicos', () => {
  const result = decide({ prescription });
  assert.equal(result.kind, 'maintain'); assert.deepEqual(result.changes, []);
});
test('fadiga declarada sozinha pede confirmação; não reduz automaticamente', () => {
  assert.equal(decide({ prescription, calibration: { sleep: 1, energy: 2 } }).changes.length, 0);
});
test('dor e sessão bloqueada prevalecem sobre qualquer objetivo', () => {
  for (const input of [{ reviewRequired: true }, { sessionLocked: true }, { request: 'joelho incomodando, mais leve' }]) {
    assert.equal(decide({ prescription, ...input }).kind, 'review');
    assert.equal(decide({ prescription, ...input }).changes.length, 0);
  }
});
test('encurtar preserva primeiro exercício, dose e descanso; redução até 20%', () => {
  const result = decide({ prescription, request: 'Pouco tempo, encurtar' });
  assert.equal(result.kind, 'shorten'); assert.equal(result.changes.length, 2);
  assert.ok(result.changes.every(change => change.exercise !== 'A' && change.sets === 2 && change.rpe == null));
  assert.ok(result.limitations.some(note => note.includes('minutos')));
});
test('repetir análise não acumula alterações nem modifica a base', () => {
  const input = { prescription, request: 'Mais leve hoje' };
  assert.deepEqual(decide(input), decide(input)); assert.ok(prescription.every(ex => ex.sets === 3));
});
test('sem progressão e sem troca de equipamento inferida', () => {
  for (const request of ['Mais intenso', 'Falta equipamento']) assert.equal(decide({ prescription, request }).changes.length, 0);
});
test('não remove exercício único nem inventa volume em prescrição inválida', () => {
  assert.equal(decide({ prescription: [prescription[0]], request: 'Mais leve' }).changes.length, 0);
  assert.equal(decide({ prescription: [{ ...prescription[0], sets: NaN }] }).kind, 'review');
  assert.equal(decide({ prescription: [prescription[0], prescription[0]] }).kind, 'review');
});
