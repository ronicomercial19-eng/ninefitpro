import { loadActivitySummary } from "@/services/activitySummary";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SkeletonCard } from "@/components/9fit/SkeletonCard";
import { useAthleteId } from "@/hooks/useAthleteId";
import { WorkoutHome } from "@/components/9fit/WorkoutHome";
import { WorkoutOverview } from "@/components/9fit/WorkoutOverview";
import { WorkoutExecution } from "@/components/9fit/WorkoutExecution";
import { DailyProtocol } from "@/components/9fit/DailyProtocol";
import { AssignedProtocols } from "@/components/9fit/AssignedProtocols";
import { UpsellBanner } from "@/components/9fit/UpsellBanner";
import { DynamicOffers } from "@/components/9fit/DynamicOffers";
import { QuickTrainModal } from "@/components/9fit/QuickTrainModal";
import { WeeklyTrainingView } from "@/components/9fit/WeeklyTrainingView";
import { useNavigate, useLocation } from "react-router-dom";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { loadResolvedTemplateAssignments } from "@/integrations/templateAssignments";
import { Film, Dumbbell as DumbIcon, Target, Calendar, Dumbbell } from "lucide-react";
import { TrainingAdjustmentBanner } from "@/components/9fit/TrainingAdjustmentBanner";
import { businessDate } from "@/services/dailyContextRules";

interface TrainingAssignment {
  id: string;
  daily_workout_id?: string;
  training_name: string;
  training_description?: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  training_type?: string;
  html_file_url?: string;
  training_data?: any;
}

type WorkoutFlow = "HOME" | "OVERVIEW" | "EXECUTION";

// Estimativa de duração quando a prescrição do dia não traz: ~40 s por série + descanso + 30 s de troca por exercício + 3 min de preparo.
function estimateMinutes(exercises: Array<{ sets?: number | string; rest_seconds?: number | null }>): number | undefined {
  if (!exercises.length) return undefined;
  const seconds = exercises.reduce((sum, e) => {
    const sets = Math.max(1, Number(e.sets) || 3);
    const rest = Number(e.rest_seconds) || 60;
    return sum + sets * 40 + (sets - 1) * rest + 30;
  }, 0);
  return Math.max(5, Math.round(seconds / 60) + 3);
}

