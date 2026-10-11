import { describe, it, expect } from 'vitest';
import { resolveRole, isStaffRole, isAdminRole, createGenerationGuard } from '../authRole';

describe('resolveRole', () => {
  it('profile role wins over legacy role rows', () => {
    expect(resolveRole('student', ['admin'])).toBe('student');
  });
  it('falls back to highest-priority role row', () => {
    expect(resolveRole(null, ['student', 'trainer'])).toBe('trainer');
  });
  it('returns null without server data', () => {
    expect(resolveRole(null, [])).toBeNull();
  });
});

describe('vertical access', () => {
  it('students and unknown are not staff', () => {
    expect(isStaffRole('student')).toBe(false);
    expect(isStaffRole('user')).toBe(false);
    expect(isStaffRole(null)).toBe(false);
  });
  it('professor and trainer reach the panel, only admins are admin', () => {
    expect(isStaffRole('professor')).toBe(true);
    expect(isStaffRole('trainer')).toBe(true);
    expect(isAdminRole('trainer')).toBe(false);
    expect(isAdminRole('admin')).toBe(true);
  });
});

describe('session switch guard', () => {
  it('discards responses from a previous session', () => {
    const g = createGenerationGuard();
    const a = g.next();
    const b = g.next(); // troca de sessão
    expect(g.isCurrent(a)).toBe(false);
    expect(g.isCurrent(b)).toBe(true);
  });
  it('logout invalidates pending loads', () => {
    const g = createGenerationGuard();
    const a = g.next();
    g.next();
    expect(g.isCurrent(a)).toBe(false);
  });
});
