import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, ChevronLeft, ChevronRight, Play, Loader2, Dumbbell, Check } from "lucide-react";
import { toast } from "sonner";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface WeeklyTrainingViewProps {
  athleteId: string;
  onExecuteToday: (workout: DayPlan) => void;
}

type DayExercise = { id?: string; name: string; sets?: number|string; reps?: string; rest_seconds?: number; video_url?: string | null; gif_url?: string | null };
type DayPlan = {
  id?: string;
  date: string;
  day_label: string;
  status: "rest" | "planned" | "completed" | "in_progress";
  execution_id?: string;
  exercises: DayExercise[];
};

interface WeekPayload {
  phase_status?: string;
  match_percentage?: number;
  week?: Array<{
    id?: string;
    daily_workout_id?: string;
    workout_id?: string;
    workout_date?: string;
    date?: string;
    day_name?: string;
    day_label?: string;
    status?: DayPlan["status"];
    execution_id?: string;
    exercises?: Array<{
      id?: string;
      name?: string;
      sets?: number | string;
      reps_range?: string;
      reps?: string;
      rest_seconds?: number;
      video_url?: string | null;
      gif_url?: string | null;
    }>;
  }>;
}

/**
 * Bloco C — Treinos da Semana.
 * fn_get_week_workouts → grid D1..D7 com phase_status/match_percentage.
 */
