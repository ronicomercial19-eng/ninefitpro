import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles, CheckCircle2, CircleDashed, Info } from "lucide-react";
import type { HubScoreStatus } from "@/hooks/useAthleteScores";
import type { DailyContext } from '@/services/dailyContext';

interface SyncScoreDiagnosisProps {
  context?: DailyContext;
  open: boolean;
  onClose: () => void;
  score: number | null;
  routine?: { base: number | null; recordPoints: number };
  status: HubScoreStatus;
  breakdown: { treino: number | null; nutri: number | null; sono: number | null; mob: number | null; hidr: number | null };
}

const fmt = (v: number | null | undefined, suffix = "/100") =>
  v == null || Number.isNaN(v) ? "—" : `${Math.round(v)}${suffix}`;

function Eyebrow({ children }: { children: string }) {
  return <p className="text-[9px] font-data tracking-[0.3em] text-primary/80 mb-2">{children}</p>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <p className="text-[9px] font-data tracking-[0.2em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 font-display text-lg text-foreground tabular-nums">{value}</p>
    </div>
  );
}

export function SyncScoreDiagnosisModal({ open, onClose, score, status, breakdown, context, routine }: SyncScoreDiagnosisProps) {
  const labels = { treino: "Treino ou descanso", nutri: "Nutrição", sono: "Sono", mob: "Mobilidade", hidr: "Hidratação" };
  const statusLabel: Record<HubScoreStatus, string> = {
    available: "Leitura disponível", stale: "Leitura anterior", loading: "Atualizando dados",
    offline: "Sem conexão", error: "Falha ao atualizar", calibrating: "Em calibração",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="fitpro-orange sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl border border-primary/25 bg-[#0B0B0C] p-0 [&>button]:right-4 [&>button]:top-4 [&>button]:rounded-full [&>button]:border [&>button]:border-white/10 [&>button]:p-1.5 [&>button]:opacity-100 [&>button]:focus:ring-0 [&>button]:focus-visible:ring-1 [&>button]:focus-visible:ring-primary">
        <DialogHeader className="p-5 pb-4 border-b border-white/[0.06] text-left">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="w-4 h-4" />
            <p className="text-[9px] font-data tracking-[0.3em]">DIAGNÓSTICO DE SINCRONIA</p>
          </div>
          <DialogTitle className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-5xl font-black tabular-nums text-foreground">
              {score == null ? "—" : Math.round(score)}
            </span>
            <span className="font-mono text-sm text-muted-foreground">/ 100</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {statusLabel[status]}. Percepção do dia e cobertura dos registros, separadas de XP.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 p-5">
          {context && (
            <>
              <section>
                <Eyebrow>PERCEPÇÃO DO DIA</Eyebrow>
                <div className="grid grid-cols-3 gap-2">
                  <Stat label="Humor" value={fmt(context.calibration.mood, "/5")} />
                  <Stat label="Energia" value={fmt(context.calibration.energy, "/5")} />
                  <Stat label="Motivação" value={fmt(context.calibration.motivation, "/5")} />
                </div>
              </section>

              <section>
                <Eyebrow>COMO O SCORE FOI CALCULADO</Eyebrow>
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="Percepção diária" value={context.sync.readiness == null ? "Não coletada" : fmt(context.sync.readiness)} />
                  <Stat label="Cobertura de registros" value={fmt(context.sync.record_coverage)} />
                  {routine && <Stat label="Base da calibração" value={routine.base == null ? "Pendente" : String(routine.base)} />}
                  {routine && <Stat label="Registros do dia" value={`+${routine.recordPoints}`} />}
                  <Stat label="Calibração na semana" value={fmt(context.sync.coverage_dimensions?.calibracao)} />
                  <Stat label="Balanços" value={fmt(context.sync.coverage_dimensions?.balanco)} />
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  {routine
                    ? "Até 80 pontos pelos cinco emojis e até 20 pelos registros confirmados do dia (5 por categoria)."
                    : context.sync.formula}{" "}
                  Ausência de registro não comprova ausência de atividade. A cobertura não mede adequação nutricional nem cumprimento da prescrição.
                </p>
              </section>
            </>
          )}

          <section>
            <Eyebrow>PILARES · ÚLTIMOS 7 DIAS</Eyebrow>
            <ul className="space-y-3">
              {Object.entries(labels).map(([key, label]) => {
                const value = breakdown[key as keyof typeof breakdown];
                const has = value != null;
                return (
                  <li key={key}>
                    <div className="flex items-center gap-2 text-sm">
                      {has ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> : <CircleDashed className="w-4 h-4 text-white/35 shrink-0" />}
                      <span className={has ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                      <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">{has ? fmt(value) : "Sem dados"}</span>
                    </div>
                    <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${has ? Math.max(0, Math.min(100, value!)) : 0}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="flex gap-3 rounded-2xl border border-primary/20 bg-primary/[0.06] p-4">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              O SYNC descreve seus sinais e registros. Não autoriza aumento de carga, não é diagnóstico e não substitui a avaliação de dor ou restrições. Os pilares mostram cobertura de dias com registros nos últimos 7 dias.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
