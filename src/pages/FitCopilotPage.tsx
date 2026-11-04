import { useState } from "react";
import { ProfessorConversation } from "@/components/students/ProfessorConversation";
import { ProfessorPrescription } from "@/components/students/ProfessorPrescription";
import { useProfessorWorkspace } from "@/contexts/ProfessorWorkspace";
import { useCoachStudentContext } from "@/hooks/useCoachStudentContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import RonProfessorPage from "./admin/RonProfessorPage";
import TrainingAdjustmentsPage from "./TrainingAdjustmentsPage";

export default function FitCopilotPage() {
  const { selected } = useProfessorWorkspace();
  const context = useCoachStudentContext(selected?.id ?? null);
  const [panel, setPanel] = useState<"ron" | "adjust" | null>(null);
  const [review, setReview] = useState<{ date: string; recommendation: string } | null>(null);
  const today = context.data?.daily_context;
  return <section className="min-w-0 space-y-4">
    <header><h1 className="text-2xl font-bold">FitCopilot</h1><p className="text-sm text-muted-foreground">Analise o histórico e os sinais de {selected?.name ?? "um aluno"}.</p></header>
    {context.isError && <Button variant="outline" onClick={() => void context.refetch()}>Tentar carregar sinais novamente</Button>}
    {today && <dl className="grid grid-cols-2 gap-3 rounded-xl border bg-card p-4">
      <div><dt>SYNC de hoje</dt><dd className="font-semibold">{today.sync.value ?? "Não coletado"}</dd></div>
      <div><dt>Calibração</dt><dd className="font-semibold">{today.calibration.complete ? "Completa" : "Sem calibração completa"}</dd></div>
    </dl>}
    <ProfessorConversation analysisOnly />
    {selected && <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => setPanel("adjust")}>Revisar ajustes</Button>
      <Button variant="outline" onClick={() => setPanel("ron")}>Abrir RON</Button>
    </div>}
    <Dialog open={!!panel} onOpenChange={open => { if (!open) { setPanel(null); setReview(null); } }}>
      <DialogContent className="max-h-[85dvh] max-w-4xl overflow-y-auto">
        <DialogTitle>{panel === "ron" ? "RON" : "Ajustes de treino"}</DialogTitle>
        {panel === "ron" ? <RonProfessorPage /> : review
          ? <><Button variant="ghost" onClick={() => setReview(null)}>Voltar aos ajustes</Button><ProfessorPrescription embedded initialDate={review.date} initialRecommendation={review.recommendation} /></>
          : <TrainingAdjustmentsPage embedded onReview={(date, recommendation) => setReview({ date, recommendation })} />}
      </DialogContent>
    </Dialog>
  </section>;
}
