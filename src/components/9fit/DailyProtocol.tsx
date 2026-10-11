import { format } from "date-fns";
import { useAthleteId } from "@/hooks/useAthleteId";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Brain, Dumbbell, Apple, Wind, Check, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useUserState } from "@/hooks/useUserState";


interface Task {
  id: string;
  task_key: string;
  title: string;
  xp_reward: number;
  completed: boolean;
}

const DEFAULT_TASKS = [
  {
    key: "neural_prep",
    title: "Neural Prep",
    duration: "5 min",
    Icon: Brain,
    why: "Respiração guiada para começar o dia com presença e foco.",
  },
  {
    key: "elite_training",
    title: "Elite Training",
    duration: "45 min",
    Icon: Dumbbell,
    why: "Treino estruturado para avançar com consistência conforme seu plano.",
  },
  {
    key: "nutri_log",
    title: "Nutri-Log",
    duration: "2 min",
    Icon: Apple,
    why: "Registrar refeições ajuda você e o time a acompanharem sua rotina.",
  },
  {
    key: "recovery",
    title: "Recovery",
    duration: "8 min",
    Icon: Wind,
    why: "Mobilidade leve para cuidar do corpo e manter sua rotina.",
  },
] as const;

// Desafio extra opcional para Power Mode
const POWER_BONUS = {
  key: "power_bonus",
  title: "Bloco Extra",
  duration: "12 min",
  Icon: Flame,
  why: "Bloco opcional para quem quer adicionar movimento ao dia.",
} as const;

