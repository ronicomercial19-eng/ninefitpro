import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles, AlertCircle } from "lucide-react";
import type { HubScoreStatus } from "@/hooks/useAthleteScores";
import type { DailyContext } from '@/services/dailyContext';

interface SyncScoreDiagnosisProps {
  context?: DailyContext;
  open: boolean;
  onClose: () => void;
  score: number | null;
  status: HubScoreStatus;
  breakdown: { treino: number | null; nutri: number | null; sono: number | null; mob: number | null; hidr: number | null };
}

export function SyncScoreDiagnosisModal({ open, onClose, score, status, breakdown, context }: SyncScoreDiagnosisProps) {
  const labels = { treino: "Treino ou descanso registrado", nutri: "Nutrição", sono: "Sono registrado ou declarado", mob: "Mobilidade", hidr: "Hidratação" };
  const statusLabel: Record<HubScoreStatus, string> = {
    available: "Leitura disponível", stale: "Leitura anterior", loading: "Atualizando dados",
    offline: "Sem conexão", error: "Falha ao atualizar", calibrating: "Em calibração",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Diagnóstico de Sincronia: {score == null ? "Sem dados" : `${Math.round(score)}/100`}
          </DialogTitle>
          <DialogDescription>{statusLabel[status]}. Percepção do dia e cobertura dos registros, separadas de XP.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {context && <div className="space-y-2 text-sm"><p>Percepção diária: {context.sync.readiness ?? 'Não coletada'}/100</p><p>Cobertura de registros: {context.sync.record_coverage}/100</p><p className="text-xs text-muted-foreground">{context.sync.formula}. Ausência de registro não comprova ausência de atividade. A cobertura não mede adequação nutricional nem cumprimento da prescrição.</p><p>Calibração na semana: {context.sync.coverage_dimensions.calibracao}/100 · Balanços: {context.sync.coverage_dimensions.balanco}/100</p><p>Humor: {context.calibration.mood ?? '—'}/5 · Energia: {context.calibration.energy ?? '—'}/5 · Motivação: {context.calibration.motivation ?? '—'}/5</p></div>}
          <ul className="space-y-2">
            {Object.entries(labels).map(([key, label]) => (
              <li key={key} className="flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-amber-500" /> {label}: {breakdown[key as keyof typeof breakdown] == null ? "Sem dados" : `${Math.round(breakdown[key as keyof typeof breakdown]!)}/100`}
              </li>
            ))}
          </ul>
          <div className="bg-primary/10 p-3 rounded-lg text-sm text-primary">
            O SYNC descreve seus sinais e registros. Não autoriza aumento de carga, não é diagnóstico e não substitui a avaliação de dor ou restrições. Os pilares mostram cobertura de dias com registros nos últimos 7 dias.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
