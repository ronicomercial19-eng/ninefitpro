import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteId } from "@/hooks/useAthleteId";
import { toast } from "sonner";

type Q = { key: string; label: string; emojis: { e: string; v: number; l: string }[] };

const QUESTIONS: Q[] = [
  { key: "sleep", label: "Como foi seu sono?", emojis: [
    { e: "😵", v: 1, l: "péssimo" }, { e: "😪", v: 2, l: "ruim" },
    { e: "😐", v: 3, l: "ok" }, { e: "🙂", v: 4, l: "bom" }, { e: "😴", v: 5, l: "perfeito" }] },
  { key: "energy", label: "Sua energia agora?", emojis: [
    { e: "🪫", v: 1, l: "vazio" }, { e: "😮‍💨", v: 2, l: "baixa" },
    { e: "😌", v: 3, l: "ok" }, { e: "💪", v: 4, l: "forte" }, { e: "⚡", v: 5, l: "pico" }] },
  { key: "mood", label: "Seu humor hoje?", emojis: [
    { e: "😢", v: 1, l: "triste" }, { e: "😕", v: 2, l: "baixo" },
    { e: "😐", v: 3, l: "neutro" }, { e: "😊", v: 4, l: "bom" }, { e: "🤩", v: 5, l: "ótimo" }] },
  { key: "pain", label: "Alguma dor ou desconforto?", emojis: [
    { e: "🤕", v: 1, l: "muita" }, { e: "😣", v: 2, l: "média" },
    { e: "😶", v: 3, l: "leve" }, { e: "🙂", v: 4, l: "quase nada" }, { e: "✨", v: 5, l: "nenhuma" }] },
  { key: "motivation", label: "Motivação para treinar?", emojis: [
    { e: "😶‍🌫️", v: 1, l: "zero" }, { e: "😑", v: 2, l: "pouca" },
    { e: "🙂", v: 3, l: "média" }, { e: "🔥", v: 4, l: "alta" }, { e: "🚀", v: 5, l: "explosiva" }] },
];

const STORAGE_KEY = "9fit:emoji_quiz_date";

export function EmojiCalibrationQuiz({ onComplete }: { onComplete?: (score: number) => void }) {
  const { user } = useAuth();
  const { athleteId } = useAthleteId();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);
  const [completedToday, setCompletedToday] = useState(false);

  useEffect(() => {
    const last = localStorage.getItem(STORAGE_KEY);
    if (last === new Date().toDateString()) setCompletedToday(true);
  }, []);

  const handlePick = async (q: Q, v: number) => {
    const next = { ...answers, [q.key]: v };
    setAnswers(next);
    if (step < QUESTIONS.length - 1) {
      setTimeout(() => setStep(step + 1), 250);
    } else {
      // calcular score e persistir
      const total = Object.values(next).reduce((a, b) => a + b, 0);
      const score = Math.round((total / (QUESTIONS.length * 5)) * 100);
      try {
        if (user?.id) {
          await supabase.from("user_preferences" as any).upsert({
            user_id: user.id,
            daily_calibration: { ...next, score, date: new Date().toISOString() },
            updated_at: new Date().toISOString(),
          });
        }
        if (athleteId) {
          await supabase.from("bio_recovery_state" as any).insert({
            athlete_id: athleteId,
            score,
            recorded_at: new Date().toISOString(),
            source: "emoji_quiz",
          });
        }
      } catch (e) { /* tabela opcional */ }
      localStorage.setItem(STORAGE_KEY, new Date().toDateString());
      setDone(true);
      onComplete?.(score);
      toast.success(`Sync calibrada: ${score}%`);
      window.dispatchEvent(new CustomEvent("9fit:sync_updated", { detail: { score } }));
    }
  };

  if (completedToday || done) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/[0.05] p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/20 grid place-items-center">
          <Check className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-primary font-bold">Sync calibrada hoje</p>
          <p className="text-xs text-muted-foreground">Volte amanhã para recalibrar o sistema.</p>
        </div>
      </div>
    );
  }

  const q = QUESTIONS[step];

  return (
    <div className="rounded-2xl border border-primary/30 bg-card/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Calibração diária</p>
        <p className="text-[10px] text-muted-foreground font-data">{step + 1}/{QUESTIONS.length}</p>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={q.key}
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}>
          <p className="font-display text-lg mb-4">{q.label}</p>
          <div className="flex justify-between gap-2">
            {q.emojis.map((opt) => (
              <button key={opt.v} onClick={() => handlePick(q, opt.v)}
                className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border border-white/10 hover:border-primary/60 hover:bg-primary/10 transition">
                <span className="text-2xl">{opt.e}</span>
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{opt.l}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="mt-3 h-1 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }} />
      </div>
    </div>
  );
}
