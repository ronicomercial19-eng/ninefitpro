import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchBatchedRows } from '../batchedRows';

test('3,000 accounts are complete, ordered and bounded to 100 IDs / 3 requests', async () => {
  const ids = Array.from({length: 3000}, (_, i) => `account-${i}`);
  let active = 0, maximum = 0, calls = 0;
  const rows = await fetchBatchedRows([...ids, ids[0]], async batch => {
    assert.ok(batch.length <= 100);
    calls++; maximum = Math.max(maximum, ++active);
    await new Promise(resolve => setTimeout(resolve, calls % 3));
    active--; return batch;
  });
  assert.deepEqual(rows, ids);
  assert.equal(calls, 30); assert.equal(maximum, 3);
});
test('empty roster has no requests and failures never return a partial roster', async () => {
  assert.deepEqual(await fetchBatchedRows([], () => { throw Error('unexpected'); }), []);
  await assert.rejects(fetchBatchedRows(['a'], async () => { throw Error('offline'); }), /offline/);
});
test('cancellation stops starting more batches', async () => {
  const controller = new AbortController(); let calls = 0;
  await assert.rejects(fetchBatchedRows(Array.from({length: 3000}, (_, i) => `${i}`), async ids => {
    calls++; controller.abort(); return ids;
  }, controller.signal), {name: 'AbortError'});
  assert.equal(calls, 1);
});
