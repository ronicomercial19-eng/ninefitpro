import { toast } from "sonner";
import { useCallback, useEffect, useRef, useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ChevronLeft, RefreshCw, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PdiRoadmapView } from "@/components/9fit/PdiRoadmapView";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import PlanejamentoPro from "@/components/9fit/PlanejamentoPro";
import { useAthleteId } from "@/hooks/useAthleteId";
import { useWorkoutOfTheDay } from "@/hooks/useWorkoutOfTheDay";
import { useActivationProgress } from "@/hooks/useActivationProgress";
import { loadCarryProjection, type ProgressionPoint } from "@/services/training/loadProgression";
import { smartPeriodizerRequest } from "@/services/smartperiodizer.service";
import { supabase } from "@/integrations/supabase/client";
import { businessDate } from '@/services/dailyContextRules';
import { planningTopic } from '@/services/planningModel';

/**
 * Planejamento (aluno).
 * A tela em si vive em <PlanejamentoPro /> (dados reais, padrão Nine Pro).
 * Esta página mantém o que já existia: PDI, sincronização com o SmartPeriodizer,
 * evento de ativação `first_plan`, dias programados e linha de próximo treino.
 */
const FIRST_PLAN_KEY = "9fit_first_plan_marked";

export default function NineFitPlanejamento() {
  const navigate = useNavigate();
  const { athleteId, loading: athleteLoading, error: athleteError } = useAthleteId();
  const { week: plannedWeek, today: workoutToday, error: workoutError } = useWorkoutOfTheDay();
  const { mark, completed, loading: activationLoading } = useActivationProgress();
  const [visibleMonth,setVisibleMonth] = useState(()=>startOfMonth(new Date(`${businessDate()}T12:00:00`)));
  const marking = useRef<string|null>(null);

  const [scheduledDates, setScheduledDates] = useState<string[]>([]);
  const [points, setPoints] = useState<ProgressionPoint[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  async function syncNow() {
    if (!athleteId) return;
    setSyncing(true);
    setSyncError(null);
    try {
      await smartPeriodizerRequest({
        path: "/v1/fitpro/planejamento/sync",
        method: "POST",
        payload: { fitpro_student_id: athleteId },
      });
      setReloadKey((k) => k + 1);
    } catch (error: any) {
      console.error("[Planejamento] syncNow:", error);
      const { error: fallbackError } = await supabase.functions.invoke("smartperiodizer-sync", { body: { athlete_id: athleteId } });
      if (fallbackError) setSyncError(`Não foi possível sincronizar a periodização: ${error?.message || "erro desconhecido"}`);
      else setReloadKey((k) => k + 1);
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    setPoints([]);setScheduledDates([]);
    if (!athleteId) return;
    let active=true;

    const refreshProjection = () =>
      loadCarryProjection(athleteId)
        .then(data=>{if(active)setPoints(data)})
        .catch(() => { if(active){setPoints([]); toast.error("Não foi possível carregar o histórico de carga");} });
    refreshProjection();
    window.addEventListener("9fit:workout-updated", refreshProjection);

    const refreshCalendar = async () => {
      const { data, error } = await supabase
        .from("daily_workouts")
        .select("workout_date")
        .eq("athlete_id", athleteId)
        .gte("workout_date", format(startOfMonth(visibleMonth), "yyyy-MM-dd"))
        .lte("workout_date", format(endOfMonth(visibleMonth), "yyyy-MM-dd"));
      if(active){setScheduledDates(error?[]:(data || []).map(d=>d.workout_date));if(error)toast.error('Não foi possível carregar os treinos programados');}
    };
    void refreshCalendar();

    const channel = supabase
      .channel(`planejamento-shell-${athleteId}-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_workouts", filter: `athlete_id=eq.${athleteId}` }, refreshCalendar)
      .on("postgres_changes", { event: "*", schema: "public", table: "workout_executions", filter: `athlete_id=eq.${athleteId}` }, refreshProjection)
      .subscribe();

    return () => {
      active=false;
      window.removeEventListener("9fit:workout-updated", refreshProjection);
      supabase.removeChannel(channel);
    };
  }, [athleteId,visibleMonth,reloadKey]);

  // Treinos programados = daily_workouts do mês + semana planejada (ignorando sessões de fallback)
  const plannedDates = Array.from(new Set([
    ...scheduledDates,
    ...plannedWeek.filter((s) => s.source !== "fallback").map((s) => s.date),
  ]));

  // Funil de ativação: marca o primeiro plano visto (uma única vez)
  const handlePlanLoaded = useCallback(async (hasPlan: boolean) => {
    if (!hasPlan || !athleteId || activationLoading || completed.has('first_plan') || marking.current===athleteId) return;
    marking.current=athleteId;
    try {
      if (!localStorage.getItem(`${FIRST_PLAN_KEY}:${athleteId}`)) {
        await mark("first_plan");
        window.dispatchEvent(new Event('9fit:activation-updated'));
        localStorage.setItem(`${FIRST_PLAN_KEY}:${athleteId}`, "1");
        localStorage.setItem(FIRST_PLAN_KEY,"1");
      }
    } catch { marking.current=null; }
  }, [athleteId,mark,activationLoading,completed]);

  const goRon = (topic: string) =>
    navigate(`/9fit/ron?auto=1&context=planning&topic=${encodeURIComponent(planningTopic(topic))}`);

  return (
    <div className="min-h-screen bg-background pb-32 text-foreground">
      <div className="px-4 pt-6 flex items-center gap-2">
        <button onClick={() => navigate(-1)} aria-label="Voltar" className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="text-[10px] font-data tracking-[0.4em] text-primary/80">9FIT PRO // PLANEJAMENTO</p>
          <h1 className="text-3xl font-display tracking-tight">Planejamento</h1>
        </div>
        <button onClick={syncNow} disabled={syncing} aria-label="Sincronizar periodização" title="Sincronizar" className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center disabled:opacity-50">
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>

      <PdiRoadmapView />
      {athleteLoading&&<p className="mx-4 mt-3 text-sm text-muted-foreground" role="status">Localizando seu perfil…</p>}
      {athleteError&&<p className="mx-4 mt-3 text-sm text-destructive" role="alert">{athleteError}</p>}
      {workoutError&&<p className="mx-4 mt-3 text-sm text-destructive" role="alert">{workoutError}</p>}

      {syncError && (
        <div className="mx-4 mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 flex items-center justify-between gap-3">
          <p className="text-xs text-destructive">{syncError}</p>
          <button onClick={() => void syncNow()} className="text-xs text-primary shrink-0">Tentar de novo</button>
        </div>
      )}

      <div className="px-4 mt-2">
        <PlanejamentoPro
          athleteId={athleteId ?? undefined}
          reloadKey={reloadKey}
          plannedDates={plannedDates}
          forca={points}
          onAskRon={goRon}
          onStart={() => navigate("/9fit/train")}
          onPlanLoaded={handlePlanLoaded}
          visibleMonth={visibleMonth}
          onMonthChange={setVisibleMonth}
        />
      </div>

      {workoutToday && (
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Próximo treino: {format(new Date(`${workoutToday.date}T12:00:00`), "dd/MM")} • {workoutToday.label}
        </p>
      )}
      <BottomNavigation />
    </div>
  );
}
