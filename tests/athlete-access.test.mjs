import assert from 'node:assert/strict';
import test from 'node:test';
import { canAccessAthlete, canAccessConnectionAthlete, canAccessStudentTarget, isAthleteId } from '../supabase/functions/_shared/athlete-access.ts';

const athleteId = '11111111-1111-4111-8111-111111111111';
const owner = '22222222-2222-4222-8222-222222222222';
const coach = '33333333-3333-4333-8333-333333333333';
const linked = '44444444-4444-4444-8444-444444444444';
const stranger = '55555555-5555-4555-8555-555555555555';

function adminMock({ link = false, role = null } = {}) {
  return {
    from(table) {
      const filters = {};
      const result = () => ({
        data: table === 'athletes'
          ? (filters.id === athleteId ? { id: athleteId, user_id: owner, coach_id: coach } : null)
          : table === 'athlete_auth_link'
            ? (link && filters.user_id === linked ? { id: 'link' } : null)
            : role ? [{ role }] : [],
        error: null,
      });
      const query = {
        select() { return query; },
        eq(key, value) { filters[key] = value; return query; },
        limit() { return query; },
        async maybeSingle() { return result(); },
        then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); },
      };
      return query;
    },
  };
}

test('rejects malformed and unknown athlete IDs', async () => {
  assert.equal(isAthleteId('other'), false);
  assert.equal(await canAccessAthlete(adminMock(), owner, 'other'), false);
  assert.equal(await canAccessAthlete(adminMock(), owner, '66666666-6666-4666-8666-666666666666'), false);
});

test('allows owner, assigned coach, linked athlete account and administrator', async () => {
  assert.equal(await canAccessAthlete(adminMock(), owner, athleteId), true);
  assert.equal(await canAccessAthlete(adminMock(), coach, athleteId), true);
  assert.equal(await canAccessAthlete(adminMock({ link: true }), linked, athleteId), true);
  assert.equal(await canAccessAthlete(adminMock({ role: 'admin' }), stranger, athleteId), true);
});

test('denies unrelated users and unassigned professionals', async () => {
  assert.equal(await canAccessAthlete(adminMock(), stranger, athleteId), false);
  assert.equal(await canAccessAthlete(adminMock({ role: 'trainer' }), stranger, athleteId), false);
});

test('SmartTreino proxy authorizes the canonical target and rejects an unmapped external ID', async () => {
  assert.equal(await canAccessStudentTarget(adminMock(), owner, athleteId), true);
  assert.equal(await canAccessStudentTarget(adminMock(), stranger, athleteId), false);
  assert.equal(await canAccessStudentTarget(adminMock(), owner, 'external-student'), false);
});

test('connection key alone needs a matching professor; scoped caller or internal service is explicit', async () => {
  assert.equal(await canAccessConnectionAthlete(adminMock(), { professor_id: null }, athleteId, null, false), false);
  assert.equal(await canAccessConnectionAthlete(adminMock(), { professor_id: coach }, athleteId, null, false), true);
  assert.equal(await canAccessConnectionAthlete(adminMock(), { professor_id: stranger }, athleteId, null, false), false);
  assert.equal(await canAccessConnectionAthlete(adminMock(), { professor_id: null }, athleteId, owner, false), true);
  assert.equal(await canAccessConnectionAthlete(adminMock(), { professor_id: null }, athleteId, null, true), true);
  assert.equal(await canAccessConnectionAthlete(adminMock(), { professor_id: null }, 'bad-id', null, true), false);
});
