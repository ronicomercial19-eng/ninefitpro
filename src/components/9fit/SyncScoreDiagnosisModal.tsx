import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles, AlertCircle } from "lucide-react";
import type { HubScoreStatus } from "@/hooks/useAthleteScores";

interface SyncScoreDiagnosisProps {
  open: boolean;
  onClose: () => void;
  score: number | null;
  status: HubScoreStatus;
  breakdown: { treino: number | null; nutri: number | null; sono: number | null; mob: number | null; hidr: number | null };
}

export function SyncScoreDiagnosisModal({ open, onClose, score, status, breakdown }: SyncScoreDiagnosisProps) {
  const labels = { treino: "Treino", nutri: "Nutrição", sono: "Sono e recuperação", mob: "Mobilidade", hidr: "Hidratação" };
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
          <DialogDescription>{statusLabel[status]}. Pontuações dos registros disponíveis.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <ul className="space-y-2">
            {Object.entries(labels).map(([key, label]) => (
              <li key={key} className="flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-amber-500" /> {label}: {breakdown[key as keyof typeof breakdown] == null ? "Sem dados" : `${Math.round(breakdown[key as keyof typeof breakdown]!)}/100`}
              </li>
            ))}
          </ul>
          <div className="bg-primary/10 p-3 rounded-lg text-sm text-primary">
            Registre suas atividades para atualizar os pilares. O score sozinho não informa horas de sono, refeições ou exercícios realizados.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
