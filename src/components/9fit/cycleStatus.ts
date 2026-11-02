export type CycleStatus = "loading" | "active" | "none" | "unavailable";

export function cycleBadge(status: CycleStatus): { label: string; active: boolean } {
  switch (status) {
    case "active":
      return { label: "CICLO EM ANDAMENTO", active: true };
    case "none":
      return { label: "SEM CICLO ATIVO", active: false };
    case "loading":
      return { label: "LENDO CICLO", active: false };
    case "unavailable":
      return { label: "CICLO NÃO CONFIRMADO", active: false };
  }
}
