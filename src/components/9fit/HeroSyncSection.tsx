import { SyncScoreRing } from "./SyncScoreRing";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
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
  breakdown,
  routinePillars,
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
    <section aria-label="Resumo SYNC" className="min-w-0 space-y-3">
      <SyncScoreRing
        score={value}
        status={scoreStatus}
        breakdown={breakdown}
        hidePillars={routinePillars}
      />
      <p
        className="px-1 text-xs leading-relaxed text-muted-foreground"
        role="status"
      >
        {message}
      </p>
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
