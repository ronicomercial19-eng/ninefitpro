import assert from 'node:assert/strict';
import test from 'node:test';
import { assessmentMetrics, compareRow, compatibleMetric, goalHistory, goalProjection, metricRecord, trustFor } from './assessmentMetrics';
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
test('comparação no mesmo dia usa criação e id, nunca registro posterior',()=>{
  const a=row(0,60,{data_avaliacao:'2026-10-22',created_at:'2026-10-22T10:00:00Z',id:'a'});
  const b=row(0,65,{data_avaliacao:'2026-10-22',created_at:'2026-10-22T11:00:00Z',id:'b'});
  assert.equal(compareRow([b,a],a,'anterior'),null);
  assert.equal(compareRow([b,a],b,'anterior')?.id,'a');
});
test('estimativas guiadas não viram medições nem recordes',()=>{
  const a=row(0,80,{origem:'avaliacao_guiada',oficial:false,gordura_corporal:20,dados_adicionais:{metodo_gordura:'us_navy_estimativa',confianca:'Alta (5/6)'}});
  assert.equal(trustFor(a,assessmentMetrics.find(m=>m.key==='gordura_corporal')!),'ESTIMADO');
  assert.equal(trustFor(a,assessmentMetrics.find(m=>m.key==='rm1_empurrar_superior')!),'ESTIMADO');
  assert.equal(metricRecord(a,assessmentMetrics.find(m=>m.key==='rm1_empurrar_superior')!,[row(0,60)]),false);
  const legacy={...a,dados_adicionais:{metodo_gordura:'us_navy_estimativa',confianca:{gordura_corporal:'CONFIRMADO',rm1_empurrar_superior:'CONFIRMADO'}}};
  assert.equal(trustFor(legacy,assessmentMetrics.find(m=>m.key==='gordura_corporal')!),'ESTIMADO');
  assert.equal(trustFor(legacy,assessmentMetrics.find(m=>m.key==='rm1_empurrar_superior')!),'ESTIMADO');
});
test('não compara versões de score, cobertura ou protocolos diferentes',()=>{
  const a=row(0,60,{score_forca:20,dados_adicionais:{score_formula_version:'coverage_v2',protocolo:'a'}});
  const b=row(1,70,{score_forca:30,dados_adicionais:{protocolo:'b'}});
  assert.equal(compatibleMetric(a,b,'score_global'),false);
  assert.equal(compatibleMetric(a,b,'rm1_empurrar_superior'),false);
  assert.equal(compatibleMetric(a,{...a,score_core:20},'score_global'),false);
});
test('campos guiados persistidos têm unidade e mapeamento de exibição',()=>{
  for(const key of ['sentar_levantar_30s','step_test_fc_1min','equilibrio_unipodal_esq_seg','equilibrio_unipodal_dir_seg','sentar_alcancar_cm','circunferencia_pescoco']) assert.ok(assessmentMetrics.find(m=>m.key===key)?.unit);
});
