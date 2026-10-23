import { useState } from "react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Check, Plus, Target, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useStudentHabits } from "@/hooks/useStudentHabits";

export default function HabitFlowPage() {
  const { habits, loading, busy, error, reload, toggle, add, remove, importLegacy } = useStudentHabits();
  const [newHabit, setNewHabit] = useState("");
  const addHabit = async () => {
    if (!newHabit.trim() || busy) return;
    if (await add(newHabit)) setNewHabit("");
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
        {error && <div role="alert"><p>Não foi possível carregar seus hábitos.</p><button onClick={() => void reload()}>Tentar novamente</button></div>}
        {!loading && !error && habits.length === 0 && <p className="text-sm text-muted-foreground">Adicione seu primeiro hábito. As conclusões serão salvas por dia.</p>}
        {loading ? (
          <div className="h-20 glass-mission rounded-xl animate-pulse" />
        ) : (
          habits.map((h) => (
            <button
              key={h.id}
              disabled={busy}
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
          <Button disabled={busy || !newHabit.trim()} onClick={addHabit} size="sm" className="shrink-0">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {habits.length > 0 && <details className="mx-4 mb-4"><summary className="text-sm text-muted-foreground">Gerenciar hábitos</summary>{habits.map(h => <button key={h.id} disabled={busy} className="block py-2 text-sm text-muted-foreground" onClick={() => { if(window.confirm(`Excluir o hábito “${h.title}” e suas marcações?`)) void remove(h.id); }}>Excluir {h.title}</button>)}</details>}
      <button disabled={busy} onClick={()=>void importLegacy()} className="mx-4 mb-6 text-xs text-muted-foreground underline">Recuperar hábitos antigos desta conta neste navegador</button>
      <BottomNavigation />
    </div>
  );
}
