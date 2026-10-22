import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRonMarkdown } from './ronMarkdown';

test('normaliza marcação legada sem alterar texto comum ou caminhos', () => {
  assert.equal(normalizeRonMarkdown('\\*\\*Análise\\*\\*'), '**Análise**');
  assert.equal(normalizeRonMarkdown('\\\\*\\\\*Análise\\\\*\\\\*'), '**Análise**');
  assert.equal(normalizeRonMarkdown('### Título\nC:\\dados\n20 kg'), '### Título\nC:\\dados\n20 kg');
});
