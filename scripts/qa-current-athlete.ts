import assert from 'node:assert/strict';
import { test } from 'node:test';
import { QueryClient } from '@tanstack/react-query';

// Client construction reads only the URL; no auth or HTTP request is made here.
(globalThis as any).window = { location: { href: 'https://ninefitpro.lovable.app/' } };
const { supabase } = await import('../src/integrations/supabase/client');
const { currentAthleteOptions, loadCurrentAthlete } = await import('../src/services/currentAthlete');
const actor = { id: 'canonical-id', name: 'Aluno', email: null, phone: null, activated: true, coach_id: null };

function fixture(id: string | null, fail = false) {
  let rpcCalls = 0, profileCalls = 0;
  const signals: AbortSignal[] = [];
  (supabase as any).rpc = () => {
    rpcCalls++;
    return { abortSignal: (signal: AbortSignal) => {
      signals.push(signal);
      return Promise.resolve({ data: id, error: fail ? new Error('offline') : null });
    } };
  };
  (supabase as any).from = (table: string) => {
    assert.equal(table, 'athletes');
    profileCalls++;
    const builder = {
      select: () => builder,
      eq: (column: string, value: string) => {
        assert.equal(column, 'id'); assert.equal(value, 'canonical-id'); return builder;
      },
      single: () => Promise.resolve({ data: actor, error: null }),
      abortSignal: (signal: AbortSignal) => {
        signals.push(signal); return builder;
      },
    };
    return builder;
  };
  return { counts: () => [rpcCalls, profileCalls], signals };
}

test('login and concurrent student surfaces share one canonical profile request', async () => {
  const f = fixture('canonical-id');
  const cache = new QueryClient();
  const options = currentAthleteOptions('user-a');
  const results = await Promise.all(Array.from({ length: 12 }, () => cache.fetchQuery(options)));
  assert.ok(results.every(value => value?.id === actor.id));
  assert.deepEqual(f.counts(), [1, 1]);
  assert.ok(f.signals.every(signal => signal.aborted));
  cache.clear();
});

test('missing profile never falls back to email and account caches stay separate', async () => {
  const f = fixture(null);
  assert.equal(await loadCurrentAthlete(), null);
  assert.deepEqual(f.counts(), [1, 0]);
  assert.notDeepEqual(currentAthleteOptions('user-a').queryKey, currentAthleteOptions('user-b').queryKey);
});

test('failed canonical lookup remains recoverable through explicit retry', async () => {
  const f = fixture('canonical-id', true);
  const cache = new QueryClient();
  const options = currentAthleteOptions('user-a');
  await assert.rejects(cache.fetchQuery(options), /offline/);
  assert.deepEqual(f.counts(), [1, 0]);
  fixture('canonical-id');
  assert.equal((await cache.fetchQuery(options))?.id, actor.id);
  cache.clear();
});
