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
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: true } : t)));
    toast.success(`Protocolo registrado · +${task.xp_reward} XP`, { duration: 1600 });
    setWorking(null);
  };

  if (loading) {
    return <div className="h-48 rounded-2xl bg-white/[0.04] animate-pulse" />;
  }

  const done = tasks.filter((t) => t.completed).length;
  const total = tasks.length;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between px-1">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-primary/80 font-data">
            DAILY PROTOCOL
          </p>
          <h2 className="text-display text-xl text-foreground mt-1">
            Intervenções fisiológicas do dia
          </h2>
        </div>
        <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-data">
          {done}/{total}
        </p>
      </div>

      <div className="space-y-3">
        {tasks.map((task, idx) => {
          const def = DEFAULT_TASKS.find((d) => d.key === task.task_key) ?? DEFAULT_TASKS[idx];
          const Icon = def.Icon;
          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.06 }}
              className={`relative rounded-2xl p-5 border backdrop-blur-xl transition-colors ${
                task.completed
                  ? "bg-white/[0.02] border-white/[0.04] opacity-60"
                  : "bg-white/[0.04] border-white/[0.08]"
              }`}
              style={!task.completed ? { boxShadow: "var(--shadow-card)" } : undefined}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                    task.completed ? "bg-white/5" : "bg-primary/10 border border-primary/20"
                  }`}
                >
                  {task.completed ? (
                    <Check className="w-5 h-5 text-primary" />
                  ) : (
                    <Icon className="w-6 h-6 text-primary" strokeWidth={1.6} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-display text-base text-foreground">{def.title}</h3>
                    <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground font-data">
                      {def.duration}
                    </span>
                  </div>
                  <p className="text-[10px] tracking-[0.18em] uppercase text-primary/70 font-data mb-1.5">
                    POR QUÊ
                  </p>
                  <p className="text-[13px] text-muted-foreground italic leading-relaxed mb-4">
                    {def.why}
                  </p>
                  {!task.completed && (
                    <button
                      onClick={() => complete(task)}
                      disabled={working === task.id}
                      className="text-[11px] tracking-[0.2em] uppercase font-data text-primary hover:underline disabled:opacity-50"
                    >
                      {working === task.id ? "Registrando..." : "Iniciar intervenção →"}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
