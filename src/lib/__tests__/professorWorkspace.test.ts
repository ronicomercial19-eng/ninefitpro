import { test } from "node:test";
import assert from "node:assert/strict";
import { withAthlete, saoPauloInstant } from "../professorWorkspace";
import { summarizeOverview } from "../professorOverview";
import {
  requestedStudent,
  validatePrescriptionExercises,
} from "../../../supabase/functions/_shared/professorContract";
const a = "10000000-0000-4000-8000-000000000001",
  b = "10000000-0000-4000-8000-000000000002";
test("navigation preserves student, date and fragment only inside professor routes", () => {
  assert.equal(
    withAthlete("/app/treino-ia?date=2026-10-23#review", a),
    `/app/treino-ia?date=2026-10-23&athlete=${a}#review`,
  );
  assert.equal(withAthlete("/9fit/train", a), "/9fit/train");
  assert.equal(
    withAthlete("https://external.test/app", a),
    "https://external.test/app",
  );
  assert.equal(withAthlete("/app?athlete=invalid", null), "/app");
});
test("São Paulo scheduling uses an explicit instant and rejects normalized invalid dates", () => {
  assert.equal(saoPauloInstant("2026-10-23T09:00"), "2026-10-23T12:00:00.000Z");
  assert.throws(() => saoPauloInstant("2026-02-31T09:00"));
  assert.throws(() => saoPauloInstant("2026-10-23T25:00"));
});
test("AI refuses conflicting student identifiers instead of silently changing target", () => {
  assert.equal(requestedStudent({ athlete_id: a, data: { athleteId: a } }), a);
  assert.throws(() =>
    requestedStudent({ athlete_id: a, data: { athleteId: b } }),
  );
  assert.throws(() => requestedStudent({ athlete_id: "anything" }));
  assert.equal(requestedStudent({}), null);
});
test("draft requires real catalog IDs and explicit bounded prescription parameters", () => {
  const e = {
    exercise_id: a,
    sets: 3,
    reps_range: "8-12",
    rest_seconds: 60,
    athlete_id: b,
  };
  assert.deepEqual(validatePrescriptionExercises([e], new Set([a]))[0], {
    exercise_id: a,
    sets: 3,
    reps_range: "8-12",
    rest_seconds: 60,
    notes: undefined,
  });
  assert.throws(() => validatePrescriptionExercises([e], new Set([b])));
  assert.throws(() => validatePrescriptionExercises([{ ...e, sets: 11 }]));
  assert.throws(() =>
    validatePrescriptionExercises([{ ...e, rest_seconds: -1 }]),
  );
  assert.throws(() => validatePrescriptionExercises([]));
});
test("overview counts people once and separates prescribed from completed", () => {
  const row = {
    id: a,
    name: "Aluno",
    active: true,
    goal: null,
    completed_workouts: 2,
    prescribed_sessions: 3,
    avg_rpe: null,
    duration_minutes: 60,
    assignments: [{ student_id: a, is_active: true, end_date: "2026-11-01" }],
  };
  const summary = summarizeOverview(
    [row, row, { ...row, id: b, assignments: [] }],
    "2026-10-23",
  );
  assert.equal(summary.students, 2);
  assert.equal(summary.completed, 4);
  assert.equal(summary.prescribed, 6);
  assert.equal(summary.withoutTraining, 1);
  assert.equal(summary.current, 1);
});
