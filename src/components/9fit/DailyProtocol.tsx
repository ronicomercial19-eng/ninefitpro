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
    why: "Seu sistema mostrou sobrecarga simpática nas últimas 48h. Respiração diafragmática reduz cortisol e prepara o córtex para foco.",
  },
  {
    key: "elite_training",
    title: "Elite Training",
    duration: "45 min",
    Icon: Dumbbell,
    why: "Janela hormonal ótima detectada. Treino de força agora maximiza síntese proteica e adaptação neuromuscular.",
  },
  {
    key: "nutri_log",
    title: "Nutri-Log",
    duration: "2 min",
    Icon: Apple,
    why: "Densidade calórica abaixo da meta. Registrar refeição alimenta o motor de recomendação e fecha o loop metabólico do dia.",
  },
  {
    key: "recovery",
    title: "Recovery",
    duration: "8 min",
    Icon: Wind,
    why: "Tensão muscular acumulada em cadeia posterior. Mobilidade ativa restaura amplitude e acelera recuperação parassimpática.",
  },
] as const;

// Desafio extra opcional para Power Mode
const POWER_BONUS = {
  key: "power_bonus",
  title: "Bloco Extra",
  duration: "12 min",
  Icon: Flame,
  why: "Sinais indicam capacidade de absorver mais carga hoje. Bloco extra opcional para aproveitar a janela hormonal.",
} as const;

export function DailyProtocol() {
  const { user } = useAuth();
  const { state, invalidate } = useUserState();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);


  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("daily_tasks" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("task_date", today);

      const existing = ((data as any[]) || []) as Task[];
      const missing = DEFAULT_TASKS.filter((d) => !existing.find((t) => t.task_key === d.key));
      if (missing.length) {
        await supabase.from("daily_tasks" as any).insert(
          missing.map((m) => ({
            user_id: user.id,
            task_key: m.key,
            title: m.title,
            xp_reward: 25,
          }))
        );
        const { data: refreshed } = await supabase
          .from("daily_tasks" as any)
          .select("*")
          .eq("user_id", user.id)
          .eq("task_date", today);
        const list = ((refreshed as any[]) || []) as Task[];
        list.sort(
          (a, b) =>
            DEFAULT_TASKS.findIndex((d) => d.key === a.task_key) -
            DEFAULT_TASKS.findIndex((d) => d.key === b.task_key)
        );
        setTasks(list);
      } else {
        existing.sort(
          (a, b) =>
            DEFAULT_TASKS.findIndex((d) => d.key === a.task_key) -
            DEFAULT_TASKS.findIndex((d) => d.key === b.task_key)
        );
        setTasks(existing);
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const complete = async (task: Task) => {
    if (task.completed || working) return;
    setWorking(task.id);
    const { error } = await supabase
      .from("daily_tasks" as any)
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("id", task.id);
    if (error) {
      toast.error("Erro ao concluir");
      setWorking(null);
      return;
    }
    if (user?.id) {
      supabase
        .from("master_registry" as any)
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
    toast.success(`Protocolo registrado · +${task.xp_reward} XP`, { duration: 1600 });
    setWorking(null);

    // CLOSE LOOP: ao completar todos → grava sync_score_log + dispara RON + auto-navega
    const allDone = newTasks.every((t) => t.completed);
    if (allDone && user?.id) {
      const avgScore = state === 'power' ? 8.2 : state === 'low' ? 5.5 : 7;
      await supabase.from('sync_score_logs' as any).insert({
        user_id: user.id,
        score: avgScore,
        feedback_text: `Daily Protocol completo (${newTasks.length} intervenções).`,
        source: 'daily_protocol_complete',
      });
      invalidate();
      window.dispatchEvent(new CustomEvent('9fit:protocol_completed', { detail: { score: avgScore, state } }));
      // Auto-abre RON após pequeno delay para usuário absorver o toast
      setTimeout(() => {
        window.location.assign(`/9fit/ron?auto=1&context=protocol_complete&state=${state}`);
      }, 1400);
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
