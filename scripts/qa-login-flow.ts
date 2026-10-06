import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loginDestination, STUDENT_HOME, AUTH_CALLBACK } from '../src/lib/loginDestination';
const source = (path: string) => readFileSync(path, 'utf8');
test('new, existing, Google and routed student identities share the same home', () => {
  for (const role of ['student', 'user', null, undefined]) {
    assert.equal(loginDestination(role), STUDENT_HOME);
  }
  assert.equal(loginDestination('student', ['admin']), STUDENT_HOME);
  assert.equal(loginDestination('user', ['trainer']), STUDENT_HOME);
});
test('professional roles preserve their dashboard; canonical profile wins', () => {
  for (const role of ['admin', 'super_admin', 'trainer', 'professor']) assert.equal(loginDestination(role, ['student']), '/app');
  assert.equal(loginDestination(null, ['student', 'trainer']), '/app');
  assert.equal(loginDestination(null, ['trainer', 'student']), '/app');
});
test('all entry points use the shared resolver and replace history', () => {
  for (const path of ['src/pages/Auth.tsx', 'src/pages/9fit/Login.tsx', 'src/pages/AuthCallback.tsx']) {
    const text = source(path);
    assert.match(text, /resolveLoginDestination/);
    assert.match(text, /replace: true/);
  }
  const portal = source('src/middleware/SovereignBootstrap.tsx');
  assert.match(portal, /getUser\(\)/);
  assert.match(portal, /replaceState\(\{\}, '', await resolveLoginDestination/);
});
test('signup without session requests email confirmation rather than entering protected home', () => {
  assert.match(source('src/contexts/AuthContext.tsx'), /needsEmailConfirmation: !data.session/);
  assert.match(source('src/pages/Auth.tsx'), /if \(needsEmailConfirmation\).*Confirme seu e-mail/);
  assert.match(source('src/pages/Auth.tsx'), /else navigate\(AUTH_CALLBACK, \{ replace: true \}\)/);
});
test('OAuth and confirmation callbacks are registered and share the same destination', () => {
  assert.equal(AUTH_CALLBACK, '/auth/callback');
  assert.match(source('src/App.tsx'), /path="\/auth\/callback" element=\{<AuthCallback/);
  for (const path of ['src/pages/Auth.tsx', 'src/pages/9fit/Login.tsx', 'src/contexts/AuthContext.tsx']) {
    assert.match(source(path), /window.location.origin\}\$\{AUTH_CALLBACK/);
  }
});
test('home shows pending setup while other student pages retain gates', () => {
  const layout = source('src/components/9fit/NineFitLayout.tsx');
  assert.match(layout, /!firstAccessDone && !onFirstAccess && !onHome/);
  assert.match(layout, /!finished && !profileConfirmed && !onAtivacao && !onOnboarding && !onHome/);
  assert.match(layout, /Continuar configuração/);
});