export default function NineFitTrain() {
  const { athleteId, athleteName, loading: athleteLoading, error: athleteError } = useAthleteId();
  const navigate = useNavigate();
  const location = useLocation();
  const [trainings, setTrainings] = useState<TrainingAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [prescriptionIssue, setPrescriptionIssue] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [weeklyCompleted, setWeeklyCompleted] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [subTab, setSubTab] = useState<"train" | "semana" | "protocol" | "healthflix">("train");
  const [quickOpen, setQuickOpen] = useState(false);
  const initialCalendarDate = new URLSearchParams(location.search).get("date") || undefined;

  // A aba ativa vive na URL (?tab=semana | protocolo). Sem param = Hoje. Assim o voltar do navegador funciona.
  useEffect(() => {
    const tab = new URLSearchParams(location.search).get("tab");
    if (tab === "semana" || initialCalendarDate) setSubTab("semana");
    else if (tab === "protocolo") setSubTab("protocol");
    else setSubTab("train");
  }, [location.search, initialCalendarDate]);

  // Workout flow state
  const [flow, setFlow] = useState<WorkoutFlow>("HOME");
  const [selectedTraining, setSelectedTraining] = useState<TrainingAssignment | null>(null);

  useEffect(() => {
    if (!athleteLoading && athleteId) {
      fetchTrainings(athleteId);
      fetchCompletedCount(athleteId);
    } else if (!athleteLoading && !athleteId) {
      setLoading(false);
    }
  }, [athleteId, athleteLoading]);

  // FIX (bug real 4 — Treino Rápido / Ajuste não entravam no player guiado):
  // QuickTrainModal e AjusteTreino navegam para /9fit/train passando os
  // exercícios via router state (não sessionStorage — Safari em modo
  // privado pode isolar/bloquear storage entre navegações, quebrando esse
  // handoff silenciosamente). Ao chegar aqui com state.quickTraining, abre
  // direto no WorkoutExecution.
  useEffect(() => {
    const quick = (location.state as any)?.quickTraining;
    if (quick) {
      setSelectedTraining(quick);
      setFlow("EXECUTION");
      // Limpa o state da entrada de histórico para não reabrir em back/forward
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // Realtime: novos treinos/atualizações entram sozinhos
  useRealtimeTable(
    {
      table: "student_training_assignments",
      filter: athleteId ? `student_id=eq.${athleteId}` : undefined,
      enabled: !!athleteId,
    },
    () => { if (athleteId) { fetchTrainings(athleteId); fetchCompletedCount(athleteId); } },
  );
  useRealtimeTable(
    {
      table: "workout_executions",
      filter: athleteId ? `athlete_id=eq.${athleteId}` : undefined,
      enabled: !!athleteId,
    },
    () => { if (athleteId) fetchCompletedCount(athleteId); },
  );

  useEffect(() => { const refresh=()=>{ if(athleteId) { void fetchTrainings(athleteId); void fetchCompletedCount(athleteId); } }; window.addEventListener("9fit:workout-updated",refresh); return ()=>window.removeEventListener("9fit:workout-updated",refresh); }, [athleteId]);

  const fetchTrainings = async (aid: string) => {
    try {
      setLoadError(false);
      const { data, error } = await supabase
        .from("student_training_assignments")
        .select("*")
        .eq("student_id", aid)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        const today = businessDate();
        const valid = data.filter((t: any) => {
          const startValid = t.start_date <= today;
          const endValid = !t.end_date || t.end_date >= today;
          return startValid && endValid;
        });
        const assigned = await loadResolvedTemplateAssignments(aid).catch(() => []);
        const assignedTrainings: TrainingAssignment[] = assigned
          .filter((item: any) => item.prescription_schema || item.protocol_schema)
          .map((item: any) => ({
          id: item.assignment_id,
          training_name: item.content_title || item.content_ref || "Protocolo atribuído",
          training_description: "Atribuído pelo seu professor",
          start_date: today,
          is_active: true,
          training_type: "structured",
          training_data: item.prescription_schema || item.protocol_schema || undefined,
        }));
        const { data: dailyRows, error: dailyError } = await (supabase as any).from("daily_workouts").select("id,day_name,workout_date,prescription_issue,workout_exercises(exercise_id,sets,reps_range,rest_seconds,exercise_order,exercises(name,video_url,gif_url))").eq("athlete_id",aid).eq("workout_date",today).order("created_at", {ascending:false});
        if (dailyError) throw dailyError;
        setPrescriptionIssue((dailyRows || []).some((d: any) => !!d.prescription_issue));
        const dailyTrainings: TrainingAssignment[] = (dailyRows || [])
          .filter((d: any) => !d.prescription_issue && d.workout_exercises?.length)
          .map((d: any) => {
            const exercises = [...d.workout_exercises]
              .sort((a: any, b: any) => a.exercise_order - b.exercise_order)
              .map((e: any) => ({ exercise_id: e.exercise_id, name: e.exercises?.name, sets: e.sets, reps: e.reps_range, rest_seconds: e.rest_seconds, video_url: e.exercises?.video_url, gif_url: e.exercises?.gif_url }));
            return {
              id: d.id,
              daily_workout_id: d.id,
              training_name: d.day_name,
              start_date: d.workout_date,
              is_active: true,
              training_type: "structured",
              training_data: { exercises, estimated_duration: estimateMinutes(exercises) },
            };
          });
        setTrainings([...dailyTrainings, ...assignedTrainings, ...(valid as TrainingAssignment[])]);
      }
    } catch (error) {
      setLoadError(true);
      console.error("[Train] Error:", error);
      toast.error("Erro ao carregar treinos");
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedCount = async (aid: string) => {
    try {
      const activity = await loadActivitySummary(aid);
      setCompletedCount(activity.total);
      setWeeklyCompleted(activity.week);
    } catch { setLoadError(true); toast.error("Não foi possível confirmar as sessões concluídas."); }
  };

  const handleSelectWorkout = (training: TrainingAssignment) => {
    if (["html", "link", "periodization"].includes(training.training_type || "")) { navigate("/9fit/protocolo"); return; }
    const exercises = training.training_data?.exercises;
    if (training.training_type === "structured" && (!Array.isArray(exercises) || exercises.length === 0)) {
      toast.info("Este protocolo ainda não tem exercícios estruturados. Consulte a Biblioteca.");
      navigate("/9fit/biblioteca");
      return;
    }
    setSelectedTraining(training);
    setFlow("OVERVIEW");
  };

  const handleStartExecution = () => {
    const exercises = selectedTraining?.training_data?.exercises;
    if (selectedTraining?.training_type === "structured" && (!Array.isArray(exercises) || exercises.length === 0)) {
      toast.info("A prescrição deste protocolo ainda está sendo preparada.");
      navigate("/9fit/biblioteca");
      return;
    }
    if (selectedTraining?.training_type === 'link' && selectedTraining.html_file_url) {
      window.open(selectedTraining.html_file_url, '_blank');
      return;
    }
    setFlow("EXECUTION");
  };

  // FIX (aba Semana desconectada do player guiado): WeeklyTrainingView já
  // busca via fn_get_week_workouts os exercícios reais do dia clicado
  // (exercise_id, sets, reps, rest_seconds) — só nunca chegava ao
  // WorkoutExecution. Antes, "Executar" sempre abria trainings[0] (a
  // primeira atribuição da lista), ignorando qual dia da semana foi
  // clicado, e o vídeo de cada exercício abria em nova aba do YouTube em
  // vez do player guiado. Agora montamos uma TrainingAssignment sintética
  // com o training_data.exercises do próprio dia, e vai direto para EXECUTION.
  const handleExecuteWeekDay = (day: any) => {
    const exercises = (day?.exercises || []).map((e: any) => ({
      exercise_id: e.id,
      name: e.name,
      sets: e.sets,
      reps: e.reps_range || e.reps,
      rest_seconds: e.rest_seconds,
      video_url: e.video_url,
      gif_url: e.gif_url,
    }));

    if (exercises.length === 0) {
      // Sem exercícios estruturados nesse dia — fallback ao fluxo antigo
      // (primeira atribuição ativa) só quando não há nada para executar direto.
      if (trainings[0]) {
        setSelectedTraining(trainings[0]);
        setFlow("OVERVIEW");
      } else {
        setQuickOpen(true);
      }
      return;
    }

    setSelectedTraining({
      id: day.id || `week-${day.date}`,
      daily_workout_id: day.id,
      training_name: day.day_name || "Treino do dia",
      start_date: day.date,
      is_active: true,
      training_type: "structured",
      training_data: { exercises, estimated_duration: estimateMinutes(exercises) },
    });
    setFlow("EXECUTION");
  };

  const handleFinish = () => {
    setFlow("HOME");
    setSelectedTraining(null);
    if (athleteId) {
      fetchCompletedCount(athleteId);
    }
    navigate("/9fit/progresso?source=train");
  };

  const handleBack = () => {
    if (flow === "EXECUTION") {
      setFlow("OVERVIEW");
    } else if (flow === "OVERVIEW") {
      setFlow("HOME");
      setSelectedTraining(null);
    }
  };

  // Execution mode - fullscreen, no bottom nav
  if (flow === "EXECUTION" && selectedTraining && athleteId) {
    return (
      <WorkoutExecution
        training={selectedTraining}
        athleteId={athleteId}
        onFinish={handleFinish}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#08090b] text-neutral-100 pb-28 selection:bg-primary selection:text-black relative">
      {/* Hairline luminoso e ambiência */}
      <div className="fixed top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent pointer-events-none z-20" />
      <div className="fixed top-[-120px] left-1/2 -translate-x-1/2 w-[520px] h-[320px] bg-primary/[0.04] rounded-full blur-[130px] pointer-events-none z-0" />

      {/* Header High-Ticket */}
      <div className="px-4 pt-5 pb-2.5 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <p className="text-[9.5px] font-mono tracking-[0.25em] text-primary font-bold uppercase">
              9FIT // TREINO
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/9fit/move')}
              className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest rounded-md hover:bg-primary/20 transition-colors"
            >
              Move GPS
            </button>
            <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest">
              {athleteName || "ATLETA 9FIT"}
            </span>
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-white mt-1">
          {flow === "HOME" ? "Seu treino" : "Visão Geral da Sessão"}
        </h1>
      </div>

      {/* Navegação das seções logo abaixo do título: Hoje / Semana / Protocolo / Streaming */}
      {flow === "HOME" && (
        <div className="px-4 mb-3.5 relative z-10">
          <div className="rounded-xl bg-[#0f1015] border border-white/[0.08] p-1 grid grid-cols-4 gap-1 shadow-inner">
            {[
              { k: "train", l: "Hoje", I: DumbIcon },
              { k: "semana", l: "Semana", I: Calendar },
              { k: "protocol", l: "Protocolo", I: Target },
              { k: "healthflix", l: "Streaming", I: Film },
            ].map(({ k, l, I }) => {
              const isActive = subTab === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    if (k === "healthflix") navigate("/9fit/healthflix");
                    else navigate({ search: `?tab=${k === "protocol" ? "protocolo" : k}` }, { replace: true });
                  }}
                  className={`py-2 px-1 text-[10.5px] sm:text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md font-bold"
                      : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <I className="w-3.5 h-3.5" />
                  <span>{l}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Avisos do dia: só na aba Hoje, junto do treino */}
      {flow === "HOME" && subTab === "train" && (
        <div className="px-4 mb-3.5 relative z-10 space-y-3 empty:hidden">
          <TrainingAdjustmentBanner />
          {prescriptionIssue && <div role="alert"><p className="rounded-xl border border-orange-500 p-4 text-sm">O treino automático foi suspenso por uma inconsistência na prescrição. Abra a aba Protocolo para ver o que seu coach enviou.</p></div>}
        </div>
      )}

      <div className="px-4 relative z-10">
        {loading || athleteLoading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : athleteError ? (
          <div className="rounded-xl border border-destructive/30 bg-[#140c0f] p-6 text-center">
            <Dumbbell className="w-6 h-6 text-destructive mx-auto mb-2" />
            <p className="text-sm text-neutral-300">{athleteError}</p>
            <button 
              type="button"
              onClick={() => navigate("/9fit/profile")} 
              className="mt-3 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition cursor-pointer"
            >
              Ir para o perfil
            </button>
          </div>
        ) : loadError ? (
          <div className="rounded-xl border border-destructive/30 bg-[#140c0f] p-6 text-center">
            <Dumbbell className="w-6 h-6 text-destructive mx-auto mb-2" />
            <p className="text-sm text-neutral-300">Não foi possível carregar seus treinos.</p>
            <button 
              type="button"
              onClick={() => athleteId && fetchTrainings(athleteId)} 
              className="mt-3 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        ) : flow === "OVERVIEW" && selectedTraining ? (
          <WorkoutOverview
            training={selectedTraining}
            onBack={handleBack}
            onStart={handleStartExecution}
          />
        ) : subTab === "protocol" ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="font-data text-[9px] uppercase tracking-[0.3em] text-primary/80">Rotina de hoje</p>
              <DailyProtocol />
            </div>
            {athleteId && (
              <div className="space-y-2">
                <p className="font-data text-[9px] uppercase tracking-[0.3em] text-primary/80">Do seu coach</p>
                <AssignedProtocols athleteId={athleteId} />
              </div>
            )}
          </div>
        ) : subTab === "semana" && athleteId ? (
          <WeeklyTrainingView
            athleteId={athleteId}
            onExecuteToday={handleExecuteWeekDay}
            initialDate={initialCalendarDate}
          />
        ) : (
          <WorkoutHome
            trainings={trainings}
            athleteName={athleteName || "Atleta"}
            completedCount={completedCount}
            weeklyCompleted={weeklyCompleted}
            onSelectWorkout={handleSelectWorkout}
            onStartQuick={() => setQuickOpen(true)}
          />
        )}
        <QuickTrainModal open={quickOpen} onClose={() => setQuickOpen(false)} />

        {/* Rodapé da tela: upsell e ofertas por último, nunca antes do conteúdo */}
        {flow === "HOME" && (
          <div className="mt-6 space-y-6">
            <UpsellBanner
              context="feature_locked"
              storageKey="train_top"
              variant="cyan"
              headline="IA personaliza cada treino em tempo real no PRIME"
              cta="Ativar 7 dias grátis"
            />
            <DynamicOffers category="training" compact />
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
