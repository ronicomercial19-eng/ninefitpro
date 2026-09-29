import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

function todayISO() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function EmojiCalibrationQuiz({ onComplete }: { onComplete?: (score: number) => void }) {
  const { athleteId } = useAthleteId();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completedToday, setCompletedToday] = useState(false);

  // Fonte da verdade: daily_checkins (não só localStorage)
  useEffect(() => {
    if (!athleteId) return;
    (async () => {
      const { data } = await supabase
        .from("daily_checkins")
        .select("id")
        .eq("athlete_id", athleteId)
        .eq("checkin_date", todayISO())
        .maybeSingle();
      if (data?.id) setCompletedToday(true);
    })();
  }, [athleteId]);

  const handlePick = async (q: Q, v: number) => {
    if (saving) return;
    const next = { ...answers, [q.key]: v };
    setAnswers(next);
    if (step < QUESTIONS.length - 1) {
      setTimeout(() => setStep(step + 1), 250);
      return;
    }

    if (!athleteId) {
      toast.error("Não foi possível identificar seu perfil. Tente novamente.");
      return;
    }

    setSaving(true);
    const quizScore = Math.round((Object.values(next).reduce((a, b) => a + b, 0) / (QUESTIONS.length * 5)) * 100);
    const { error } = await supabase.from("daily_checkins").upsert(
      {
        athlete_id: athleteId,
        checkin_date: todayISO(),
        sono: next.sleep,
        energia: next.energy,
        humor: next.mood,
        // escala do banco: 1 = pouca dor, 5 = muita dor (inverso do quiz)
        dor: 6 - next.pain,
        motivacao: next.motivation,
      },
      { onConflict: "athlete_id,checkin_date" }
    );
    setSaving(false);

    if (error) {
      console.error("[EmojiCalibrationQuiz] daily_checkins", error);
      toast.error("Não consegui salvar seu check-in. Tente de novo.");
      setStep(0);
      setAnswers({});
      return;
    }

    // O trigger recalcula o sync; lê o valor real gravado
    const { data: ath } = await supabase.from("athletes").select("sync_score").eq("id", athleteId).maybeSingle();
    const score = Math.round(Number(ath?.sync_score ?? quizScore));

    localStorage.setItem(STORAGE_KEY, new Date().toDateString());
    setDone(true);
    onComplete?.(score);
    toast.success(`SYNC atualizada: ${score}%`);
    window.dispatchEvent(new CustomEvent("9fit:sync_updated", { detail: { score } }));
  };

  if (completedToday || done) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/[0.05] p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/20 grid place-items-center">
          <Check className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-primary font-bold">SYNC atualizada hoje</p>
          <p className="text-xs text-muted-foreground">Volte amanhã para fazer um novo check-in.</p>
        </div>
      </div>
    );
  }

  const q = QUESTIONS[step];

  return (
    <div className="rounded-2xl border border-primary/30 bg-card/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Check-in diário</p>
        <p className="text-[10px] text-muted-foreground font-data">{step + 1}/{QUESTIONS.length}</p>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={q.key}
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}>
          <p className="font-display text-lg mb-4">{q.label}</p>
          <div className="flex justify-between gap-2">
            {q.emojis.map((opt) => (
              <button key={opt.v} disabled={saving} onClick={() => handlePick(q, opt.v)}
                className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border border-white/10 hover:border-primary/60 hover:bg-primary/10 transition disabled:opacity-50">
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
