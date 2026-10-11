import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRole, isStaffRole, isAdminRole, createGenerationGuard } from '../authRole';

describe('resolveRole', () => {
  it('profile role wins over legacy role rows', () => {
    assert.equal(resolveRole('student', ['admin']), 'student');
  });
  it('falls back to highest-priority role row', () => {
    assert.equal(resolveRole(null, ['student', 'trainer']), 'trainer');
  });
  it('returns null without server data', () => {
    assert.equal(resolveRole(null, []), null);
  });
});

describe('vertical access', () => {
  it('students and unknown are not staff', () => {
    assert.equal(isStaffRole('student'), false);
    assert.equal(isStaffRole('user'), false);
    assert.equal(isStaffRole(null), false);
  });
  it('professor and trainer reach the panel, only admins are admin', () => {
    assert.equal(isStaffRole('professor'), true);
    assert.equal(isStaffRole('trainer'), true);
    assert.equal(isAdminRole('trainer'), false);
    assert.equal(isAdminRole('admin'), true);
  });
});

describe('session switch guard', () => {
  it('discards responses from a previous session', () => {
    const g = createGenerationGuard();
    const a = g.next();
    const b = g.next(); // troca de sessão
    assert.equal(g.isCurrent(a), false);
    assert.equal(g.isCurrent(b), true);
  });
  it('logout invalidates pending loads', () => {
    const g = createGenerationGuard();
    const a = g.next();
    g.next();
    assert.equal(g.isCurrent(a), false);
  });
});
