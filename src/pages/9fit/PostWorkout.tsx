import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Flame, Trophy, TrendingUp, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function NineFitPostWorkout() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const xp = Number(params.get("xp") ?? 75);
  const [rpe, setRpe] = useState(7);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const stats = [
    { Icon: Flame, label: "Volume", value: "12.4 t", trend: "+8%" },
    { Icon: TrendingUp, label: "Performance", value: "94%", trend: "+3%" },
    { Icon: Heart, label: "FC média", value: "138 bpm", trend: "-2%" },
    { Icon: Trophy, label: "XP", value: `+${xp}`, trend: "" },
  ];

  const submit = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await supabase.from("sync_score_logs" as any).insert({
        user_id: user.id,
        score: rpe,
        feedback_text: `Pós-treino RPE ${rpe}`,
        source: "post_workout",
      });
      window.dispatchEvent(new CustomEvent("9fit:xp_awarded", { detail: { xp } }));
      toast.success(`RPE ${rpe} registrado · +${xp} XP`);
      setConfirmed(true);
      setTimeout(() => navigate("/9fit/train"), 1200);
    } catch (e) {
      toast.error("Erro ao salvar feedback");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-background pb-32 text-foreground">
      <div className="px-4 pt-6 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="text-[10px] font-data tracking-[0.4em] text-primary/80">PÓS-TREINO</p>
          <h1 className="text-2xl font-display tracking-tight">Treino concluído</h1>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-4 mt-6 rounded-3xl border border-primary/40 bg-primary/[0.06] p-6 text-center shadow-[0_30px_80px_-40px_hsl(var(--primary)/0.6)]"
      >
        <Trophy className="w-12 h-12 text-primary mx-auto" />
        <p className="text-3xl font-display mt-3">+{xp} XP</p>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mt-1">
          Sessão registrada na sua engrenagem
        </p>
      </motion.div>

      <div className="mx-4 mt-6 grid grid-cols-2 gap-3">
        {stats.map(({ Icon, label, value, trend }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <Icon className="w-4 h-4 text-primary" />
              {trend && <span className="text-emerald-400">{trend}</span>}
            </div>
            <p className="mt-2 text-xl font-bold">{value}</p>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest">{label}</p>
          </div>
        ))}
      </div>

      <div className="mx-4 mt-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Como foi seu esforço?</p>
        <div className="mt-3 flex items-center justify-between">
          {Array.from({ length: 10 }).map((_, i) => {
            const v = i + 1;
            const active = v <= rpe;
            return (
              <button
                key={v}
                onClick={() => setRpe(v)}
                className={`w-7 h-7 rounded-full text-[11px] font-semibold ${
                  active ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground"
                }`}
              >
                {v}
              </button>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>Tranquilo</span>
          <span>No limite</span>
        </div>
      </div>

      <button
        disabled={saving || confirmed}
        onClick={submit}
        className="mx-4 mt-8 w-[calc(100%-2rem)] rounded-full bg-primary text-primary-foreground py-4 font-bold tracking-widest uppercase disabled:opacity-50"
      >
        {confirmed ? "Salvo ✓" : saving ? "Salvando…" : "Concluir & Voltar"}
      </button>

      <BottomNavigation />
    </div>
  );
}