export function WeeklyTrainingView({ athleteId, onExecuteToday }: WeeklyTrainingViewProps) {
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<DayPlan[]>([]);
  const [phase, setPhase] = useState<string>("");
  const [match, setMatch] = useState<number>(0);
  const [weekStart, setWeekStart] = useState(() => {
    const date = new Date();
    const day = date.getDay() || 7;
    date.setDate(date.getDate() + 1 - day);
    return date.toISOString().slice(0, 10);
  });

  const todayISO = new Date().toISOString().slice(0, 10);
  const shiftWeek = (delta: number) => {
    const date = new Date(`${weekStart}T00:00:00`);
    date.setDate(date.getDate() + delta * 7);
    setWeekStart(date.toISOString().slice(0, 10));
  };

  const loadWeek = useCallback(async () => {
    if (!athleteId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("fn_get_week_workouts" as any, {
        p_athlete_id: athleteId,
        p_week_start: weekStart,
      });
      if (error) throw error;
      const payload = (data || {}) as WeekPayload;
      setPhase(String(payload.phase_status || ""));
      setMatch(Number(payload.match_percentage || 0));
      const week = payload.week || [];
      setDays(week.map((d) => ({
        id: d.id || d.daily_workout_id || d.workout_id,
        date: d.workout_date || d.date,
        day_label: d.day_name || d.day_label || DAY_LABELS[new Date(d.workout_date || d.date).getDay()],
        status: d.status || "planned",
        execution_id: d.execution_id,
        exercises: (d.exercises || []).map((e) => ({
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
  }, [athleteId, weekStart]);

  useEffect(() => {
    loadWeek();
    if (!athleteId) return;
    const channelName = `weekly-${athleteId}-${Math.random().toString(36).slice(2, 8)}`;
    const ch = supabase.channel(channelName)
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            className="w-8 h-8 rounded-lg border border-white/10 grid place-items-center text-muted-foreground hover:text-foreground"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-mono text-muted-foreground">
            {new Date(`${weekStart}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
          </span>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            className="w-8 h-8 rounded-lg border border-white/10 grid place-items-center text-muted-foreground hover:text-foreground"
            aria-label="Próxima semana"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
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
        const isRest = d.status === "rest";
        const exerciseCount = d.exercises?.length || 0;

        return (
          <div
            key={d.date + i}
            className={`relative rounded-xl overflow-hidden border transition-all duration-300 group shadow-lg ${
              isToday
                ? "border-primary/50 shadow-primary/10"
                : "border-white/[0.08] hover:border-white/20"
            } ${isDone ? "opacity-75" : ""}`}
          >
            {/* Fundo Retangular Escuro com Gradiente Direcional e Vinheta */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0c0d12] via-[#0f1118] to-[#0a0b0f] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff06_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
            
            {/* Hairline luminoso sutil no topo do card ativo */}
            {isToday && (
              <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            )}

            {/* Layout em Grid / Split Horizontal no estilo da referência */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 min-h-[140px]">
              {/* Coluna Esquerda (7 cols): Destaque Tipográfico, Headline e Descrição */}
              <div className="p-4 sm:p-5 md:col-span-7 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/[0.06] bg-gradient-to-br from-black/40 to-transparent">
                <div>
                  {/* Eyebrow técnico laranja / tracking largo */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-mono tracking-[0.25em] text-primary font-bold uppercase">
                      DIA 0{i + 1} // {d.day_label.toUpperCase()}
                    </span>
                    {isToday && (
                      <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[8px] font-mono font-bold tracking-wider uppercase border border-primary/30 animate-pulse">
                        HOJE
                      </span>
                    )}
                    {isDone && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[8px] font-mono font-bold tracking-wider uppercase border border-emerald-500/30">
                        CONCLUÍDO
                      </span>
                    )}
                  </div>

                  {/* Headline de Alto Impacto: tipografia robusta, clean, sem serafins */}
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white font-display leading-tight">
                    {isRest ? "Recuperação Ativa & Descanso" : `Sessão de Força ${d.day_label}`}
                  </h3>

                  {/* Descrição do Treino */}
                  <p className="text-xs text-neutral-400 mt-1.5 line-clamp-2 max-w-md font-normal leading-relaxed">
                    {isRest
                      ? "Dia planejado para regeneração miofascial, hidratação celular e adaptação neural dos ciclos anteriores."
                      : `Prescrição neuromotora com ${exerciseCount} blocos de exercícios calibrados para o seu objetivo.`}
                  </p>
                </div>

                {/* Métricas e Ação na Base */}
                <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-white/[0.05]">
                  <div className="flex items-center gap-3 text-[10px] font-mono text-neutral-400">
                    <span className="flex items-center gap-1">
                      <Dumbbell className="w-3 h-3 text-primary" />
                      {isRest ? "0 Exercícios" : `${exerciseCount} Exercícios`}
                    </span>
                    {!isRest && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-primary" />
                          {new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                        </span>
                      </>
                    )}
                  </div>

                  {!isRest && (
                    <button
                      type="button"
                      onClick={() => onExecuteToday(d)}
                      className="py-2 px-4 rounded-lg font-bold text-xs flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isDone ? "Refazer Treino" : "Executar Treino"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Coluna Direita (5 cols): Grid de Itens / Exercícios com Checkmark no padrão da imagem */}
              <div className="p-4 sm:p-5 md:col-span-5 flex flex-col justify-center bg-black/20">
                {isRest ? (
                  <div className="text-center py-4 text-neutral-500">
                    <p className="text-xs font-mono uppercase tracking-widest text-neutral-400">STATUS DO DIA</p>
                    <p className="text-sm text-neutral-300 mt-1">Nenhum exercício programado</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2">
                    {d.exercises.slice(0, 4).map((e, j) => (
                      <button
                        key={j}
                        type="button"
                        onClick={() => onExecuteToday(d)}
                        className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-primary/40 transition-all text-left cursor-pointer group/item"
                      >
                        {/* Checkmark Laranja no padrão da imagem enviada */}
                        <Check className="w-3.5 h-3.5 text-primary shrink-0 stroke-[2.5]" />
                        <span className="text-xs font-bold text-neutral-200 tracking-wide uppercase truncate group-hover/item:text-primary transition-colors flex-1 font-display">
                          {e.name}
                        </span>
                        {(e.sets || e.reps) && (
                          <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                            {e.sets}{e.reps ? `×${e.reps}` : ""}
                          </span>
                        )}
                      </button>
                    ))}
                    {d.exercises.length > 4 && (
                      <button
                        type="button"
                        onClick={() => onExecuteToday(d)}
                        className="text-[10px] font-mono uppercase tracking-widest text-primary/80 hover:text-primary pt-1 text-left pl-2 cursor-pointer transition-colors"
                      >
                        + {d.exercises.length - 4} exercícios prescritos
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <p className="text-[10px] text-muted-foreground text-center pt-2 flex items-center justify-center gap-1">
        <Calendar className="w-3 h-3" /> Ao concluir, o progresso e o Sync Score são atualizados
      </p>
    </div>
  );
}

