import { isExecutableTraining } from '@/lib/executableTraining';
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
import { UpsellBanner } from "@/components/9fit/UpsellBanner";
import { DynamicOffers } from "@/components/9fit/DynamicOffers";
import { QuickTrainModal } from "@/components/9fit/QuickTrainModal";
import { WeeklyTrainingView } from "@/components/9fit/WeeklyTrainingView";
import { useNavigate, useLocation } from "react-router-dom";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { loadResolvedTemplateAssignments } from "@/integrations/templateAssignments";
import { Film, Dumbbell as DumbIcon, Target, Zap, Calendar, ArrowUpRight, Dumbbell } from "lucide-react";
import { TrainingAdjustmentBanner } from "@/components/9fit/TrainingAdjustmentBanner";
import { businessDate } from "@/services/dailyContextRules";

interface TrainingAssignment {
  id: string;
  daily_workout_id?: string;
  execution_id?: string;
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
  const { athleteId, athleteName, loading: athleteLoading, error: athleteError, retry: retryAthlete } = useAthleteId();
  const navigate = useNavigate();
  const location = useLocation();
  const [trainings, setTrainings] = useState<TrainingAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [prescriptionIssue, setPrescriptionIssue] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [countWarning, setCountWarning] = useState(false);
  const [weeklyCompleted, setWeeklyCompleted] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [subTab, setSubTab] = useState<"train" | "semana" | "protocol" | "healthflix">("train");
  const [quickOpen, setQuickOpen] = useState(false);
  const [previousSession, setPreviousSession] = useState<{ id: string; workout_date: string; daily_workout_id: string | null; assignment_id: string | null } | null>(null);
  const [sessionBusy, setSessionBusy] = useState(false);
  useEffect(() => {
    if (!athleteId) {
      setPreviousSession(null);
      return;
    }
    let active = true;
    void supabase.from('workout_executions').select('id,workout_date,daily_workout_id,assignment_id')
      .eq('athlete_id', athleteId).eq('status','in_progress').lt('workout_date',businessDate())
      .order('created_at',{ascending:false}).limit(1).maybeSingle().then(({data,error}) => {
        if (active && !error) setPreviousSession(data);
      });
    return () => { active = false; };
  }, [athleteId, completedCount]);

