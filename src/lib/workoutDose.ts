type Dose = { reps?: string | number; reps_range?: string | number; notes?: string };
export function formatWorkoutDose(exercise: Dose): string {
  const raw = String(exercise.reps ?? exercise.reps_range ?? '').trim();
  const seconds = exercise.notes?.match(/isometr[^+]*?\b(\d+(?:[.,]\d+)?)\s*(?:s\b|seg)/i)?.[1];
  if (seconds && (!raw || raw === '1')) return `Isometria ${seconds} s`;
  if (!raw) return 'Dose a confirmar';
  return raw.replace(/(\d)\s*(?:segundos?|seg|s)\b/gi,'$1 s').replace(/\s*\/\s*lado\b/gi,' por lado').replace(/\b(cada lado)\b/gi,'por lado');
}
