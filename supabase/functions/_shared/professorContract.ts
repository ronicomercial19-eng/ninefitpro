const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function requestedStudent(body: any): string | null {
  const values = [
    body.athlete_id,
    body.data?.athleteId,
    body.data?.studentId,
  ].filter((v) => v != null);
  if (!values.length) return null;
  if (
    values.some(
      (v) => typeof v !== "string" || !uuid.test(v) || v !== values[0],
    )
  )
    throw new Error("invalid_student_scope");
  return values[0];
}
export interface PrescriptionExercise {
  exercise_id: string;
  sets: number;
  reps_range: string;
  rest_seconds: number;
  notes?: string;
  name?: string;
}
export function validatePrescriptionExercises(
  raw: unknown,
  allowedIds?: Set<string>,
): PrescriptionExercise[] {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 40)
    throw new Error("Informe de 1 a 40 exercícios.");
  return raw.map((e) => {
    if (
      !e ||
      !uuid.test(e.exercise_id) ||
      (allowedIds && !allowedIds.has(e.exercise_id)) ||
      !Number.isInteger(e.sets) ||
      e.sets < 1 ||
      e.sets > 10 ||
      typeof e.reps_range !== "string" ||
      !e.reps_range.trim() ||
      e.reps_range.length > 60 ||
      !Number.isInteger(e.rest_seconds) ||
      e.rest_seconds < 0 ||
      e.rest_seconds > 600
    )
      throw new Error("Confira exercícios, séries, repetições e descanso.");
    return {
      exercise_id: e.exercise_id,
      sets: e.sets,
      reps_range: e.reps_range.trim(),
      rest_seconds: e.rest_seconds,
      notes: typeof e.notes === "string" ? e.notes.slice(0, 1000) : undefined,
    };
  });
}
