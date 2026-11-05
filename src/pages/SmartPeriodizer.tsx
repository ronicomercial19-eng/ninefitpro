import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfessorWorkspace } from "@/contexts/ProfessorWorkspace";
import { ProfessorCycleBuilder } from "@/components/students/ProfessorCycleBuilder";
import { ProfessorPrescription } from "@/components/students/ProfessorPrescription";
import RonProfessorPage from "./admin/RonProfessorPage";
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
  const [tab, setTab] = useState("track");
  if (!selected) return <p className="rounded-xl border p-4">Selecione um aluno no topo para planejar.</p>;

  return <div className="min-w-0 space-y-4">
    <header>
      <p className="nine-core-kicker">Treinamento</p><h1 className="nine-core-title">Periodização</h1>
      <p className="text-sm text-muted-foreground">Planejamento de {selected.name}</p>
    </header>
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="nine-core-section-tabs grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
        <TabsTrigger className="min-h-11" value="track">Ciclo atual</TabsTrigger>
        <TabsTrigger className="min-h-11" value="week">Editar semana</TabsTrigger>
        <TabsTrigger className="min-h-11" value="assign">Atribuir ciclo</TabsTrigger>
        <TabsTrigger className="min-h-11" value="adjust">Ajustes</TabsTrigger>
      </TabsList>
      <TabsContent value="assign">
        <PeriodizationAssignDialog inline open={tab === "assign"} onOpenChange={() => {}} studentId={selected.id} studentName={selected.name} onSuccess={() => { void queryClient.invalidateQueries({ queryKey: ["periodizer-assignments"] }); setTab("track"); }} />
      </TabsContent>
      <TabsContent value="week">
        <ProfessorCycleBuilder onEditDay={date => setPanel({ title: "Editar treino", date })} />
      </TabsContent>
      <TabsContent value="track" className="space-y-3"><ConnectedPlan key={selected.id} athleteId={selected.id} /><AnnualPlan athleteId={selected.id} /><AssignedPlans athleteId={selected.id} /><StudentTrainingCycles athleteId={selected.id} professional /></TabsContent>
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
        {panel?.title === "RON" ? <RonProfessorPage />
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

function ConnectedPlan({ athleteId }: { athleteId: string }) {
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null);
  const plan = useQuery({
    queryKey: ["periodizer-connected-plan", user?.id, athleteId],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from("vw_athlete_periodizacao_ativa")
        .select("plan_id,plan_name,current_phase,current_week_index,source")
        .eq("athlete_id", athleteId).abortSignal(signal).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  async function syncPlan() {
    setSyncing(true);
    setFeedback(null);
    try {
      const { data, error } = await supabase.functions.invoke("smartperiodizer-sync", {
        body: { athlete_id: athleteId },
      });
      if (error || data?.ok !== true || data?.verified !== true || !data?.plan_id) {
        const response = error?.context;
        const details = response instanceof Response ? await response.clone().json().catch(() => null) : null;
        throw new Error(details?.error || data?.error || "A integração não confirmou o plano.");
      }
      const refreshed = await plan.refetch();
      if (refreshed.isError || refreshed.data?.plan_id !== data.plan_id) {
        throw new Error("O plano confirmado ainda não aparece na leitura do aluno.");
      }
      setFeedback({ message: "Planejamento conferido para este aluno.", error: false });
    } catch (error) {
      setFeedback({ message: error instanceof Error ? error.message : "Falha ao sincronizar o planejamento.", error: true });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <section className="nine-core-overview rounded-md border bg-card">
      <div className="space-y-2 md:col-span-2">
        <p className="nine-core-kicker">SmartPeriodizer · Plano em uso</p>
        {plan.isPending ? <p role="status">Carregando planejamento…</p>
          : plan.isError ? <p role="alert">Não foi possível carregar o planejamento deste aluno.</p>
          : !plan.data?.plan_id ? <p className="text-muted-foreground">Nenhum planejamento ativo para este aluno.</p>
          : <>
            <h2 className="text-xl font-semibold">{plan.data.plan_name || "Plano ativo"}</h2>
            <p className="text-sm text-muted-foreground">
              {plan.data.current_phase || "Fase não informada"}
              {plan.data.current_week_index != null && <> · Semana {plan.data.current_week_index}</>}
              {" · "}{plan.data.source === "periodization_plans_remote" ? "SmartPeriodizer" : "Planejamento FitPro"}
            </p>
          </>}
        {feedback && <p role={feedback.error ? "alert" : "status"} className="text-sm">{feedback.message}</p>}
      </div>
      <div className="flex items-center">
        <Button variant="outline" disabled={syncing || plan.isPending} onClick={() => void syncPlan()}>
          {syncing ? "Sincronizando…" : "Sincronizar planejamento"}
        </Button>
      </div>
    </section>
  );
}
