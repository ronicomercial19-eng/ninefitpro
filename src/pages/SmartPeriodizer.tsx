import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfessorWorkspace } from "@/contexts/ProfessorWorkspace";
import { ProfessorCycleBuilder } from "@/components/students/ProfessorCycleBuilder";
import { ProfessorPrescription } from "@/components/students/ProfessorPrescription";
import { ProfessorConversation } from "@/components/students/ProfessorConversation";
import { StudentTrainingCycles } from "@/components/students/StudentTrainingCycles";
import { SelectedStudentFile } from "@/components/students/SelectedStudentFile";
import { PeriodizationAssignDialog } from "@/components/students/PeriodizationAssignDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import AgendaPage from "./AgendaPage";
import ProfessorMessagesPage from "./ProfessorMessagesPage";
import TrainingAdjustmentsPage from "./TrainingAdjustmentsPage";

export default function SmartPeriodizer() {
  const queryClient = useQueryClient();
  const { selected } = useProfessorWorkspace();
  const [panel, setPanel] = useState<{ title: string; date?: string; recommendation?: string } | null>(null);
  const [tab, setTab] = useState("assign");
  if (!selected) return <p className="rounded-xl border p-4">Selecione um aluno no topo para planejar.</p>;

  return <div className="min-w-0 space-y-4">
    <header>
      <h1 className="text-2xl font-bold">SmartPeriodizer</h1>
      <p className="text-sm text-muted-foreground">Planejamento de {selected.name}</p>
    </header>
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
        <TabsTrigger className="min-h-11" value="assign">Atribuir</TabsTrigger>
        <TabsTrigger className="min-h-11" value="week">Editar semana</TabsTrigger>
        <TabsTrigger className="min-h-11" value="track">Acompanhar</TabsTrigger>
        <TabsTrigger className="min-h-11" value="adjust">Ajustes</TabsTrigger>
      </TabsList>
      <TabsContent value="assign">
        <PeriodizationAssignDialog inline open={tab === "assign"} onOpenChange={() => {}} studentId={selected.id} studentName={selected.name} onSuccess={() => { void queryClient.invalidateQueries({ queryKey: ["periodizer-assignments"] }); setTab("track"); }} />
      </TabsContent>
      <TabsContent value="week">
        <ProfessorCycleBuilder onEditDay={date => setPanel({ title: "Editar treino", date })} />
      </TabsContent>
      <TabsContent value="track" className="space-y-3"><AnnualPlan athleteId={selected.id} /><AssignedPlans athleteId={selected.id} /><StudentTrainingCycles athleteId={selected.id} professional /></TabsContent>
      <TabsContent value="adjust">
        <TrainingAdjustmentsPage embedded onReview={(date, recommendation) => setPanel({ title: "Revisar ajuste", date, recommendation })} />
      </TabsContent>
    </Tabs>
    <div className="flex flex-wrap gap-2" aria-label="Ferramentas do aluno">
      {["Treino hoje", "RON", "Agenda", "Conversa", "Ficha"].map(title => <Button key={title} variant="outline" className="min-h-11" onClick={() => setPanel({ title })}>{title}</Button>)}
    </div>
    <Dialog open={!!panel} onOpenChange={open => { if (!open) setPanel(null); }}>
      <DialogContent className="max-h-[85dvh] max-w-4xl overflow-y-auto">
        <DialogTitle>{panel?.title} · {selected.name}</DialogTitle>
        {panel?.title === "RON" ? <ProfessorConversation />
          : panel?.title === "Agenda" ? <AgendaPage />
          : panel?.title === "Conversa" ? <ProfessorMessagesPage />
          : panel?.title === "Ficha" ? <SelectedStudentFile athleteId={selected.id} />
          : panel && <ProfessorPrescription initialDate={panel.date} initialRecommendation={panel.recommendation} embedded />}
      </DialogContent>
    </Dialog>
  </div>;
}

function AssignedPlans({ athleteId }: { athleteId: string }) {
  const { user } = useAuth();
  const plans = useQuery({
    queryKey: ["periodizer-assignments", user?.id, athleteId],
    queryFn: async () => {
      const { data, error } = await supabase.from("student_training_assignments")
        .select("id,training_name,start_date,is_active")
        .eq("student_id", athleteId).eq("training_type", "periodization")
        .order("created_at", { ascending: false }).limit(12);
      if (error) throw error;
      return data;
    },
  });

  return <section className="space-y-2 rounded-xl border bg-card p-4">
    <h2 className="font-semibold">Periodizações atribuídas</h2>
    {plans.isPending ? <p>Carregando periodizações…</p>
      : plans.isError ? <Button variant="outline" onClick={() => void plans.refetch()}>Tentar carregar novamente</Button>
      : plans.data.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma periodização atribuída.</p>
      : <ul className="space-y-2">{plans.data.map(plan => <li key={plan.id} className="flex flex-wrap justify-between gap-2 text-sm"><span>{plan.training_name}</span><span className="text-muted-foreground">{plan.start_date} · {plan.is_active ? "Ativa" : "Inativa"}</span></li>)}</ul>}
  </section>;
}

function AnnualPlan({ athleteId }: { athleteId: string }) {
  const { user } = useAuth();
  const plan = useQuery({
    queryKey: ["periodizer-annual-plan", user?.id, athleteId],
    queryFn: async () => {
      const { data, error } = await supabase.from("periodization_annual_plans")
        .select("annual_goal,macrocycles,mesocycles,updated_at")
        .eq("athlete_id", athleteId).eq("status", "active")
        .order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return <section className="space-y-2 rounded-xl border bg-card p-4">
    <h2 className="font-semibold">Plano anual ativo</h2>
    {plan.isPending ? <p>Carregando plano anual…</p>
      : plan.isError ? <Button variant="outline" onClick={() => void plan.refetch()}>Tentar carregar novamente</Button>
      : !plan.data ? <p className="text-sm text-muted-foreground">Nenhum plano anual ativo para este aluno.</p>
      : <dl className="grid gap-2 text-sm sm:grid-cols-3">
          <div><dt>Objetivo</dt><dd>{plan.data.annual_goal || "Não informado"}</dd></div>
          <div><dt>Fases</dt><dd>{Array.isArray(plan.data.macrocycles) ? plan.data.macrocycles.length : "Não informado"}</dd></div>
          <div><dt>Mesociclos</dt><dd>{Array.isArray(plan.data.mesocycles) ? plan.data.mesocycles.length : "Não informado"}</dd></div>
        </dl>}
  </section>;
}
