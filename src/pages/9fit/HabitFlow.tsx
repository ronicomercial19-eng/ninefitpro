import { useEffect, useState } from "react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Check, Plus, Target, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Habit { id: string; title: string; streak: number; today_done: boolean; target_per_week: number; }

export default function HabitFlowPage() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newHabit, setNewHabit] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const stored = localStorage.getItem(`9fit.habits.${user.id}`);
    if (stored) {
      try { setHabits(JSON.parse(stored)); } catch {}
    } else {
      setHabits([
        { id: "1", title: "Hidratação 2L", streak: 0, today_done: false, target_per_week: 7 },
        { id: "2", title: "Treino do dia", streak: 0, today_done: false, target_per_week: 5 },
        { id: "3", title: "Sono 7h+", streak: 0, today_done: false, target_per_week: 7 },
      ]);
    }
    setLoading(false);
  }, [user?.id]);

  const persist = (next: Habit[]) => {
    setHabits(next);
    if (user?.id) localStorage.setItem(`9fit.habits.${user.id}`, JSON.stringify(next));
  };

  const toggle = (id: string) => {
    const next = habits.map((h) =>
      h.id === id
        ? { ...h, today_done: !h.today_done, streak: !h.today_done ? h.streak + 1 : Math.max(0, h.streak - 1) }
        : h
    );
    persist(next);
    const h = next.find((x) => x.id === id);
    if (h?.today_done) {
      toast.success(`+1 dia · ${h.title}`);
      if (user?.id) {
        supabase.from("master_registry" as any).insert({
          user_id: user.id,
          event_type: "habit_check",
          source: "habit_flow",
          payload: { habit: h.title, streak: h.streak },
        }).then(() => {});
      }
    }
  };

  const addHabit = () => {
    if (!newHabit.trim()) return;
    persist([...habits, { id: crypto.randomUUID(), title: newHabit.trim(), streak: 0, today_done: false, target_per_week: 5 }]);
    setNewHabit("");
  };

  const adherence = habits.length
    ? Math.round((habits.filter((h) => h.today_done).length / habits.length) * 100)
    : 0;

  return (
    <div className="min-h-screen gradient-mission pb-28">
      <div className="px-4 pt-6 pb-3">
        <p className="text-[10px] font-data tracking-[0.4em] text-primary/80">9FIT // METAS</p>
        <h1 className="text-massive text-4xl text-foreground mt-1">Habit Flow</h1>
        <p className="text-xs text-muted-foreground mt-1">Gerencie hábitos e adesão diária.</p>
      </div>

      <div className="px-4 mb-4">
        <div className="glass-mission rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-data tracking-widest text-muted-foreground">ADESÃO HOJE</span>
            <span className="text-massive text-2xl text-primary">{adherence}%</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary/70 to-primary"
              initial={{ width: 0 }}
              animate={{ width: `${adherence}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>
      </div>

      <div className="px-4 space-y-2 mb-4">
        {loading ? (
          <div className="h-20 glass-mission rounded-xl animate-pulse" />
        ) : (
          habits.map((h) => (
            <button
              key={h.id}
              onClick={() => toggle(h.id)}
              className={`w-full glass-mission rounded-xl p-3 flex items-center gap-3 text-left transition-all ${
                h.today_done ? "border border-primary/40 bg-primary/5" : "border border-white/5"
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${h.today_done ? "bg-primary text-primary-foreground" : "bg-white/5 text-primary"}`}>
                {h.today_done ? <Check className="w-4 h-4" /> : <Target className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{h.title}</p>
                <p className="text-[10px] text-muted-foreground">Meta: {h.target_per_week}x/semana</p>
              </div>
              <div className="flex items-center gap-1 text-primary text-xs font-data">
                <Flame className="w-3 h-3" /> {h.streak}d
              </div>
            </button>
          ))
        )}
      </div>

      <div className="px-4 mb-4">
        <div className="glass-mission rounded-xl p-3 flex gap-2">
          <Input
            value={newHabit}
            onChange={(e) => setNewHabit(e.target.value)}
            placeholder="Novo hábito..."
            className="bg-transparent border-white/10"
          />
          <Button onClick={addHabit} size="sm" className="shrink-0">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
