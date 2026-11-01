import { Link, useLocation } from "react-router-dom";
import { Zap } from "lucide-react";
import { ProfessorPrescription } from "@/components/students/ProfessorPrescription";
import { useProfessorWorkspace } from "@/contexts/ProfessorWorkspace";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ApiConnectorCard } from "@/components/admin/ApiConnectorCard";
import TrainingAdjustmentsPage from "./TrainingAdjustmentsPage";

export default function SmartTreinoPage() {
  const workspace = useProfessorWorkspace();
  const location = useLocation();
  return <div className="space-y-5">
    <header><h1 className="text-2xl font-semibold">SmartTreino</h1><p className="text-sm text-muted-foreground">Escolha a função, revise e entregue para o aluno selecionado.</p></header>
    <Tabs defaultValue={location.hash === "#ajustes" ? "adjust" : "prescribe"}>
      <TabsList><TabsTrigger value="prescribe">Prescrever treino</TabsTrigger><TabsTrigger value="adjust">Ajustar treino</TabsTrigger><TabsTrigger value="plan">Planejar ciclo</TabsTrigger></TabsList>
      <TabsContent value="prescribe"><ProfessorPrescription /></TabsContent>
      <TabsContent value="adjust"><TrainingAdjustmentsPage embedded /></TabsContent>
      <TabsContent value="plan"><section className="rounded-xl border bg-card p-5 space-y-3"><h2 className="font-semibold">Periodização</h2><p>Monte os rascunhos da semana e publique o ciclo revisado.</p><Button asChild><Link to={workspace.link("/app/smart-periodizer")}>Abrir planejamento</Link></Button></section></TabsContent>
    </Tabs>
    <ApiConnectorCard moduleKey="smart_treino" title="SmartTreino API" description="Configuração do motor externo de treino." icon={Zap} />
  </div>;
}
