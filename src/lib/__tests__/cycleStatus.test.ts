import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cycleBadge } from '../../components/9fit/cycleStatus';

describe('cycleBadge', () => {
  it('só confirma ciclo em andamento quando o plano foi lido', () => {
    assert.deepEqual(cycleBadge('active'), { label: 'CICLO EM ANDAMENTO', active: true });
    assert.equal(cycleBadge('none').label, 'SEM CICLO ATIVO');
    assert.equal(cycleBadge('none').active, false);
  });

  it('não chama ausência quando a leitura ainda não confirmou o plano', () => {
    assert.equal(cycleBadge('loading').label, 'LENDO CICLO');
    assert.equal(cycleBadge('unavailable').label, 'CICLO NÃO CONFIRMADO');
    assert.equal(cycleBadge('loading').active, false);
    assert.equal(cycleBadge('unavailable').active, false);
  });
});
