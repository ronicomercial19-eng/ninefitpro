import { summarizeOverview, type CoachOverviewRow } from "./professorOverview";
import { trainingFollowUp } from "./trainingFollowUp";

export type PrescriptionState = "current" | "undated" | "expired" | "missing";
export type WorkdayFilter = "all" | "planning" | "no-records";
export const prescriptionLabels: Record<PrescriptionState, string> = {
  current: "Atribuição vigente",
  undated: "Sem vencimento definido",
  expired: "Prazo encerrado",
  missing: "Sem atribuição de treino",
};

/** Operational coverage only. Absence of records is never a clinical or adherence assessment. */
export function coreWorkday(rows: readonly CoachOverviewRow[], today: string) {
  const unique = [
    ...new Map(
      rows.map((row) => [
        row.id,
        {
          ...row,
          assignments: row.assignments.filter(
            (assignment) => assignment.is_active
          ),
        },
      ])
    ).values(),
  ];
  const students = unique
    .map((row) => {
      const state = trainingFollowUp([row.id], row.assignments, today);
      const prescription: PrescriptionState = state.current
        ? "current"
        : state.withoutEndDate
        ? "undated"
        : state.expired
        ? "expired"
        : "missing";
      return {
        ...row,
        prescription,
        needsPlanning:
          row.active &&
          (prescription === "expired" || prescription === "missing"),
      };
    })
    .sort(
      (a, b) =>
        Number(b.needsPlanning) - Number(a.needsPlanning) ||
        Number(b.active) - Number(a.active) ||
        a.name.localeCompare(b.name, "pt-BR")
    );
  return { students, summary: summarizeOverview(unique, today) };
}

export function filterWorkday(
  students: ReturnType<typeof coreWorkday>["students"],
  search: string,
  filter: WorkdayFilter
) {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .trim();
  const term = normalize(search);
  return students.filter(
    (row) =>
      normalize(row.name).includes(term) &&
      (filter !== "planning" || row.needsPlanning) &&
      (filter !== "no-records" || (row.active && row.completed_workouts === 0))
  );
}
