import assert from 'node:assert/strict';
import test from 'node:test';
import { goalHistory, goalProjection } from './assessmentMetrics';
import type { AssessmentRow, HubGoal } from './assessmentHubService';

const goal: HubGoal = { id: 'goal', titulo: 'Supino', exercicio: 'supino', metrica: 'rm1_empurrar_superior', valor_inicial: 60, valor_atual: 90, valor_meta: 120, unidade: 'kg', prazo: null, status: 'ativa' };
const row = (index: number, value: number, overrides: Record<string, unknown> = {}) => ({ id: String(index), data_avaliacao: `2026-0${index + 1}-01`, origem: 'manual', oficial: true, rm1_empurrar_superior: value, dados_adicionais: { protocolo: 'mesmo-teste' }, ...overrides } as unknown as AssessmentRow);
test('projection requires four official days and never uses self reports', () => {
  const rows = [row(0, 60), row(1, 70), row(2, 80), row(3, 100, { origem: 'avaliacao_guiada', oficial: false })];
  assert.equal(goalProjection(goal, rows).count, 3);
  assert.equal(goalProjection(goal, rows).estimate, null);
});
test('four compatible measurements moving toward goal produce a bounded estimate', () => {
  const result = goalProjection(goal, [row(0,60), row(1,70), row(2,80), row(3,90)]);
  assert.ok(result.estimate);
  assert.ok(result.estimate.date > '2026-04-01');
  assert.ok(result.estimate.from <= result.estimate.date);
  assert.ok(result.estimate.to >= result.estimate.date);
});
test('flat or reverse trend does not promise a completion date', () => {
  assert.equal(goalProjection(goal, [row(0,90),row(1,90),row(2,90),row(3,90)]).estimate, null);
  assert.equal(goalProjection(goal, [row(0,90),row(1,80),row(2,70),row(3,60)]).estimate, null);
});
test('different units, protocols, estimated measurements and duplicate dates are not mixed', () => {
  const rows = [row(0,60), row(1,70), row(2,80), row(3,90, { dados_adicionais: { protocolo: 'novo-teste' } })];
  assert.equal(goalHistory(goal, rows).length, 1);
  assert.equal(goalHistory({ ...goal, unidade: '%' }, rows).length, 0);
  assert.equal(goalHistory(goal, [row(0,60),row(0,62)]).length, 1);
  assert.equal(goalHistory(goal, [row(0,60, { dados_adicionais: { confianca: { rm1_empurrar_superior: 'ESTIMADO' } } })]).length, 0);
});
test('decreasing body goals can project a decreasing trend', () => {
  const weight = { ...goal, metrica: 'peso', exercicio: null, valor_inicial: 90, valor_atual: 84, valor_meta: 80 };
  assert.ok(goalProjection(weight, [row(0,0,{peso:90}),row(1,0,{peso:88}),row(2,0,{peso:86}),row(3,0,{peso:84})]).estimate);
});
