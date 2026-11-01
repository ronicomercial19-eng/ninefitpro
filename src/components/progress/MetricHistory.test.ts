import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { MetricHistory } from './MetricHistory';
import type { AssessmentHub, AssessmentRow } from '@/services/assessmentHubService';

const hub = (assessments: AssessmentRow[]): AssessmentHub => ({ contract_version: 1, can_manage: true, assessments, references: [], sources: [], settings: { interval_weeks: 8, reminder_enabled: false }, goals: [], workouts: [], loads: [], records: [] });
const render = (data: AssessmentHub) => renderToStaticMarkup(createElement(StaticRouter, { location: '/9fit/progresso' }, createElement(MetricHistory, { hub: data, assessmentPath: '/9fit/avaliacao' })));

test('capacidades usa testes guiados sem exigir score ou avaliação oficial', () => {
  const data = hub([{ id: 'guiada', data_avaliacao: '2026-10-31', origem: 'avaliacao_guiada', oficial: false, peso: 72, core_prancha_seg: 45 } as AssessmentRow]);
  const html = renderToStaticMarkup(createElement(StaticRouter, { location: '/9fit/progresso/capacidades' }, createElement(MetricHistory, { hub: data, assessmentPath: '/9fit/avaliacao', capacityOnly: true })));
  assert.match(html, /Prancha/);
  assert.match(html, /45/);
  assert.doesNotMatch(html, /72|primeira avaliação oficial/);
});

test('a última métrica aparece independentemente da origem e da ordem recebida', () => {
  const data = hub([
    { id: 'guiada', data_avaliacao: '2026-10-31', origem: 'avaliacao_guiada', peso: 72 } as AssessmentRow,
    { id: 'professor', data_avaliacao: '2026-10-01', origem: 'manual', peso: 75, circunferencia_cintura: 80 } as AssessmentRow,
  ]);
  const html = render(data);
  assert.match(html, /72/);
  assert.doesNotMatch(html, />75/);
  assert.match(html, /Circunferência · Cintura/);
  assert.match(html, /Ver evolução/);
  assert.doesNotMatch(html, /Com professor|Autoavaliação/);
});

test('histórico vazio explica o próximo passo sem inventar métricas', () => {
  const html = render(hub([]));
  assert.match(html, /Suas métricas aparecem aqui/);
  assert.doesNotMatch(html, /Peso|Gordura corporal/);
});
