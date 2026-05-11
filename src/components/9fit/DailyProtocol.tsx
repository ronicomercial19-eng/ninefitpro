import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Check, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface Task {
  id: string;
  task_key: string;
  title: string;
  xp_reward: number;
  completed: boolean;
}

const DEFAULT_TASKS = [
  { key: "neural_prep", title: "Neural Prep — hidratação + respiração" },
  { key: "elite_training", title: "Elite Training — treino do dia" },
  { key: "nutri_log", title: "Nutri-Log — registrar refeição principal" },
  { key: "recovery", title: "Recovery — alongamento ou mobilidade" },
];

export function DailyProtocol() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

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
        setTasks(((refreshed as any[]) || []) as Task[]);
      } else {
        setTasks(existing);
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const toggle = async (task: Task) => {
    if (task.completed) return;
    const { error } = await supabase
      .from("daily_tasks" as any)
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("id", task.id);
    if (error) {
      toast.error("Erro ao concluir tarefa");
      return;
    }
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: true } : t)));
    toast.success(`+${task.xp_reward} XP — ${task.title}`, { duration: 1800 });
  };

  if (loading) {
    return <div className="h-32 glass-mission rounded-xl animate-pulse" />;
  }

  return (
    <div className="glass-mission rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-data tracking-[0.3em] text-primary/80">DAILY PROTOCOL</p>
        <p className="text-[10px] font-data text-muted-foreground">
          {tasks.filter((t) => t.completed).length}/{tasks.length}
        </p>
      </div>
      <ul className="space-y-2">
        {tasks.map((t, i) => (
          <motion.li
            key={t.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <button
              onClick={() => toggle(t)}
              disabled={t.completed}
              className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left ${
                t.completed
                  ? "bg-primary/10 border-primary/40"
                  : "bg-white/[0.02] border-white/5 hover:border-primary/40"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                  t.completed ? "bg-primary border-primary text-primary-foreground" : "border-white/20"
                }`}
              >
                {t.completed && <Check className="w-3 h-3" />}
              </div>
              <span className={`flex-1 text-sm ${t.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {t.title}
              </span>
              <span className="flex items-center gap-0.5 text-[10px] font-data text-primary">
                <Zap className="w-3 h-3" />+{t.xp_reward}
              </span>
            </button>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
