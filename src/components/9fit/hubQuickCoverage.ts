export type CoverageRead = "loading" | "unavailable" | "ready";

/** Contagem de 7 dias do registro rápido. Zero só depois da leitura. */
export function coverageLabel(read: CoverageRead, days: number): string {
  if (read === "loading") return "Lendo os últimos 7 dias";
  if (read === "unavailable") return "Últimos 7 dias não confirmados";
  return `${days} de 7 dias com registro`;
}

export function coverageFill(read: CoverageRead, days: number): number | undefined {
  return read === "ready" ? days : undefined;
}

/** Uma semana já confirmada não volta a "não confirmada" se o refresh falhar. */
export function coverageReadState(confirmed: boolean, loadError: boolean): CoverageRead {
  if (confirmed) return "ready";
  return loadError ? "unavailable" : "loading";
}
