import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Check, Zap, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [working, setWorking] = useState(false);

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
        // sort by DEFAULT_TASKS order
        const list = ((refreshed as any[]) || []) as Task[];
        list.sort((a, b) => DEFAULT_TASKS.findIndex(d => d.key === a.task_key) - DEFAULT_TASKS.findIndex(d => d.key === b.task_key));
        setTasks(list);
      } else {
        existing.sort((a, b) => DEFAULT_TASKS.findIndex(d => d.key === a.task_key) - DEFAULT_TASKS.findIndex(d => d.key === b.task_key));
        setTasks(existing);
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const completeCurrent = async () => {
    const current = tasks.find((t) => !t.completed);
    if (!current || working) return;
    setWorking(true);
    const { error } = await supabase
      .from("daily_tasks" as any)
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("id", current.id);
    if (error) {
      toast.error("Erro ao concluir");
      setWorking(false);
      return;
    }
    // log into master_registry (history) — fire and forget
    if (user?.id) {
      supabase.from("master_registry" as any).insert({
        user_id: user.id,
        event_type: "daily_protocol_step",
        source: "daily_protocol",
        payload: { task_key: current.task_key, title: current.title, xp: current.xp_reward },
      }).then(() => {});
    }
    setTasks((prev) => prev.map((t) => (t.id === current.id ? { ...t, completed: true } : t)));
    toast.success(`+${current.xp_reward} XP — ${current.title}`, { duration: 1600 });
    setTimeout(() => setWorking(false), 350);
  };

  if (loading) {
    return <div className="h-24 glass-mission rounded-xl animate-pulse" />;
  }

  const current = tasks.find((t) => !t.completed);
  const done = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const allDone = !current;

  return (
    <div className="glass-mission rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-data tracking-[0.3em] text-primary/80">DAILY PROTOCOL</p>
        <p className="text-[10px] font-data text-muted-foreground">{done}/{total}</p>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-3">
        <motion.div
          className="h-full bg-primary"
          initial={false}
          animate={{ width: `${(done / total) * 100}%` }}
          transition={{ type: "spring", stiffness: 90, damping: 18 }}
        />
      </div>

      <AnimatePresence mode="wait">
        {allDone ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/30"
          >
            <Sparkles className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-display text-foreground uppercase tracking-wide">Protocolo Completo</p>
              <p className="text-[10px] text-muted-foreground">Volte amanhã para a próxima sequência.</p>
            </div>
            <span className="text-[10px] font-data text-primary">+{done * 25} XP</span>
          </motion.div>
        ) : (
          <motion.button
            key={current.id}
            onClick={completeCurrent}
            disabled={working}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.28 }}
            whileTap={{ scale: 0.985 }}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-primary/30 bg-white/[0.03] hover:bg-primary/10 transition-colors text-left"
          >
            <div className="w-6 h-6 rounded-md flex items-center justify-center border border-primary/60 group-hover:bg-primary">
              <Check className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-data tracking-[0.25em] text-primary/80">
                ETAPA {done + 1}/{total}
              </p>
              <p className="text-sm text-foreground truncate">{current.title}</p>
            </div>
            <span className="flex items-center gap-0.5 text-[10px] font-data text-primary shrink-0">
              <Zap className="w-3 h-3" />+{current.xp_reward}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Mini history dots */}
      <div className="flex gap-1.5 mt-3 justify-center">
        {tasks.map((t) => (
          <span
            key={t.id}
            className={`h-1.5 rounded-full transition-all ${
              t.completed ? "w-6 bg-primary" : "w-3 bg-white/15"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
