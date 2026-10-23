import { CoachOverview } from "@/components/students/CoachOverview";
import { Button } from "@/components/ui/button";
export function ReportGenerator({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-4">
      <Button variant="outline" onClick={onClose}>
        Voltar
      </Button>
      <CoachOverview title="Exportar acompanhamento" report />
    </div>
  );
}