  async function handlePreviousSession(resume: boolean) {
    if (!previousSession || !athleteId || sessionBusy) return;
    setSessionBusy(true);
    try {
      if (!resume) {
        const { data, error } = await supabase.rpc('fn_complete_workout_execution',{p_execution_id:previousSession.id,p_duration_seconds:0});
        if (error || !(data as any)?.ok) throw error || new Error('Não foi possível finalizar.');
        toast.info((data as any).completion_valid ? 'Treino finalizado.' : 'Sessão salva sem entrar nos contadores.');
        setPreviousSession(null);
        await fetchCompletedCount(athleteId);
      } else if (previousSession.daily_workout_id) {
        const { data, error } = await (supabase as any).from('daily_workouts')
          .select('id,day_name,workout_date,prescription_issue,workout_exercises(exercise_id,exercise_name,exercise_order,sets,reps_range,rest_seconds,tempo,observations,notes)')
          .eq('id',previousSession.daily_workout_id).eq('athlete_id',athleteId).single();
        if (error) throw error;
        if (data.prescription_issue) throw new Error('A prescrição precisa de revisão do profissional antes da retomada.');
        const resumedTraining = { id:data.id,daily_workout_id:data.id,execution_id:previousSession.id,training_name:data.day_name,
          start_date:data.workout_date,is_active:true,training_type:'structured',training_data:{exercises:data.workout_exercises.sort((a:any,b:any)=>a.exercise_order-b.exercise_order).map((e:any)=>({exercise_id:e.exercise_id,name:e.exercise_name,sets:e.sets,reps:e.reps_range,rest_seconds:e.rest_seconds,tempo:e.tempo,notes:e.observations?.notes || e.notes}))} };
        if (!isExecutableTraining(resumedTraining)) throw new Error("A sessão original precisa de exercícios, séries e doses confirmados.");
        setSelectedTraining(resumedTraining);
        setFlow('EXECUTION');
      } else {
        const training = trainings.find(item=>item.id===previousSession.assignment_id);
        if (!training) throw new Error('A atribuição original não está disponível. Finalize o registro ou fale com seu profissional.');
        if (!isExecutableTraining(training)) throw new Error('A prescrição precisa ser completada pelo profissional.');
        setSelectedTraining({...training,execution_id:previousSession.id});setFlow('EXECUTION');
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível consultar a sessão.'); }
    finally { setSessionBusy(false); }
  }
  const initialCalendarDate = new URLSearchParams(location.search).get("date") || undefined;

  useEffect(() => {
    setSubTab(new URLSearchParams(location.search).get("tab") === "semana" || initialCalendarDate ? "semana" : "train");
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
    if (quick && isExecutableTraining(quick)) {
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
        const { data: dailyRows, error: dailyError } = await (supabase as any).from("daily_workouts").select("id,day_name,workout_date,prescription_issue,workout_exercises(exercise_id,exercise_name,sets,reps_range,rest_seconds,exercise_order,tempo,notes,observations,exercises(name,video_url,gif_url))").eq("athlete_id",aid).eq("workout_date",today).order("created_at", {ascending:false});
        if (dailyError) throw dailyError;
        setPrescriptionIssue((dailyRows || []).some((d: any) => !!d.prescription_issue));
        const dailyTrainings: TrainingAssignment[] = (dailyRows || [])
          .filter((d: any) => !d.prescription_issue && d.workout_exercises?.length)
          .map((d: any) => {
            const exercises = [...d.workout_exercises]
              .sort((a: any, b: any) => a.exercise_order - b.exercise_order)
              .map((e: any) => ({ exercise_id: e.exercise_id, name: e.exercise_name || e.exercises?.name, sets: e.sets, reps: e.reps_range, rest_seconds: e.rest_seconds, tempo:e.tempo, notes:e.observations?.notes || e.notes, video_url: e.exercises?.video_url, gif_url: e.exercises?.gif_url }));
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
      setCountWarning(false);
    } catch { setCountWarning(true); toast.error("Não foi possível confirmar as sessões concluídas."); }
  };

  const handleSelectWorkout = (training: TrainingAssignment) => {
    if (["html", "link", "periodization"].includes(training.training_type || "")) { navigate("/9fit/protocolo"); return; }
    if (!isExecutableTraining(training)) {
      toast.info("Este protocolo ainda não tem exercícios estruturados. Consulte a Biblioteca.");
      navigate("/9fit/biblioteca");
      return;
    }
    setSelectedTraining(training);
    setFlow("OVERVIEW");
  };

  const handleStartExecution = () => {
    if (!isExecutableTraining(selectedTraining)) {
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
      notes: e.notes,
      tempo: e.tempo,
      sets: e.sets,
      reps: e.reps_range || e.reps,
      rest_seconds: e.rest_seconds,
      video_url: e.video_url,
      gif_url: e.gif_url,
    }));

    if (!isExecutableTraining({ training_data: { exercises } })) {
      toast.info("Esta sessão ainda não tem exercícios prescritos. Consulte seu profissional antes de executar.");
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
    setFlow("OVERVIEW");
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
    <div className="fitpro-orange min-h-screen bg-[#08090b] text-neutral-100 pb-28 selection:bg-primary selection:text-black relative">
      {previousSession && <section className="mx-4 mt-16 rounded-2xl border border-primary/40 bg-primary/10 p-4 space-y-3">
        <h2 className="font-bold">Retomar ou finalizar</h2>
        <p className="text-sm">Há uma sessão de {new Date(`${previousSession.workout_date}T12:00:00`).toLocaleDateString('pt-BR')} aberta.</p>
        <div className="flex gap-3"><button disabled={sessionBusy} className="min-h-11 rounded-xl bg-primary px-4 text-black disabled:opacity-50" onClick={()=>void handlePreviousSession(true)}>Retomar</button><button disabled={sessionBusy} className="min-h-11 rounded-xl border border-primary/50 px-4 disabled:opacity-50" onClick={()=>void handlePreviousSession(false)}>Finalizar registro</button></div>
      </section>}
      {/* Header */}
      <div className="px-4 pt-5 pb-2.5 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF7A45]" />
            <p className="text-[11px] font-mono tracking-[0.12em] text-[#EF7A45] font-bold uppercase">
              9FIT // TREINO
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/9fit/move')}
              className="px-2.5 py-1 bg-[#EF7A45]/15 border border-[#EF7A45]/25 text-[#EF7A45] text-[10px] font-bold uppercase tracking-[0.08em] rounded-lg hover:bg-[#EF7A45]/25 transition-colors"
            >
              Move GPS
            </button>
            <span className="text-[10px] font-mono text-white/45 uppercase tracking-[0.08em]">
              {athleteName || "ATLETA 9FIT"}
            </span>
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-white mt-1">
          {flow === "HOME" ? "Seu treino" : "Visão Geral da Sessão"}
        </h1>
      </div>

      <div className="px-4 relative z-10">
        <TrainingAdjustmentBanner />
      </div>

      {prescriptionIssue && flow === "HOME" && <div role="alert" className="px-4 mb-4"><p className="rounded-xl border border-orange-500 p-4 text-sm">O treino automático foi suspenso por uma inconsistência na prescrição. Abra a aba Protocolo para ver o que seu coach enviou.</p></div>}

      {countWarning && flow === "HOME" && !loadError && (
        <div role="status" className="px-4 mb-4">
          <p className="rounded-xl border border-[#EF7A45]/40 bg-[#EF7A45]/10 p-4 text-sm">
            Os contadores de sessões não foram confirmados. O treino do dia continua disponível.
            <button type="button" className="ml-2 font-semibold text-[#EF7A45]" onClick={() => athleteId && void fetchCompletedCount(athleteId)}>Tentar de novo</button>
          </p>
        </div>
      )}

      {/* Upsell contextual no topo de Train */}
      <div className="px-4 mb-3 relative z-10">
        <UpsellBanner
          context="feature_locked"
          storageKey="train_top"
          variant="cyan"
          headline="Organize seus treinos e acompanhe sua evolução no 9FIT PRO"
          cta="Conhecer a assinatura"
        />
      </div>

      {/* Sub-tabs no padrão Pill Segmented Control */}
      {flow === "HOME" && (
        <div className="px-4 mb-3.5 relative z-10">
          <div className="rounded-2xl bg-[#0B0B0C] border border-[#EF7A45]/25 p-1 grid grid-cols-4 gap-1">
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
                    else if (k === "protocol") navigate("/9fit/protocolo");
                    else {
                      const params = new URLSearchParams(location.search);
                      params.delete("date");
                      if (k === "semana") params.set("tab", "semana"); else params.delete("tab");
                      navigate({ pathname: location.pathname, search: params.toString() });
                    }
                  }}
                  className={`py-2 px-1 text-[10.5px] sm:text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    isActive
                      ? "bg-[#EF7A45] text-white"
                      : "text-white/45 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <I strokeWidth={1.75} className="w-3.5 h-3.5" />
                  <span>{l}</span>
                </button>
              );
            })}
          </div>
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
            <button type="button" onClick={() => void retryAthlete()}
              className="mt-3 mr-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
              Tentar novamente
            </button>
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
          <DailyProtocol />
        ) : subTab === "semana" && athleteId ? (
          <WeeklyTrainingView
            athleteId={athleteId}
            onExecuteToday={handleExecuteWeekDay}
            initialDate={initialCalendarDate}
          />
        ) : (
          <>
            {/* Botão Treino Rápido */}
            <button 
              type="button"
              onClick={() => setQuickOpen(true)}
              className="w-full mb-3.5 p-3 rounded-3xl border border-[#EF7A45]/25 hover:border-[#EF7A45]/40 bg-[#0B0B0C] flex items-center justify-between transition-colors group cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#EF7A45]/[0.12] border border-[#EF7A45]/25 flex items-center justify-center text-[#EF7A45]">
                  <Zap strokeWidth={1.75} className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-white block">
                    Calibrar Treino Rápido
                  </span>
                  <span className="text-[10px] font-mono text-white/45 block">
                    Ajuste dinâmico por tempo disponível e energia (3 etapas)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-[#EF7A45]">
                <span>Calibrar</span>
                <ArrowUpRight strokeWidth={1.75} className="w-3.5 h-3.5" />
              </div>
            </button>

            <WorkoutHome
              trainings={trainings}
              athleteName={athleteName || "Atleta"}
              completedCount={completedCount}
            weeklyCompleted={weeklyCompleted}
              onSelectWorkout={handleSelectWorkout}
              onStartQuick={() => setQuickOpen(true)}
            />
          </>
        )}
        <QuickTrainModal open={quickOpen} onClose={() => setQuickOpen(false)} />

        {flow === "HOME" && (
          <div className="mt-6 space-y-6">
            <DynamicOffers category="training" compact />
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