export function DailyProtocol() {
  const { user } = useAuth();
  const { athleteId } = useAthleteId();
  const [revision, setRevision] = useState(0);
  useEffect(() => { const refresh=()=>setRevision(n=>n+1); const events=["9fit:sync_updated","9fit:workout-updated","9fit:nutrition-updated"]; events.forEach(event=>window.addEventListener(event,refresh)); return ()=>events.forEach(event=>window.removeEventListener(event,refresh)); }, []);
  const { state, invalidate } = useUserState();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);


  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data } = await supabase
        .from("daily_tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("task_date", today);

      const { data: completions } = await supabase.from("master_registry").select("event_type,payload").eq("user_id", user.id).gte("created_at", `${today}T00:00:00${format(new Date(), "xxx")}`);
      const { count: meals } = athleteId ? await supabase.from("nutrition_logs").select("id", { count:"exact", head:true }).eq("athlete_id", athleteId).eq("date", today) : {count:0};
      const { count: workouts } = athleteId ? await supabase.from("workout_executions").select("id", { count:"exact", head:true }).eq("athlete_id", athleteId).eq("status","completed").eq("workout_date",today) : {count:0};
      const reflect = (list: Task[]) => list.map(task => ({...task,completed:task.completed || (task.task_key === "elite_training" && (!!workouts || (completions || []).some(e => ["workout_complete","workout_completed"].includes(e.event_type)))) || (task.task_key === "nutri_log" && (!!meals || (completions || []).some(e => e.event_type === "nutrition_checkin"))) || (task.task_key === "recovery" && (completions || []).some(e => e.event_type === "mobility_log"))}));
      const existing: Task[] = data || [];
      const missing = DEFAULT_TASKS.filter((d) => !existing.find((t) => t.task_key === d.key));
      if (missing.length) {
        await supabase.from("daily_tasks").insert(
          missing.map((m) => ({
            user_id: user.id,
            task_date: today,
            task_key: m.key,
            title: m.title,
            xp_reward: 25,
          }))
        );
        const { data: refreshed } = await supabase
          .from("daily_tasks")
          .select("*")
          .eq("user_id", user.id)
          .eq("task_date", today);
        const list: Task[] = refreshed || [];
        list.sort(
          (a, b) =>
            DEFAULT_TASKS.findIndex((d) => d.key === a.task_key) -
            DEFAULT_TASKS.findIndex((d) => d.key === b.task_key)
        );
        setTasks(reflect(list));
      } else {
        existing.sort(
          (a, b) =>
            DEFAULT_TASKS.findIndex((d) => d.key === a.task_key) -
            DEFAULT_TASKS.findIndex((d) => d.key === b.task_key)
        );
        setTasks(reflect(existing));
      }
      setLoading(false);
    })();
  }, [user?.id, athleteId, revision]);

  const complete = async (task: Task) => {
    if (task.completed || working) return;
    setWorking(task.id);
    const { error } = await supabase
      .from("daily_tasks")
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("id", task.id).eq("user_id", user!.id).select("id").single();
    if (error) {
      toast.error("Erro ao concluir");
      setWorking(null);
      return;
    }
    if (user?.id) {
      supabase
        .from("master_registry")
        .insert({
          user_id: user.id,
          event_type: "daily_protocol_step",
          source: "daily_protocol",
          payload: { task_key: task.task_key, title: task.title, xp: task.xp_reward },
        })
        .then(() => {});
    }
    const newTasks = tasks.map((t) => (t.id === task.id ? { ...t, completed: true } : t));
    setTasks(newTasks);
    toast.success("Conclusão registrada", { duration: 1600 });
    window.dispatchEvent(new Event("9fit:sync_updated"));
    setWorking(null);

    // Completing a protocol is an adherence event, not a physiological measurement.
    // Never manufacture a Sync score from UI task completion.
    const allDone = newTasks.every((t) => t.completed);
    if (allDone) {
      invalidate();
      window.dispatchEvent(new CustomEvent("9fit:protocol_completed", {
        detail: { kind: "adherence", completedTasks: newTasks.length },
      }));
    }
  };


  if (loading) {
    return <div className="h-48 rounded-2xl bg-white/[0.04] animate-pulse" />;
  }

  // Adaptive filtering: Low Mode = subset (Neural + Recovery), Power = + bonus
  let displayTasks = tasks;
  if (state === 'low') {
    displayTasks = tasks.filter((t) => t.task_key === 'neural_prep' || t.task_key === 'recovery');
  }
  const done = displayTasks.filter((t) => t.completed).length;
  const total = displayTasks.length + (state === 'power' ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between px-1">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-primary/80 font-data">
            INTERVENÇÕES FISIOLÓGICAS
            {state === 'low' && <span className="ml-2 text-amber-400/80">· LEVE</span>}
            {state === 'power' && <span className="ml-2 text-emerald-400/80">· PEAK</span>}
          </p>
          <h2 className="text-display text-base text-foreground mt-1">Protocolo do dia</h2>
        </div>
        <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-data">
          {done}/{total}
        </p>
      </div>

      {/* Grid sequencial compacto — uma linha por intervenção */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] divide-y divide-white/5 overflow-hidden">
        {displayTasks.map((task, idx) => {
          const def = DEFAULT_TASKS.find((d) => d.key === task.task_key) ?? DEFAULT_TASKS[idx];
          const Icon = def.Icon;
          return (
            <motion.button
              key={task.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.04 }}
              onClick={() => !task.completed && complete(task)}
              disabled={task.completed || working === task.id}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                task.completed ? "opacity-50" : "hover:bg-primary/5 active:bg-primary/10"
              }`}
            >
              <div className="shrink-0 w-7 text-[10px] font-data text-primary/70">
                {String(idx + 1).padStart(2, "0")}
              </div>
              <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                task.completed ? "bg-white/5" : "bg-primary/10 border border-primary/20"
              }`}>
                {task.completed ? (
                  <Check className="w-4 h-4 text-primary" />
                ) : (
                  <Icon className="w-4.5 h-4.5 text-primary" strokeWidth={1.6} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{def.title}</p>
                <p className="text-[11px] text-muted-foreground truncate">{def.why}</p>
              </div>
              <span className="shrink-0 text-[9px] tracking-[0.18em] uppercase text-muted-foreground font-data">
                {def.duration}
              </span>
            </motion.button>
          );
        })}

        {state === 'power' && (
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/[0.04]">
            <div className="shrink-0 w-7 text-[10px] font-data text-emerald-400/70">
              {String(displayTasks.length + 1).padStart(2, "0")}
            </div>
            <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-500/10 border border-emerald-500/30">
              <POWER_BONUS.Icon className="w-4.5 h-4.5 text-emerald-400" strokeWidth={1.6} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {POWER_BONUS.title} <span className="text-[9px] uppercase tracking-widest text-emerald-400/80">opcional</span>
              </p>
              <p className="text-[11px] text-muted-foreground truncate">{POWER_BONUS.why}</p>
            </div>
            <span className="shrink-0 text-[9px] tracking-[0.18em] uppercase text-muted-foreground font-data">
              {POWER_BONUS.duration}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

