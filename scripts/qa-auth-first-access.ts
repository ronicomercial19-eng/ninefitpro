import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readIncomingAuth, cleanAuthUrl, tokenMatchesProject } from '../src/lib/authTokens';
import { finalizeFirstAccess } from '../src/lib/firstAccess';
import { readFileSync } from 'node:fs';

test('SSO reads fragment and legacy query without mixing credentials', () => {
  assert.deepEqual(readIncomingAuth('https://example.com/?access_token=q&refresh_token=r#access_token=h&refresh_token=s'), { kind: 'session', accessToken: 'h', refreshToken: 's' });
  assert.deepEqual(readIncomingAuth('https://example.com/?access_token=q&refresh_token=r'), { kind: 'session', accessToken: 'q', refreshToken: 'r' });
  assert.deepEqual(readIncomingAuth('https://example.com/?refresh_token=r#access_token=h'), { kind: 'invalid' });
  assert.deepEqual(readIncomingAuth('https://example.com/#access_token='), { kind: 'invalid' });
});
test('URL cleanup preserves destination, query and ordinary anchors', () => {
  assert.equal(cleanAuthUrl('https://example.com/9fit/hub?offer=abc&access_token=x#access_token=y&refresh_token=z&tab=treino'), '/9fit/hub?offer=abc#tab=treino');
  assert.equal(cleanAuthUrl('https://example.com/9fit/hub?offer=abc#treino'), '/9fit/hub?offer=abc#treino');
});
test('tokens from another project or malformed tokens are rejected', () => {
  const token = 'a.' + Buffer.from(JSON.stringify({ iss: 'https://mfrydtrzjxscbkaiwfnw.supabase.co/auth/v1' })).toString('base64url') + '.c';
  assert.equal(tokenMatchesProject(token, 'https://mfrydtrzjxscbkaiwfnw.supabase.co'), true);
  assert.equal(tokenMatchesProject(token, 'https://other.supabase.co'), false);
  assert.equal(tokenMatchesProject('invalid', 'https://mfrydtrzjxscbkaiwfnw.supabase.co'), false);
});
test('RPC failure does not mark success or refresh; retry only finalizes', async () => {
  const writes: string[] = [];
  let calls = 0; let refreshes = 0;
  const client = { rpc: async () => ({ error: ++calls === 1 ? { message: 'failed' } : null }), refreshSession: async () => { refreshes++; return { error: null }; } };
  const storage = { setItem: (key: string) => { writes.push(key); }, removeItem: () => {} };
  await assert.rejects(finalizeFirstAccess(client, 'priscila-test', storage), /failed/);
  assert.equal(writes.length, 0); assert.equal(refreshes, 0);
  await finalizeFirstAccess(client, 'priscila-test', storage);
  assert.deepEqual(writes, ['9fit_first_access_completed:priscila-test']);
  assert.equal(calls, 2); assert.equal(refreshes, 1);
});
test('refresh or browser storage failure cannot undo successful completion', async () => {
  const client = { rpc: async () => ({ error: null }), refreshSession: async () => { throw new Error('network'); } };
  const storage = { setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } };
  assert.deepEqual(await finalizeFirstAccess(client, 'user-test', storage), { refreshFailed: true });
});
test('first-access completion goes straight to activation; legacy route still points at guarded hub', () => {
  const firstAccess = readFileSync('src/pages/9fit/FirstAccess.tsx', 'utf8');
  const app = readFileSync('src/App.tsx', 'utf8');
  assert.match(firstAccess, /navigate\('\/9fit\/ativacao', \{ replace: true \}\)/);
  assert.match(app, /path="\/9fit\/onboarding-pro" element=\{<Navigate to="\/9fit\/hub" replace/);
  assert.match(app, /path="\/9fit\/ativacao" element=\{<NineFitLayout>/);
  assert.match(firstAccess, /onClick=\{\(\) => void runFinalize\(\)\}/);
});
