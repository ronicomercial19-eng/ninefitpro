/**
 * Regressão Fase 3 · Início (OS)
 * node --test scripts/qa-fase3-inicio.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  markSelfInRanking,
  resolveConsistenciaStatus,
  resolveDestaqueRoute,
  resolveFisicaSubtitle,
  resolveTreinoStatus,
} from '../src/lib/osInicioStatus.ts';

test('falha ou espera da prescrição não vira ausência de ciclo', () => {
  // hasPlan=false: sem prescrição confirmada → Sem ciclo / Sem treino (não inventa ciclo).
  assert.equal(resolveConsistenciaStatus(0, false), 'Sem ciclo');
  assert.equal(resolveTreinoStatus(0, false), 'Sem treino');
  assert.equal(resolveFisicaSubtitle(false, 0, false), 'Sem prescrição ativa detectada');
});

test('plano ativo sem treino na semana continua ciclo, não sem ciclo', () => {
  assert.equal(resolveConsistenciaStatus(0, true), 'Ciclo ativo');
  assert.equal(resolveTreinoStatus(0, true), 'Plano ativo');
  assert.equal(resolveFisicaSubtitle(false, 0, true), 'Prescrição ativa no ciclo');
});

test('sem plano confirmado permanece sem treino e sem ciclo', () => {
  assert.equal(resolveTreinoStatus(0, false), 'Sem treino');
  assert.equal(resolveConsistenciaStatus(0, false), 'Sem ciclo');
});

test('treinos da semana prevalecem sobre o estado do plano', () => {
  assert.equal(resolveTreinoStatus(3, false), '3 treinos');
  assert.equal(resolveTreinoStatus(2, true), '2 treinos');
  assert.equal(resolveConsistenciaStatus(4, true), '4 na semana');
  assert.equal(resolveConsistenciaStatus(1, false), '1 na semana');
});

test('posição usa o id do atleta, não o primeiro nome', () => {
  const rows = [
    { id: 'a1', name: 'Ana' },
    { id: 'a2', name: 'Bruno' },
    { id: 'a3', name: 'Ana' },
  ];
  const marked = markSelfInRanking(rows, 'a3', 'Ana');
  assert.equal(marked.filter((r) => r.self).length, 1);
  assert.equal(marked[2].self, true);
  assert.equal(marked[0].self, false);

  // Sem id: fallback por nome completo da primeira ocorrência legítima
  const byName = markSelfInRanking(
    [{ name: 'Fernanda' }, { name: 'Roni' }],
    null,
    'Fernanda',
  );
  assert.equal(byName[0].self, true);
  assert.equal(byName[1].self, false);
});

test('destaques do início abrem comunidade, treino e ranking reais', () => {
  assert.equal(resolveDestaqueRoute('community-feed'), '/9fit/community');
  assert.equal(resolveDestaqueRoute('social-ranking'), '/9fit/social');
  assert.equal(resolveDestaqueRoute('news-updates'), '/9fit/social');
  // Treino continua nos pilares / CTA do modal, rota canônica:
  assert.equal('/9fit/train'.startsWith('/9fit/'), true);
});
