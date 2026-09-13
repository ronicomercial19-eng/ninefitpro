import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Play, Loader2, Dumbbell, Lock, Check } from "lucide-react";
import { toast } from "sonner";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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
        date: d.workout_date || d.date,
        day_label: d.day_name || d.day_label || DAY_LABELS[new Date(d.workout_date || d.date).getDay()],
        status: d.status || "planned",
        exercises: (d.exercises || []).map((e: any) => ({
          id: e.id,
          name: e.name,
          sets: e.sets,
          reps: e.reps_range || e.reps,
          rest_seconds: e.rest_seconds,
          video_url: e.video_url,
          gif_url: e.gif_url,
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

  // FIX (player guiado): mapa de nomes técnicos de status para rótulo legível.
  // fn_get_week_workouts retorna o status bruto da periodização (active,
  // in_progress, sem_periodizacao) — mostrar isso cru como "Fase" confundia
  // o aluno (aparecia "active" ou "—" em vez do nome real da fase de treino).
  const phaseLabel = phase === "active" || phase === "in_progress"
    ? "Em andamento"
    : phase === "sem_periodizacao" || !phase
    ? "Sem periodização ativa"
    : phase;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Treinos da Semana</p>
          <p className="text-xs text-muted-foreground">
            Fase: <span className="text-foreground font-semibold">{phaseLabel}</span>
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
              ) : d.status !== "rest" && d.exercises.length > 0 ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => onExecuteToday(d)}
                    className="nine-pro-gradient nine-pro-clip text-primary-foreground px-4 py-2 text-xs font-bold flex items-center gap-1">
                    <Play className="w-3.5 h-3.5" /> Executar
                  </button>
                  {isToday && (
                    <span className="text-[10px] uppercase tracking-wider text-primary/80">Hoje</span>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground"><Lock className="w-4 h-4" /></div>
              )}
            </div>

            {/* FIX (player guiado): cada exercício também abre o player
                guiado no exercício certo em vez do link do YouTube em nova
                aba — clicar em qualquer item leva direto para a execução
                posicionada nesse exercício. */}
            {d.exercises?.length > 0 && (
              <ul className="space-y-1.5 mt-3">
                {d.exercises.slice(0, 8).map((e, j) => (
                  <li key={j}>
                    <button
                      onClick={() => onExecuteToday(d)}
                      className="w-full flex items-center gap-2 text-xs text-left hover:text-primary transition-colors"
                    >
                      <Dumbbell className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">{e.name}</span>
                      {(e.sets || e.reps) && (
                        <span className="text-muted-foreground">{e.sets}{e.reps ? `×${e.reps}` : ""}</span>
                      )}
                      {e.video_url && <Play className="w-3 h-3 text-primary shrink-0" />}
                    </button>
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
        <Calendar className="w-3 h-3" /> Ao concluir, o progresso e o Sync Score são atualizados
      </p>
    </div>
  );
}
