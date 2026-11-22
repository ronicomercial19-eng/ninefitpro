import test from "node:test";
import assert from "node:assert/strict";
import { coreWorkday, filterWorkday } from "../coreWorkday";
import type { CoachOverviewRow } from "../professorOverview";
const today = "2026-11-22";
const row = (
  id: string,
  patch: Partial<CoachOverviewRow> = {}
): CoachOverviewRow => ({
  id,
  name: id,
  active: true,
  goal: null,
  completed_workouts: 0,
  prescribed_sessions: 0,
  avg_rpe: null,
  duration_minutes: 0,
  assignments: [],
  ...patch,
});
const assignment = (id: string, end: string | null, active = true) => ({
  student_id: id,
  end_date: end,
  is_active: active,
});
test("one student occupies exactly one coverage category, preferring a current assignment", () => {
  const result = coreWorkday(
    [
      row("A", {
        assignments: [
          assignment("A", "2026-11-21"),
          assignment("A", null),
          assignment("A", today),
        ],
      }),
      row("B", { assignments: [assignment("B", null)] }),
      row("C", { assignments: [assignment("C", "2026-11-21")] }),
      row("D"),
    ],
    today
  );
  assert.deepEqual(result.students.map((r) => [r.id, r.prescription]).sort(), [
    ["A", "current"],
    ["B", "undated"],
    ["C", "expired"],
    ["D", "missing"],
  ]);
  const s = result.summary;
  assert.equal(
    s.current + s.withoutEndDate + s.expired + s.withoutTraining,
    s.students
  );
});
test("inactive assignments cannot make a prescription current; inactive accounts are not operational planning priorities", () => {
  const result = coreWorkday(
    [
      row("A", { assignments: [assignment("A", today, false)] }),
      row("B", { active: false }),
    ],
    today
  );
  assert.equal(result.students[0].prescription, "missing");
  assert.equal(result.students[0].needsPlanning, true);
  assert.equal(result.students[1].needsPlanning, false);
});
test("coverage and totals deduplicate by identity while preserving people with the same name", () => {
  const result = coreWorkday(
    [
      row("A", { name: "Ana", completed_workouts: 2 }),
      row("A", { name: "Ana", completed_workouts: 3 }),
      row("B", { name: "Ana", completed_workouts: 1 }),
    ],
    today
  );
  assert.equal(result.summary.students, 2);
  assert.equal(result.summary.completed, 4);
});
test("a zero record filter does not include inactive accounts or infer an adherence score", () => {
  const result = coreWorkday(
    [
      row("A"),
      row("B", { completed_workouts: 1 }),
      row("C", { active: false }),
    ],
    today
  );
  assert.deepEqual(
    filterWorkday(result.students, "", "no-records").map((r) => r.id),
    ["A"]
  );
  assert.ok(!("adherence" in result));
});
test("accent-insensitive search and planning filters work together without adding students", () => {
  const result = coreWorkday(
    [
      row("A", { name: "João" }),
      row("B", { name: "João", assignments: [assignment("B", today)] }),
      row("C", { name: "Maria" }),
    ],
    today
  );
  assert.deepEqual(
    filterWorkday(result.students, " JOAO ", "planning").map((r) => r.id),
    ["A"]
  );
  assert.equal(filterWorkday(result.students, "ninguém", "all").length, 0);
});
