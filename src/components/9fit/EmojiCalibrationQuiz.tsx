import { ReadinessCard } from './ReadinessCard';
import { withTimeout } from '@/lib/withTimeout';
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAthleteId } from "@/hooks/useAthleteId";
import { toast } from "sonner";
import { businessDate, fetchDailyContext } from '@/services/dailyContext';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

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
  return businessDate();
}

export function EmojiCalibrationQuiz({ onComplete }: { onComplete?: (score: number | null) => void }) {
  const { athleteId } = useAthleteId();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const today = todayISO();
  const savingRef=useRef(false);
  const actor=useRef(athleteId);actor.current=athleteId;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [painLocation,setPainLocation]=useState('');
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completedToday, setCompletedToday] = useState(false);

  // Only a complete calibration counts; old mood-only rows remain pending.
  useEffect(() => {
    savingRef.current=false;setSaving(false);setPainLocation('');
    setCompletedToday(false); setDone(false); setStep(0); setAnswers({});
    if (!athleteId) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("daily_checkins")
        .select("id,sono,energia,humor,motivacao,dor")
        .eq("athlete_id", athleteId)
        .eq("checkin_date", today)
        .maybeSingle();
      if (active && data && [data.sono,data.energia,data.humor,data.motivacao,data.dor].every(value => value !== null)) setCompletedToday(true);
    })();
    return () => { active = false; };
  }, [athleteId, today]);

  const handlePick = async (q: Q, v: number) => {
    if (saving || savingRef.current) return;
    const next = { ...answers, [q.key]: v };
    setAnswers(next);
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
      return;
    }

    if (!athleteId) {
      toast.error("Não foi possível identificar seu perfil. Tente novamente.");
      return;
    }

    if(next.pain<=3&&!painLocation.trim()){toast.error('Informe onde sente o desconforto antes de salvar.');return;}
    const owner=athleteId;
    savingRef.current=true;setSaving(true);
    try {
      const {error}=await withTimeout(supabase.from("daily_checkins").upsert(
      {
        athlete_id: athleteId,
        checkin_date: todayISO(),
        sono: next.sleep,
        energia: next.energy,
        humor: next.mood,
        motivacao: next.motivation,
        // escala do banco: 1 = pouca dor, 5 = muita dor (inverso do quiz)
        dor: 6 - next.pain,
        dor_local: next.pain === 5 ? null : painLocation.trim() || null,
      },
      { onConflict: "athlete_id,checkin_date" }
    ));
      if(actor.current!==owner)return;
      if(error)throw error;
    } catch {
      if(actor.current===owner){savingRef.current=false;setSaving(false);toast.error('Não foi possível confirmar o check-in. Suas respostas continuam aqui; tente salvar novamente.');}
      return;
    }

    let score: number | null = null;
    try {
      const context = await fetchDailyContext();
      if(actor.current!==owner)return;
      score = context.sync.value;
      queryClient.setQueryData(['daily-context', user?.id], context);
    } catch {
      void queryClient.resetQueries({ queryKey: ['daily-context', user?.id] });
    }
    if(actor.current!==owner)return;
    savingRef.current=false;setSaving(false);
    try { localStorage.setItem(STORAGE_KEY, businessDate()); } catch { /* Storage is optional. */ }
    setDone(true);
    onComplete?.(score);
    toast.success(score === null ? 'Calibração salva. A leitura será atualizada ao reconectar.' : `SYNC atualizada: ${score}/100`);
    window.dispatchEvent(new CustomEvent("9fit:sync_updated", { detail: { score } }));
  };

  if (completedToday || done) {
    return (
      <div className="space-y-3"><div className="rounded-2xl border border-primary/30 bg-primary/[0.05] p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/20 grid place-items-center">
          <Check className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-primary font-bold">SYNC atualizada hoje</p>
          <p className="text-xs text-muted-foreground">Seus cinco sinais estão salvos. Atualize se algo mudar.</p>
          <button type="button" className="mt-2 text-xs text-primary underline" onClick={() => { setCompletedToday(false); setDone(false); setStep(0); setAnswers({}); }}>Meus sinais mudaram · atualizar</button>
        </div>
      </div>{athleteId&&<ReadinessCard athleteId={athleteId}/>}</div>
    );
  }

  const q = QUESTIONS[step];

  return (
    <div className="rounded-2xl border border-primary/30 bg-card/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Check-in diário</p>
        <p className="text-[10px] text-muted-foreground font-data">{step + 1}/{QUESTIONS.length}</p>
      </div>
      {answers.pain<=3&&<label className="mb-3 block space-y-2 text-sm">Onde está o desconforto?<input value={painLocation} maxLength={200} onChange={e=>setPainLocation(e.target.value)} className="w-full rounded-xl border border-primary/25 bg-background p-3" placeholder="Ex.: joelho direito"/></label>}
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
