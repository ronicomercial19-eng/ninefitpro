export type RonDayStatus =
  | "loading"
  | "available"
  | "calibrating"
  | "stale"
  | "error"
  | "offline";

export interface RonTodayCopy {
  chip: string;
  signal: string;
  title: string;
  description: string;
  action: string;
  /** Só o dia sem leitura confirmada abre a calibração. Carregando ou falha não. */
  openCheckin: boolean;
}

/** O card do RON no Hub não pode tratar leitura pendente como dia vazio. */
export function ronTodayCopy(status: RonDayStatus, syncScore: number | null): RonTodayCopy {
  const reliable = status === "available" && syncScore !== null;
  if (reliable) {
    return {
      chip: "CONTEXTO DISPONÍVEL",
      signal: `SYNC ${Math.round(syncScore)}/100`,
      title: "Seus registros estão disponíveis para uma conversa.",
      description:
        "Leve uma dúvida ao RON e use seu histórico para preparar a revisão com seu professor.",
      action: "Conversar com RON",
      openCheckin: false,
    };
  }
  if (status === "loading") {
    return {
      chip: "LENDO O DIA",
      signal: "Lendo",
      title: "Lendo seus registros de hoje",
      description: "A leitura ainda não voltou. Isso não significa que o dia está vazio.",
      action: "Abrir RON",
      openCheckin: false,
    };
  }
  if (status === "error") {
    return {
      chip: "LEITURA NÃO CONFIRMADA",
      signal: "Não confirmado",
      title: "Leitura de hoje não confirmada",
      description:
        "Não foi possível confirmar o contexto. Isso não significa que não há registros.",
      action: "Abrir RON",
      openCheckin: false,
    };
  }
  if (status === "offline") {
    return {
      chip: "LEITURA DO DIA",
      signal: "Offline",
      title: "Reconecte para atualizar seus registros.",
      description: "A leitura não é recalculada sem conexão.",
      action: "Responder check-in",
      openCheckin: true,
    };
  }
  if (status === "stale") {
    return {
      chip: "LEITURA DO DIA",
      signal: "Atualizar leitura",
      title: "Confira a leitura antes de interpretar o dia.",
      description:
        "O check-in ajuda a compor o contexto; não confirma uma mudança na prescrição.",
      action: "Responder check-in",
      openCheckin: true,
    };
  }
  return {
    chip: "LEITURA DO DIA",
    signal: "Atualizar leitura",
    title: "Comece contando como você está hoje.",
    description:
      "O check-in ajuda a compor o contexto; não confirma uma mudança na prescrição.",
    action: "Responder check-in",
    openCheckin: true,
  };
}

/** Falha ao reler os resultados do RON não apaga os cards já confirmados. */
export function ronResultCardsAfterRead<T>(previous: readonly T[], failed: boolean, next: readonly T[]): T[] {
  return failed ? [...previous] : [...next];
}
