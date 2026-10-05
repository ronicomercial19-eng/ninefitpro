import { addDays, addWeeks, format, isBefore, parseISO, startOfWeek } from "date-fns";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Play, Loader2, Dumbbell, Lock, Check, ChevronLeft, ChevronRight, CalendarPlus, CircleSlash } from "lucide-react";
import { toast } from "sonner";
import { weeklyAdherence } from '@/services/athleteCardRules';
import { businessDate } from '@/services/dailyContextRules';

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface WeeklyTrainingViewProps {
  athleteId: string;
  onExecuteToday: (workout: DayPlan) => void;
  initialDate?: string;
}

type DayExercise = { id?: string; name: string; sets?: number|string; reps?: string; rest_seconds?: number; completed?: boolean; video_url?: string | null; gif_url?: string | null };
type DayPlan = {
  id?: string;
  date: string;
  day_label: string;
  status: "rest" | "planned" | "completed" | "in_progress" | "skipped";
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
    execution_id?: string | null;
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
export function WeeklyTrainingView({ athleteId, onExecuteToday, initialDate }: WeeklyTrainingViewProps) {
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<DayPlan[]>([]);
  const [phase, setPhase] = useState<string>("");
  const [match, setMatch] = useState<number>(0);
  const [selectedDate,setSelectedDate]=useState(initialDate || businessDate()),[failed,setFailed]=useState(false);
  const [weekStart,setWeekStart]=useState(()=>startOfWeek(parseISO(initialDate || businessDate()),{weekStartsOn:1}));
  const [generating,setGenerating]=useState(false),[skipping,setSkipping]=useState(false),[confirmSkip,setConfirmSkip]=useState(false);

  const todayISO = businessDate();
  const currentWeekStart = startOfWeek(parseISO(todayISO),{weekStartsOn:1});
  const weekStartISO = format(weekStart,"yyyy-MM-dd");
  const weekEndISO = format(addDays(weekStart,6),"yyyy-MM-dd");
  const selectedDay = Math.max(0, days.findIndex(day => day.date === selectedDate));

  useEffect(()=>{
    if(!initialDate)return;
    const next=startOfWeek(parseISO(initialDate),{weekStartsOn:1});
    setSelectedDate(initialDate);
    setWeekStart(next);
  },[initialDate]);

  const loadWeek = useCallback(async () => {
    if (!athleteId) return;
    setLoading(true);
    setFailed(false);
    try {
      const { data, error } = await supabase.rpc("fn_get_week_workouts", { p_athlete_id: athleteId, p_week_start: weekStartISO });
      if (error) throw error;
      const payload = (data || {}) as WeekPayload;
      setPhase(String(payload.phase_status || ""));
      const week = payload.week || [];
      setMatch(weeklyAdherence(week.map(d=>({date:d.workout_date||d.date||"",status:d.status||"planned",exerciseCount:d.exercises?.length??0})),todayISO)??0);
      const { data: recordedSets, error: setsError } = await supabase.from("workout_exercise_sets").select("exercise_name,set_number,workout_executions!inner(athlete_id,workout_date,daily_workout_id)").eq("workout_executions.athlete_id",athleteId).eq("completed",true).gte("workout_executions.workout_date",week[0]?.workout_date || week[0]?.date || todayISO).lte("workout_executions.workout_date",week[week.length-1]?.workout_date || week[week.length-1]?.date || todayISO);
      if(setsError)throw setsError;
      setDays(week.map((d) => ({
        id: d.id || d.daily_workout_id || d.workout_id,
        date: d.workout_date || d.date,
        day_label: d.day_name || d.day_label || DAY_LABELS[new Date(`${d.workout_date || d.date}T12:00:00`).getDay()],
        status: d.status || "planned",
        exercises: (d.exercises || []).map((e) => ({
          id: e.id,
          completed: new Set((recordedSets || []).filter(s => s.exercise_name === e.name && s.workout_executions.daily_workout_id === d.id && s.workout_executions.workout_date === (d.workout_date || d.date)).map(s=>s.set_number)).size >= Number(e.sets || 3),
          name: e.name,
          sets: e.sets,
          reps: e.reps_range || e.reps,
          rest_seconds: e.rest_seconds,
          video_url: e.video_url,
          gif_url: e.gif_url,
        })),
      })));
    } catch (e) {
      setFailed(true);
      console.error("[WeeklyTrainingView] fn_get_week_workouts", e);
    } finally { setLoading(false); }
  }, [athleteId, weekStartISO, weekEndISO, todayISO, initialDate]);

  useEffect(() => {
    setConfirmSkip(false);
    loadWeek();
    window.addEventListener("9fit:workout-updated", loadWeek);
    if (!athleteId) return;
    const channelName = `weekly-${athleteId}-${Math.random().toString(36).slice(2, 8)}`;
    const ch = supabase.channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_workouts", filter: `athlete_id=eq.${athleteId}` }, loadWeek)
      .on("postgres_changes", { event: "*", schema: "public", table: "workout_executions", filter: `athlete_id=eq.${athleteId}` }, loadWeek)
      .subscribe();
    return () => { window.removeEventListener("9fit:workout-updated", loadWeek); supabase.removeChannel(ch); };
  }, [athleteId, loadWeek]);

  const generateWeek = async () => {
    if (generating || phase !== "active" && phase !== "in_progress") return;
    setGenerating(true);
    try {
      const {data,error}=await supabase.rpc("fn_generate_periodized_week" as any,{p_athlete_id:athleteId,p_week_start:weekStartISO,p_days_week:null});
      if(error)throw error;
      const result=data as {success?:boolean;error?:string;generated?:number;preserved?:number}|null;
      if(!result?.success) throw new Error(result?.error === "no_active_periodization" ? "Não há uma periodização ativa para gerar esta semana." : "Não foi possível preparar a semana.");
      toast.success(`${result.generated ?? 0} sessões preparadas; ${result.preserved ?? 0} dias já existentes foram preservados.`);
      window.dispatchEvent(new Event("9fit:workout-updated"));
      await loadWeek();
    } catch(error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível preparar esta semana.");
    } finally { setGenerating(false); }
  };

  const skipToday = async (dailyWorkoutId:string) => {
    if(skipping)return;
    setSkipping(true);
    try {
      const {data,error}=await supabase.rpc("fn_skip_daily_workout_execution" as any,{p_daily_workout_id:dailyWorkoutId});
      if(error)throw error;
      if(!(data as {ok?:boolean}|null)?.ok)throw new Error("O treino não foi registrado como pulado.");
      toast.success("Treino de hoje marcado como não realizado. Sua prescrição foi mantida.");
      setConfirmSkip(false);
      window.dispatchEvent(new Event("9fit:workout-updated"));
      window.dispatchEvent(new Event("9fit:sync_updated"));
      await loadWeek();
    } catch(error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar o treino.");
    } finally { setSkipping(false); }
  };

  const moveWeek=(offset:number)=>{
    const next=addWeeks(weekStart,offset);
    if(isBefore(next,startOfWeek(addWeeks(currentWeekStart,-52),{weekStartsOn:1})))return;
    if(isBefore(addWeeks(currentWeekStart,12),next))return;
    setWeekStart(next);setSelectedDate(format(next,"yyyy-MM-dd"));setConfirmSkip(false);
  };

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
            {days.some(d=>d.date<=todayISO&&d.status!=="rest"&&d.exercises.length>0) && <> · Aderência {match}%</>}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-2">
        <button type="button" aria-label="Semana anterior" onClick={()=>moveWeek(-1)} className="rounded-lg border border-white/10 p-2"><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-xs font-semibold">{format(weekStart,"dd/MM")} – {format(addDays(weekStart,6),"dd/MM/yyyy")}</span>
        <button type="button" aria-label="Próxima semana" onClick={()=>moveWeek(1)} className="rounded-lg border border-white/10 p-2"><ChevronRight className="h-4 w-4" /></button>
      </div>
      {(phase === "active" || phase === "in_progress") && weekStartISO >= format(currentWeekStart,"yyyy-MM-dd") && (
        <button type="button" onClick={()=>void generateWeek()} disabled={generating} className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2.5 text-xs font-semibold text-primary disabled:opacity-50">
          {generating?<Loader2 className="h-4 w-4 animate-spin"/>:<CalendarPlus className="h-4 w-4"/>}
          {generating?"Preparando periodização…":"Completar programação da semana"}
        </button>
      )}

      {loading && (
        <div className="py-10 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}

      {!loading && failed && <div role="alert" className="text-sm"><p>Não foi possível atualizar os treinos da semana.</p><button className="text-primary" onClick={()=>void loadWeek()}>Tentar novamente</button></div>}
      {!loading && !failed && days.length>0 && <div className="flex items-center justify-between"><button aria-label="Dia anterior" disabled={selectedDay===0} onClick={()=>setSelectedDate(days[Math.max(0,selectedDay-1)]?.date || selectedDate)} className="rounded-lg border border-white/10 p-2 disabled:opacity-30"><ChevronLeft className="w-5 h-5"/></button><span className="text-sm">{days[selectedDay]?.day_label} · {selectedDay+1} de {days.length}</span><button aria-label="Próximo dia" disabled={selectedDay>=days.length-1} onClick={()=>setSelectedDate(days[Math.min(days.length-1,selectedDay+1)]?.date || selectedDate)} className="rounded-lg border border-white/10 p-2 disabled:opacity-30"><ChevronRight className="w-5 h-5"/></button></div>}
      {!loading && !failed && days.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-muted-foreground text-sm">
          Nenhum plano ativo encontrado para esta semana. Quando seu professor atribuir um treino, ele aparecerá aqui.
        </div>
      )}

      {!loading && !failed && days.map((d, i) => {
        if(i!==selectedDay)return null;
        const isToday = d.date === todayISO;
        const isDone = d.status === "completed";
        const isSkipped = d.status === "skipped";
        const isRest = d.status === "rest" && !!d.id;
        const isUnplanned = !d.id;
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
                    {isSkipped && <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[8px] font-mono font-bold tracking-wider uppercase border border-amber-500/30">PULADO</span>}
                  </div>

                  {/* Headline de Alto Impacto: tipografia robusta, clean, sem serafins */}
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white font-display leading-tight">
                    {isRest ? "Recuperação Ativa & Descanso" : isUnplanned ? "Sem treino prescrito" : `Sessão de Força ${d.day_label}`}
                  </h3>

                  {/* Descrição do Treino */}
                  <p className="text-xs text-neutral-400 mt-1.5 line-clamp-2 max-w-md font-normal leading-relaxed">
                    {isRest
                      ? "Dia planejado para regeneração miofascial, hidratação celular e adaptação neural dos ciclos anteriores."
                      : isUnplanned
                      ? "Não há uma prescrição vinculada a esta data. Confira o calendário ou peça ao seu profissional para programar o treino."
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
                          {new Date(`${d.date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                        </span>
                      </>
                    )}
                  </div>

                  {!isRest && !isUnplanned && (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={isDone || isSkipped || !isToday}
                      onClick={() => onExecuteToday(d)}
                      className="py-2 px-4 rounded-lg font-bold text-xs flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isDone ? "Concluído" : isSkipped ? "Não realizado" : !isToday ? "Dia programado" : d.status=== "in_progress" ? "Retomar treino" : "Executar Treino"}</span>
                    </button>
                    {isToday && d.status !== "in_progress" && !isDone && !isSkipped && d.id && <button type="button" onClick={()=>setConfirmSkip(true)} className="rounded-lg border border-amber-500/30 px-3 py-2 text-[10px] font-semibold text-amber-300"><CircleSlash className="mr-1 inline h-3.5 w-3.5"/>Não vou treinar</button>}
                    </div>
                  )}
                </div>
              </div>

              {/* Coluna Direita (5 cols): Grid de Itens / Exercícios com Checkmark no padrão da imagem */}
              <div className="p-4 sm:p-5 md:col-span-5 flex flex-col justify-center bg-black/20">
                {isRest || isUnplanned ? (
                  <div className="text-center py-4 text-neutral-500">
                    <p className="text-xs font-mono uppercase tracking-widest text-neutral-400">{isRest ? "DESCANSO PROGRAMADO" : "PRESCRIÇÃO AUSENTE"}</p>
                    <p className="text-sm text-neutral-300 mt-1">{isRest ? "Nenhum exercício programado" : "Esta data não tem treino cadastrado"}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2">
                    {d.exercises.map((e, j) => (
                      <button
                        key={j}
                        type="button"
                        disabled={isDone || !isToday}
                      onClick={() => onExecuteToday(d)}
                        className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-primary/40 transition-all text-left cursor-pointer group/item"
                      >
                        {/* Checkmark Laranja no padrão da imagem enviada */}
                        {e.completed ? <Check aria-label="Exercício concluído" className="w-3.5 h-3.5 text-primary shrink-0 stroke-[2.5]" /> : <Dumbbell aria-label="Exercício pendente" className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
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
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {confirmSkip && days[selectedDay]?.id && (
        <div role="alertdialog" aria-modal="true" aria-label="Confirmar treino não realizado" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold">Registrar este treino como não realizado?</p>
          <p className="mt-1 text-xs text-muted-foreground">A prescrição permanece no calendário. O registro não contará como treino concluído.</p>
          <div className="mt-3 flex gap-2"><button type="button" disabled={skipping} onClick={()=>void skipToday(days[selectedDay].id!)} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-black disabled:opacity-50">{skipping?"Salvando…":"Confirmar"}</button><button type="button" disabled={skipping} onClick={()=>setConfirmSkip(false)} className="rounded-lg border border-white/15 px-3 py-2 text-xs">Voltar</button></div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground text-center pt-2 flex items-center justify-center gap-1">
        <Calendar className="w-3 h-3" /> Ao concluir, o progresso e o Sync Score são atualizados
      </p>
    </div>
  );
}

