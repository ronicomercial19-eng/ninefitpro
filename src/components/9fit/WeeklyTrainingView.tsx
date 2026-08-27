import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Play, Loader2, Dumbbell, Lock, Check } from "lucide-react";
import { toast } from "sonner";
import { useAthleteScores } from "@/hooks/useAthleteScores";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// FIX #9 (QA Master): "Fase: sem_periodizacao" era o enum cru do banco
// vazando na UI. Dicionário de tradução — qualquer enum sem entrada aqui
// cai no fallback (nunca mais snake_case puro na tela).
const PHASE_LABELS: Record<string, string> = {
  sem_periodizacao: "Sem periodização definida",
  base: "Base",
  acumulacao: "Acumulação",
  intensificacao: "Intensificação",
  realizacao: "Realização",
  deload: "Deload",
  transicao: "Transição",
};

function friendlyPhase(raw: string): string {
  if (!raw) return "—";
  if (PHASE_LABELS[raw]) return PHASE_LABELS[raw];
  // fallback genérico: nunca deixa snake_case cru, mesmo pra enum novo
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface WeeklyTrainingViewProps {
  athleteId: string;
  onExecuteToday: (workout: any) => void;
}

type DayExercise = { id?: string; name: string; sets?: number|string; reps?: string; rest_seconds?: number; video_url?: string | null };
type DayPlan = {
  date: string;
  day_label: string;
  status: "rest" | "planned" | "completed" | "in_progress";
  exercises: DayExercise[];
};

/**
 * Bloco C — Treinos da Semana.
 * fn_get_week_workouts → grid D1..D7 com phase_status/match_percentage.
 */
export function WeeklyTrainingView({ athleteId, onExecuteToday }: WeeklyTrainingViewProps) {
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<DayPlan[]>([]);
  const [phase, setPhase] = useState<string>("");
  const [match, setMatch] = useState<number>(0);
  const [completing, setCompleting] = useState<string | null>(null);
  const { refresh: refreshScores } = useAthleteScores(athleteId);

  const todayISO = new Date().toISOString().slice(0, 10);

  const loadWeek = useCallback(async () => {
    if (!athleteId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("fn_get_week_workouts" as any, { p_athlete_id: athleteId });
      if (error) throw error;
      const payload: any = data || {};
      setPhase(String(payload.phase_status || ""));
      setMatch(Number(payload.match_percentage || 0));
      const week: any[] = payload.week || [];
      setDays(week.map((d: any) => ({
        date: d.date,
        day_label: d.day_label || DAY_LABELS[new Date(d.date).getDay()],
        status: d.status || "planned",
        exercises: (d.exercises || []).map((e: any) => ({
          id: e.id,
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          rest_seconds: e.rest_seconds,
          video_url: e.video_url,
        })),
      })));
    } catch (e) {
      console.error("[WeeklyTrainingView] fn_get_week_workouts", e);
    } finally { setLoading(false); }
  }, [athleteId]);

  useEffect(() => {
    loadWeek();
    if (!athleteId) return;
    const ch = supabase.channel(`weekly-${athleteId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_workouts", filter: `athlete_id=eq.${athleteId}` }, loadWeek)
      .on("postgres_changes", { event: "*", schema: "public", table: "workout_executions", filter: `athlete_id=eq.${athleteId}` }, loadWeek)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [athleteId, loadWeek]);

  const completeDay = async (d: DayPlan) => {
    if (!athleteId) return;
    setCompleting(d.date);
    try {
      await supabase.from("workout_executions" as any).insert({
        athlete_id: athleteId,
        workout_date: d.date,
        phase_name: phase || "week",
        status: "completed",
        completed_at: new Date().toISOString(),
      } as any);
      await supabase.rpc("fn_award_xp" as any, {
        p_athlete_id: athleteId,
        p_amount: 100,
        p_source: "workout_completed",
        p_metadata: { date: d.date, phase } as any,
      });
      toast.success("Treino concluído · +100 XP");
      await refreshScores();
      await loadWeek();
    } catch (e: any) {
      console.error("[WeeklyTrainingView] complete", e);
      toast.error("Falha ao concluir treino");
    } finally { setCompleting(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Treinos da Semana</p>
          <p className="text-xs text-muted-foreground">
            Fase: <span className="text-foreground font-semibold">{friendlyPhase(phase)}</span>
            {match > 0 && <> · Aderência {match}%</>}
          </p>
        </div>
      </div>

      {loading && (
        <div className="py-10 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}

      {!loading && days.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-muted-foreground text-sm">
          Nenhum plano ativo. Seu professor irá atribuir em breve.
        </div>
      )}

      {!loading && days.map((d, i) => {
        const isToday = d.date === todayISO;
        const isDone = d.status === "completed";
        return (
          <div key={d.date + i}
            className={`rounded-2xl border p-4 ${isToday ? "border-primary/60 bg-primary/[0.06]" : "border-white/10 bg-white/[0.03]"} ${isDone ? "opacity-70" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-primary font-bold">
                  D{i + 1} · {d.day_label} {isToday && "· HOJE"} {isDone && "· ✔"}
                </p>
                <p className="font-display text-lg">
                  {d.status === "rest" ? "Descanso" : `${d.exercises.length} exercícios`}
                </p>
              </div>
              {isDone ? (
                <span className="rounded-full bg-primary/20 text-primary px-3 py-1 text-xs font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Concluído
                </span>
              ) : isToday && d.status !== "rest" ? (
                <div className="flex gap-2">
                  <button onClick={() => onExecuteToday(d)}
                    className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-bold flex items-center gap-1">
                    <Play className="w-3.5 h-3.5" /> Executar
                  </button>
                  <button onClick={() => completeDay(d)} disabled={completing === d.date}
                    className="rounded-full border border-primary/50 text-primary px-4 py-2 text-xs font-bold flex items-center gap-1 disabled:opacity-40">
                    {completing === d.date ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Concluir
                  </button>
                </div>
              ) : (
                <div className="text-muted-foreground"><Lock className="w-4 h-4" /></div>
              )}
            </div>

            {d.exercises?.length > 0 && (
              <ul className="space-y-1.5 mt-3">
                {d.exercises.slice(0, 8).map((e, j) => (
                  <li key={j} className="flex items-center gap-2 text-xs">
                    <Dumbbell className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{e.name}</span>
                    {(e.sets || e.reps) && (
                      <span className="text-muted-foreground">{e.sets}{e.reps ? `×${e.reps}` : ""}</span>
                    )}
                    {e.video_url && (
                      <a href={e.video_url} target="_blank" rel="noreferrer" className="text-primary">
                        <Play className="w-3 h-3" />
                      </a>
                    )}
                  </li>
                ))}
                {d.exercises.length > 8 && (
                  <li className="text-[10px] text-muted-foreground pl-5">+ {d.exercises.length - 8} exercícios</li>
                )}
              </ul>
            )}
          </div>
        );
      })}

      <p className="text-[10px] text-muted-foreground text-center pt-2 flex items-center justify-center gap-1">
        <Calendar className="w-3 h-3" /> Conclusão concede +100 XP · Sync Score recalcula em tempo real
      </p>
    </div>
  );
}
