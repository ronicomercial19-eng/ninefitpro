import { useState } from "react";
import { useLocation } from "react-router-dom";
import { ProfessorPrescription } from "@/components/students/ProfessorPrescription";
import { ProfessorCycleBuilder } from "@/components/students/ProfessorCycleBuilder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import TrainingAdjustmentsPage from "./TrainingAdjustmentsPage";

export default function SmartTreinoPage() {
  const location = useLocation();
  const [review, setReview] = useState<{ date: string; recommendation?: string } | null>(null);

  return <div className="min-w-0 space-y-5">
    <header><h1 className="text-2xl font-semibold">SmartTreino</h1><p className="text-sm text-muted-foreground">Revise e publique sessões para o aluno selecionado.</p></header>
    <Tabs defaultValue={location.hash === "#ajustes" ? "adjust" : "prescribe"}>
      <TabsList className="grid h-auto w-full grid-cols-3">
        <TabsTrigger className="min-h-11" value="prescribe">Treino</TabsTrigger>
        <TabsTrigger className="min-h-11" value="adjust">Ajustes</TabsTrigger>
        <TabsTrigger className="min-h-11" value="plan">Ciclo</TabsTrigger>
      </TabsList>
      <TabsContent value="prescribe"><ProfessorPrescription embedded /></TabsContent>
      <TabsContent value="adjust"><TrainingAdjustmentsPage embedded onReview={(date, recommendation) => setReview({ date, recommendation })} /></TabsContent>
      <TabsContent value="plan"><ProfessorCycleBuilder onEditDay={date => setReview({ date })} /></TabsContent>
    </Tabs>
    <Dialog open={!!review} onOpenChange={open => { if (!open) setReview(null); }}>
      <DialogContent className="max-h-[85dvh] max-w-4xl overflow-y-auto">
        <DialogTitle>Revisar sessão</DialogTitle>
        {review && <ProfessorPrescription embedded initialDate={review.date} initialRecommendation={review.recommendation} />}
      </DialogContent>
    </Dialog>
  </div>;
}
