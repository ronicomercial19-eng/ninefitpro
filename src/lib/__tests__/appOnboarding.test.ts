import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AppOnboardingState, onboardingStep, onboardingNextAction, onboardingSaveError, onboardingGender } from '../appOnboarding';
const state = (): AppOnboardingState => ({ onboarding: null, full_name: 'Aluno', birthdate: null, subscription: null, next_workout: null, assignments: [], first_workout_completed: false });
test('onboarding resumes the first missing group, preserving profile and workout separation', () => {
    const s = state();
    assert.equal(onboardingStep(s, true), 0);
    s.onboarding = { answers: { welcome_seen: true }, revision: 1, completed_at: null };
    assert.equal(onboardingStep(s, true), 1);
    Object.assign(s.onboarding.answers, { full_name: 'Aluno', experience: 'beginner', training_days: [1], session_minutes: 30, training_environment: 'home', equipment: [], current_pain: false, movement_limitations: '' });
    assert.equal(onboardingStep(s, false), 4);
    assert.equal(onboardingStep(s, true), 5);
    s.onboarding.completed_at = '2026-10-28';
    assert.equal(onboardingStep(s, true), 6);
    assert.equal(s.first_workout_completed, false);
});
test('limitations take priority over a ready workout and do not claim a review was already sent', () => {
    const s = state();
    s.onboarding = { answers: { current_pain: true }, revision: 1, completed_at: '2026-10-28' };
    s.next_workout = { id: 'id', title: 'Treino', date: '2026-10-28' };
    assert.equal(onboardingNextAction(s).href, '/9fit/acompanhamento?module=onboarding');
});
test('metadata-only assignments cannot be advertised as a ready workout', () => {
    const s = state();
    s.assignments = [{ training_type: 'structured', training_data: { exercises: [] } }];
    assert.equal(onboardingNextAction(s).href, '/9fit/acompanhamento?module=training');
    s.assignments = [{ training_type: 'structured', training_data: { exercises: [{ name: 'Exercício', sets: 3, reps: '12' }] } }];
    assert.equal(onboardingNextAction(s).href, '/9fit/train');
});
test('future prescription leads to planning rather than claiming a session for today', () => {
    const s = state();
    s.next_workout = { id: 'id', title: 'Treino', date: '2026-10-30' };
    assert.equal(onboardingNextAction(s, '2026-10-28').href, '/9fit/planejamento');
});
test('save errors explain correction and do not claim an ambiguous write failed', () => {
    assert.match(onboardingSaveError({ message: 'onboarding_revision_conflict' }), /outra aba/);
    assert.match(onboardingSaveError({ message: 'invalid_birthdate' }), /data válida/);
    assert.match(onboardingSaveError({ message: 'confirmed_pdi_required' }), /confirme sua ficha/);
    assert.match(onboardingSaveError(new Error('timeout')), /conferir antes/);
});

test('legacy sex labels populate the optional form without inventing missing data', () => {
    assert.equal(onboardingGender('female'), 'Feminino');
    assert.equal(onboardingGender('M'), 'Masculino');
    assert.equal(onboardingGender(null), null);
    assert.equal(onboardingGender('unknown'), null);
});
