import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAuthSessionGate } from '../src/lib/authSessionGate.ts';

test('logout cancels identity work queued before the request starts', async () => {
  const gate = createAuthSessionGate();
  const generation = gate.next();
  let requests = 0;
  const deferred = Promise.resolve().then(() => {
    if (gate.isCurrent(generation)) requests++;
  });
  gate.next(); // Logout before the deferred callback starts.
  await deferred;
  assert.equal(requests, 0);
});

test('switching accounts discards a late response from the previous account', async () => {
  const gate = createAuthSessionGate();
  const old = gate.next();
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  let identity = 'new-user';
  const response = pending.then(() => {
    if (gate.isCurrent(old)) identity = 'old-user';
  });
  const current = gate.next();
  release();
  await response;
  assert.equal(identity, 'new-user');
  assert.equal(gate.isCurrent(current), true);
});

test('initial session response cannot overwrite a newer auth event, even for the same user', () => {
  const gate = createAuthSessionGate();
  assert.equal(gate.canApplyInitial(), true);
  gate.observe();
  assert.equal(gate.canApplyInitial(), false);
});

test('unmount and StrictMode remount never revive old identity work', () => {
  const oldGate = createAuthSessionGate();
  const old = oldGate.next();
  oldGate.dispose();
  const newGate = createAuthSessionGate();
  const current = newGate.next();
  assert.equal(oldGate.isCurrent(old), false);
  assert.equal(oldGate.canApplyInitial(), false);
  assert.equal(newGate.isCurrent(current), true);
});
