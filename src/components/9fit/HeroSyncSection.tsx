import { useState } from "react";
import { RefreshCw, Activity } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { EmojiCalibrationQuiz } from "./EmojiCalibrationQuiz";
import type { HubScoreStatus } from "@/hooks/useAthleteScores";
interface Props {
  name: string;
  syncScore: number | null;
  scoreStatus?: HubScoreStatus;
  breakdown: {
    treino: number | null;
    nutri: number | null;
    sono: number | null;
    mob: number | null;
    hidr: number | null;
  };
  lastUpdate?: string;
  onRefresh?: () => void;
  onDiagnosis?: () => void;
  routinePillars?: boolean;
}
export function HeroSyncSection({
  syncScore,
  scoreStatus = "calibrating",
  lastUpdate,
  onRefresh,
  onDiagnosis,
}: Props) {
  const [checkin, setCheckin] = useState(false);
  const measured =
    typeof syncScore === "number" &&
    Number.isFinite(syncScore) &&
    ["available", "stale", "offline"].includes(scoreStatus);
  const value = measured
    ? Math.round(Math.max(0, Math.min(100, syncScore!)))
    : null;
  const updated =
    lastUpdate && Number.isFinite(new Date(lastUpdate).getTime())
      ? new Date(lastUpdate).toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;
  const message =
    scoreStatus === "offline"
      ? "Sem conexão. Reconecte para recalcular."
      : scoreStatus === "error"
      ? "Não conseguimos confirmar a leitura. Tente atualizar."
      : scoreStatus === "stale"
      ? "Última leitura disponível. Atualize para confirmar o dia."
      : scoreStatus === "loading"
      ? "Lendo seus registros…"
      : value === null
      ? "Responda como você está para começar a leitura do dia."
      : "Check-in e registros confirmados compõem este resumo. Confira no Treino se houve um ajuste na sessão.";
  return (
    <section
      aria-label="Resumo SYNC"
      className="rounded-3xl border border-primary/20 bg-[radial-gradient(ellipse_at_top_right,rgba(239,122,69,0.10),#111416_70%)] p-5 sm:p-6"
    >
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
          <Activity size={21} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            SYNC / Leitura do dia
          </p>
          <h2 className="mt-2 text-lg font-semibold tracking-tight">
            Um resumo para conferir seu contexto.
          </h2>
          <p
            className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground"
            role="status"
          >
            {message}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-3xl font-semibold tabular-nums text-foreground sm:text-4xl">
            {value ?? "—"}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {scoreStatus === "stale" || scoreStatus === "offline"
              ? "última leitura"
              : "de 100"}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-3">
        {value === null &&
          scoreStatus !== "loading" &&
          scoreStatus !== "offline" &&
          scoreStatus !== "error" && (
            <button
              type="button"
              onClick={() => setCheckin(true)}
              className="min-h-11 text-sm font-semibold text-primary"
            >
              Responder check-in
            </button>
          )}
        {onDiagnosis && (
          <button
            type="button"
            onClick={onDiagnosis}
            className="min-h-11 text-sm text-primary"
          >
            Como esse número é formado
          </button>
        )}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={scoreStatus === "loading" || scoreStatus === "offline"}
            className="inline-flex min-h-11 items-center gap-2 text-xs text-muted-foreground disabled:opacity-50"
          >
            <RefreshCw size={14} aria-hidden="true" />
            Atualizar leitura
          </button>
        )}
        <span className="text-[11px] text-muted-foreground">
          {updated ? `Leitura de ${updated}` : "Aguardando leitura confirmada"}
        </span>
      </div>
      <Dialog open={checkin} onOpenChange={setCheckin}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Como você está hoje?</DialogTitle>
            <DialogDescription>
              Seu relato ajuda a revisar o dia. SYNC não é uma nota de saúde nem
              liberação para treinar.
            </DialogDescription>
          </DialogHeader>
          <EmojiCalibrationQuiz
            onComplete={() => {
              setCheckin(false);
              onRefresh?.();
            }}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
