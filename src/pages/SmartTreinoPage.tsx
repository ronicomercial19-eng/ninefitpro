import { TrainingLoadHistory } from "@/components/students/TrainingLoadHistory";
import { ReviewedTrainingWindow } from "@/components/students/ReviewedTrainingWindow";
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
      <TabsList className="grid h-auto w-full grid-cols-3 sm:grid-cols-7">
        <TabsTrigger className="min-h-11" value="prescribe">1 dia</TabsTrigger>
        <TabsTrigger className="min-h-11" value="7">7 dias</TabsTrigger>
        <TabsTrigger className="min-h-11" value="30">30 dias</TabsTrigger>
        <TabsTrigger className="min-h-11" value="365">Ano</TabsTrigger>
        <TabsTrigger className="min-h-11" value="adjust">Ajustes</TabsTrigger>
        <TabsTrigger className="min-h-11" value="plan">Ciclo</TabsTrigger>
        <TabsTrigger className="min-h-11" value="loads">Cargas</TabsTrigger>
      </TabsList>
      <TabsContent value="prescribe"><ProfessorPrescription embedded /></TabsContent>
      {([7, 30, 365] as const).map(days => <TabsContent key={days} value={String(days)}><ReviewedTrainingWindow days={days} onEdit={date => setReview({ date })} /></TabsContent>)}
      <TabsContent value="adjust"><TrainingAdjustmentsPage embedded onReview={(date, recommendation) => setReview({ date, recommendation })} /></TabsContent>
      <TabsContent value="loads"><TrainingLoadHistory /></TabsContent>
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
