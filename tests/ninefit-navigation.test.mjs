import assert from 'node:assert/strict';
import test from 'node:test';
import { goBackOrHome } from '../src/lib/ninefitNavigation.ts';

test('a direct link never sends the student back to an external site', () => {
  const previousWindow = globalThis.window;
  globalThis.window = { history: { state: { idx: 0 }, length: 5 } };
  try {
    const calls = [];
    goBackOrHome((...args) => calls.push(args));
    assert.deepEqual(calls, [['/9fit/hub', { replace: true }]]);
  } finally { globalThis.window = previousWindow; }
});

test('in-app history returns to the previous FitPro screen', () => {
  const previousWindow = globalThis.window;
  globalThis.window = { history: { state: { idx: 2 } } };
  try {
    const calls = [];
    goBackOrHome((...args) => calls.push(args));
    assert.deepEqual(calls, [[-1]]);
  } finally { globalThis.window = previousWindow; }
});
