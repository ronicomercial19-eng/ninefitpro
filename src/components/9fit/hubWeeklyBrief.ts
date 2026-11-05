import type { HubScoreStatus } from "@/hooks/useAthleteScores";

export interface WeeklyCounts {
  treinos: number;
  nutri: number;
  minutos: number;
}

export type WeekRead = "loading" | "ready" | "unavailable";

export function weekRead(hasSnapshot: boolean, scoreStatus: HubScoreStatus): WeekRead {
  if (hasSnapshot) return "ready";
  return scoreStatus === "loading" ? "loading" : "unavailable";
}

export function hubFactLabel(
  hasSnapshot: boolean,
  scoreStatus: HubScoreStatus,
  value: string | null,
  empty: string,
): string {
  if (!hasSnapshot) return scoreStatus === "loading" ? "Lendo" : "Não confirmado";
  return value == null || value === "" ? empty : value;
}

export interface HubWeekCopy {
  trainStatus: string;
  dietStatus: string;
  guidance: string | null;
  sessionsLabel: string;
  barPercent: number | null;
  nutriSubtitle: string;
  nutriBadge: string;
  trainBadge: string;
}

/** Copy do brief semanal. `weekly` nulo significa que o snapshot ainda não chegou. */
export function describeHubWeek(weekly: WeeklyCounts | null, read: WeekRead): HubWeekCopy {
  if (weekly == null || read !== "ready") {
    const reading = read === "loading";
    return {
      trainStatus: reading ? "Lendo treinos da semana" : "Treinos da semana não confirmados",
      dietStatus: reading ? "Lendo registros de alimentação" : "Alimentação da semana não confirmada",
      guidance: null,
      sessionsLabel: reading ? "lendo" : "—",
      barPercent: null,
      nutriSubtitle: reading
        ? "Leitura das refeições ainda em andamento"
        : "Não foi possível confirmar as refeições da semana",
      nutriBadge: reading ? "Lendo" : "Não confirmado",
      trainBadge: reading ? "Lendo semana" : "Semana não confirmada",
    };
  }

  const trainStatus =
    weekly.treinos === 0 ? "Sem treino registrado esta semana"
    : weekly.treinos >= 5 ? "Meta semanal atingida"
    : weekly.treinos >= 3 ? "Bom ritmo"
    : "Ritmo inicial";
  const dietStatus =
    weekly.nutri === 0
      ? "Sem refeições registradas esta semana"
      : `${weekly.nutri} refeiç${weekly.nutri === 1 ? "ão registrada" : "ões registradas"} na semana`;

  return {
    trainStatus,
    dietStatus,
    guidance:
      weekly.treinos === 0
        ? "Comece com uma sessão curta hoje e registre. Consistência vem antes de intensidade."
        : weekly.nutri === 0
          ? "Seus treinos estão andando, mas a alimentação está sem registro. Registre a próxima refeição para fechar o quadro."
          : weekly.treinos < 3
            ? `Faltam ${5 - weekly.treinos} sessões para a meta da semana. Agende a próxima agora.`
            : null,
    sessionsLabel: `${weekly.treinos}/5`,
    barPercent: Math.min(100, Math.max(0, (weekly.treinos / 5) * 100)),
    nutriSubtitle:
      weekly.nutri > 0
        ? `${weekly.nutri} refeições registradas na semana`
        : "Nenhuma refeição registrada nesta semana",
    nutriBadge: weekly.nutri > 0 ? `${weekly.nutri} refeições` : "Sem registro",
    trainBadge: weekly.treinos > 0 ? `${weekly.treinos} na semana` : "Semana lida",
  };
}
