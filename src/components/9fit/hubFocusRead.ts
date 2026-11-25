import type { CycleStatus } from "./cycleStatus";

export type LibraryRead = "loading" | "ready" | "unavailable";

export interface ConfirmedPlan {
  athleteId: string;
  title: string | null;
  cycle: "active" | "none";
}

export interface ConfirmedLibrary {
  athleteId: string;
  count: number;
}

export interface PlanRead {
  status: CycleStatus;
  title: string | null;
  confirmed: ConfirmedPlan | null;
  stale: boolean;
}

export interface LibraryReadResult {
  status: LibraryRead;
  count: number;
  confirmed: ConfirmedLibrary | null;
  stale: boolean;
}

/** Plano já confirmado não vira "sem ciclo" nem "não confirmado" se o refresh falhar. */
export function planAfterRead(
  previous: ConfirmedPlan | null,
  athleteId: string,
  failed: boolean,
  title: string | null,
): PlanRead {
  if (!failed) {
    const cycle = title ? "active" : "none";
    return {
      status: cycle,
      title,
      confirmed: { athleteId, title, cycle },
      stale: false,
    };
  }
  if (previous?.athleteId === athleteId) {
    return {
      status: previous.cycle,
      title: previous.title,
      confirmed: previous,
      stale: true,
    };
  }
  return { status: "unavailable", title: null, confirmed: null, stale: false };
}

/** Contagem da biblioteca já lida não volta a zero se a nova consulta falhar. */
export function libraryAfterRead(
  previous: ConfirmedLibrary | null,
  athleteId: string,
  failed: boolean,
  count: number,
): LibraryReadResult {
  if (!failed) {
    return {
      status: "ready",
      count,
      confirmed: { athleteId, count },
      stale: false,
    };
  }
  if (previous?.athleteId === athleteId) {
    return {
      status: "ready",
      count: previous.count,
      confirmed: previous,
      stale: true,
    };
  }
  return { status: "unavailable", count: 0, confirmed: null, stale: false };
}

export function hubFocusNotice(input: {
  planFailed: boolean;
  libraryFailed: boolean;
  planStale: boolean;
  libraryStale: boolean;
}): string | null {
  if (!input.planFailed && !input.libraryFailed) return null;
  if (input.planStale || input.libraryStale) {
    return "Não foi possível atualizar. A última leitura confirmada continua na tela.";
  }
  if (input.planFailed && input.libraryFailed) {
    return "Não foi possível carregar seus dados agora.";
  }
  return "Alguns sinais estão sincronizando.";
}
