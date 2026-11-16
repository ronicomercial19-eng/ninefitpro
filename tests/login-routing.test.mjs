import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loginDestination } from '../src/lib/loginDestination.ts';
import { cleanAuthUrl, readIncomingAuth, tokenMatchesProject } from '../src/lib/authTokens.ts';

test('student registration, existing login and Google callback share the FitPro home', () => {
  assert.equal(loginDestination('student', []), '/9fit/hub');
  assert.equal(loginDestination(null, ['aluno']), '/9fit/hub');
  assert.equal(loginDestination(null, []), '/9fit/hub');
  assert.equal(loginDestination('trainer', []), '/app');
});

test('router link requires both tokens and removes credentials from browser URL', () => {
  const incoming = readIncomingAuth('https://ninefitpro.lovable.app/#access_token=abc&refresh_token=def&user_id=123');
  assert.deepEqual(incoming, { kind: 'session', accessToken: 'abc', refreshToken: 'def' });
  assert.equal(cleanAuthUrl('https://ninefitpro.lovable.app/#access_token=abc&refresh_token=def&user_id=123'), '/');
  assert.equal(readIncomingAuth('https://ninefitpro.lovable.app/#access_token=abc').kind, 'invalid');
});

test('router token must be issued by the shared Supabase project', () => {
  const payload = btoa(JSON.stringify({ iss: 'https://mfrydtrzjxscbkaiwfnw.supabase.co/auth/v1' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  assert.equal(tokenMatchesProject(`x.${payload}.sig`, 'https://mfrydtrzjxscbkaiwfnw.supabase.co'), true);
  assert.equal(tokenMatchesProject(`x.${payload}.sig`, 'https://other.supabase.co'), false);
});
