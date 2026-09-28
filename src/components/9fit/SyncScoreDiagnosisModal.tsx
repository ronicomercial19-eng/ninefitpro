import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles, CheckCircle2, AlertCircle } from "lucide-react";

interface SyncScoreDiagnosisProps {
  open: boolean;
  onClose: () => void;
  score: number;
}

export function SyncScoreDiagnosisModal({ open, onClose, score }: SyncScoreDiagnosisProps) {
  const diagnosis = score < 70 
    ? { title: "Baixa Sincronia", status: "Requer Atenção", factors: ["Sono abaixo de 6h", "Faltou registro de almoço"], tip: "Priorize o sono hoje e complete seu diário." }
    : { title: "Sincronia Elevada", status: "Excelente", factors: ["Treino concluído", "Dieta consistente"], tip: "Continue com esse nível de consistência!" };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Diagnóstico de Sincronia: {score}%
          </DialogTitle>
          <DialogDescription>{diagnosis.title} - {diagnosis.status}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <ul className="space-y-2">
            {diagnosis.factors.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-amber-500" /> {f}
              </li>
            ))}
          </ul>
          <div className="bg-primary/10 p-3 rounded-lg text-sm text-primary">
            💡 {diagnosis.tip}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
