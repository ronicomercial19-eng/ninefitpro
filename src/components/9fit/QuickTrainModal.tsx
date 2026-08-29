import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Play, Lock, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAthleteId } from "@/hooks/useAthleteId";

type Step = 0 | 1 | 2 | 3;
type Answers = { goal: string; time: string; equipment: string };

const QS = [
  { key: "goal", label: "Qual seu objetivo agora?", opts: [
    { v: "fatburn", l: "Queimar gordura" },
    { v: "strength", l: "Ganhar força" },
    { v: "mobility", l: "Recuperação / mobilidade" },
    { v: "cardio", l: "Cardio rápido" }] },
  { key: "time", label: "Quanto tempo você tem?", opts: [
    { v: "15", l: "15 min" }, { v: "30", l: "30 min" }, { v: "45", l: "45 min" }, { v: "60", l: "1 hora" }] },
  { key: "equipment", label: "Onde vai treinar?", opts: [
    { v: "home", l: "Casa (sem equipamento)" },
    { v: "home_basic", l: "Casa (halteres / elásticos)" },
    { v: "gym", l: "Academia completa" },
    { v: "outdoor", l: "Ar livre" }] },
];

type Exercise = {
  id: string;
  name: string;
  video_url?: string | null;
  gif_url?: string | null;
  target_muscles?: string[] | null;
  sets?: number | string | null;
  reps_range?: string | null;
  rest_seconds?: number | null;
};

type Modelo = { name?: string; objective?: string; stimulus?: string };

// FIX #32 (QA Master): nunca deixar o loading de geração girar pra sempre.
const GENERATION_TIMEOUT_MS = 20000;

export function QuickTrainModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { athleteId } = useAthleteId();
  const [step, setStep] = useState<Step>(0);
  const [answers, setAnswers] = useState<Answers>({ goal: "", time: "", equipment: "" });
  const [loading, setLoading] = useState(false);
  const [genError, setGenError] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [infoproduct, setInfoproduct] = useState<any>(null);
  const [offerSeen, setOfferSeen] = useState(false);
  const [showingOffer, setShowingOffer] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  // FIX #6/#30 (QA Master): "Treino Rápido" dava XP garantido no clique de
  // "Concluir treino", sem nenhuma evidência de execução real. Agora exige
  // marcar cada exercício como feito antes de liberar o botão.
  const [done, setDone] = useState<Record<number, boolean>>({});
  const [completing, setCompleting] = useState(false);

  const reset = () => {
    setStep(0); setAnswers({ goal: "", time: "", equipment: "" });
    setExercises([]); setModelos([]); setInfoproduct(null); setOfferSeen(false); setShowingOffer(false);
    setExecutionId(null); setDone({}); setGenError(false);
  };

  const pick = async (k: keyof Answers, v: string) => {
    const next = { ...answers, [k]: v };
    setAnswers(next);
    if (step < 2) setStep((step + 1) as Step);
    else await resolve(next);
  };

  const resolve = async (a: Answers) => {
    if (!athleteId) { toast.error("Perfil de atleta não encontrado"); return; }
    setLoading(true);
    setGenError(false);
    try {
      // 1) Oferta antes do treino (não bloqueia)
      const { data: prod } = await supabase
        .from("monetization_offers" as any)
        .select("*")
        .eq("active", true)
        .or(`slug.eq.audience_49,goal.eq.${a.goal}`)
        .limit(1)
        .maybeSingle();
      setInfoproduct(prod);

      // 2) TREINO RÁPIDO via RPC canônica (Bloco A) — com timeout (fix #32)
      const rpcPromise = supabase.rpc("fn_treino_rapido" as any, {
        p_athlete_id: athleteId,
        p_objetivo: a.goal,
        p_tempo_min: parseInt(a.time, 10),
        p_equipamento: a.equipment,
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), GENERATION_TIMEOUT_MS)
      );
      const { data, error }: any = await Promise.race([rpcPromise, timeoutPromise]);
      if (error) throw error;

      const payload: any = data || {};
      const exList = (payload.exercises || payload.exercicios || []) as Exercise[];
      setModelos((payload.modelos || []) as Modelo[]);
      setExercises(exList);
      setDone({});

      if (exList.length === 0) {
        setStep(3);
        setLoading(false);
        return;
      }

      // Insere workout_executions in_progress (start) e guarda o id pra
      // vincular as séries reais depois.
      try {
        const { data: created } = await supabase.from("workout_executions" as any).insert({
          athlete_id: athleteId,
          workout_date: new Date().toISOString().split("T")[0],
          phase_name: "quick",
          status: "in_progress",
          started_at: new Date().toISOString(),
        } as any).select("id").single();
        setExecutionId((created as any)?.id ?? null);
      } catch (e) { console.warn("[QuickTrain] start insert", e); }

      setShowingOffer(!!prod);
      setStep(3);
    } catch (e: any) {
      console.error("[QuickTrain] fn_treino_rapido:", e);
      setGenError(true);
    } finally {
      setLoading(false);
    }
  };

  const toggleDone = (idx: number) => setDone((d) => ({ ...d, [idx]: !d[idx] }));

  const allDone = exercises.length > 0 && exercises.every((_, i) => done[i]);

  const completeWorkout = async () => {
    setCompleting(true);
    try {
      if (athleteId && executionId) {
        // FIX #7 (QA Master): grava as séries reais marcadas antes de fechar
        const checkedExercises = exercises.filter((_, i) => done[i]);
        if (checkedExercises.length > 0) {
          await supabase.from("workout_exercise_sets" as any).insert(
            checkedExercises.map((e, idx) => ({
              execution_id: executionId,
              exercise_name: e.name,
              exercise_order: idx,
              set_number: 1,
              completed: true,
            }))
          );
        }

        await supabase.from("workout_executions" as any)
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            duration_minutes: parseInt(answers.time, 10) || 30,
            notes: `quick_workout · ${answers.goal} · ${answers.equipment}`,
          } as any)
          .eq("id", executionId);

        // FIX #6/#30: fn_award_workout_xp só libera XP com set real
        // registrado — trava idêntica à do fluxo principal de treino.
        const { data: awardResult } = await supabase.rpc("fn_award_workout_xp" as any, {
          p_execution_id: executionId,
          p_amount: 50,
        });
        const result = Array.isArray(awardResult) ? awardResult[0] : awardResult;
        if (result?.awarded) {
          toast.success("Treino concluído! +50 XP");
        } else {
          toast.info("Treino salvo. Marque os exercícios feitos pra receber XP na próxima.");
        }
      }
    } catch (e) {
      console.error("[QuickTrain] complete:", e);
      toast.error("Não foi possível concluir o treino agora.");
    } finally {
      setCompleting(false);
    }
    onClose(); reset();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="w-full max-w-md rounded-3xl border border-primary/40 bg-card p-5 max-h-[90vh] overflow-y-auto"
          initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Treino Rápido</p>
              <p className="font-display text-xl">Monte em 10s</p>
            </div>
            <button onClick={() => { onClose(); reset(); }} className="w-8 h-8 rounded-lg border border-white/10 grid place-items-center">
              <X className="w-4 h-4" />
            </button>
          </div>

          {loading && (
            <div className="py-10 flex flex-col items-center text-muted-foreground gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-sm">Montando seu treino...</p>
            </div>
          )}

          {/* FIX #32 (QA Master): estado de erro com retry em vez de spinner infinito */}
          {!loading && genError && (
            <div className="py-8 text-center space-y-4">
              <p className="text-sm text-muted-foreground">Não conseguimos montar seu treino agora. Tenta de novo?</p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => { setGenError(false); setStep(0); }}
                  className="rounded-full border border-white/15 text-foreground px-4 py-2 text-xs font-bold">
                  Refazer perguntas
                </button>
                <button onClick={() => resolve(answers)}
                  className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-bold">
                  Tentar novamente
                </button>
              </div>
            </div>
          )}

          {!loading && !genError && step < 3 && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-2">Pergunta {step + 1} de 3</p>
              <p className="font-display text-lg mb-4">{QS[step].label}</p>
              <div className="space-y-2">
                {QS[step].opts.map((o) => (
                  <button key={o.v} onClick={() => pick(QS[step].key as keyof Answers, o.v)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.02] py-3 px-4 text-left hover:border-primary/60 hover:bg-primary/[0.06] transition">
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && !genError && step === 3 && showingOffer && !offerSeen && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-1">Oferta para seu objetivo</p>
              <p className="font-display text-lg mb-3">Aceleramos sua meta de {answers.goal}</p>
              <div className="rounded-2xl border border-primary/40 bg-primary/[0.06] p-4 mb-4">
                <p className="font-display text-lg">{infoproduct?.title || "Protocolo Personalizado"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {infoproduct?.description || "Plano completo com vídeos, progressão semanal e ajustes pelo PDI."}
                </p>
                <p className="font-data text-primary text-2xl mt-3">
                  R$ {((infoproduct?.price_cents ?? infoproduct?.price ?? 4900) / (infoproduct?.price_cents ? 100 : 1)).toFixed(0)}
                  <span className="text-xs text-muted-foreground">/mês</span>
                </p>
              </div>
              <div className="space-y-2">
                <a href="https://buy.stripe.com/test_4gMfZg0NK3gn2NMahkgbm03" target="_blank" rel="noreferrer"
                  className="w-full rounded-full bg-primary text-primary-foreground font-bold py-3 flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4" /> Quero conhecer
                </a>
                <button onClick={() => { setOfferSeen(true); setShowingOffer(false); }}
                  className="w-full rounded-full border border-white/15 bg-transparent text-foreground py-3 text-sm hover:bg-white/[0.04]">
                  Agora não — liberar treino do dia
                </button>
              </div>
            </div>
          )}

          {!loading && !genError && step === 3 && !showingOffer && exercises.length > 0 && (
            <div>
              {modelos.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Modelo</p>
                  <p className="font-display text-base">{modelos[0]?.name || "Treino personalizado"}</p>
                  <p className="text-xs text-muted-foreground">{modelos[0]?.stimulus || modelos[0]?.objective}</p>
                </div>
              )}
              <p className="font-display text-lg mb-1">Seu treino está pronto</p>
              <p className="text-xs text-muted-foreground mb-3">{exercises.length} exercícios • {answers.time} min · marque cada um ao terminar</p>
              <ul className="space-y-2 mb-4 max-h-72 overflow-y-auto">
                {exercises.map((e, i) => (
                  <li key={e.id || i}
                    onClick={() => toggleDone(i)}
                    className={`rounded-xl border p-3 flex items-center gap-3 cursor-pointer transition ${
                      done[i] ? "border-primary/50 bg-primary/[0.08]" : "border-white/10 bg-white/[0.02]"
                    }`}>
                    <span className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold shrink-0 ${
                      done[i] ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"
                    }`}>
                      {done[i] ? <Check className="w-4 h-4" /> : i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{e.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {(e.sets || "3")}×{e.reps_range || "10-12"}{e.rest_seconds ? ` · ${e.rest_seconds}s` : ""}
                        {e.target_muscles?.length ? ` · ${e.target_muscles.slice(0,2).join(", ")}` : ""}
                      </p>
                    </div>
                    {(e.video_url || e.gif_url) && (
                      <a href={e.video_url || e.gif_url!} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()} className="text-primary">
                        <Play className="w-4 h-4" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
              <button onClick={completeWorkout} disabled={!allDone || completing}
                className="w-full rounded-full bg-primary text-primary-foreground font-bold py-3 disabled:opacity-40">
                {completing ? "Salvando..." : allDone ? "Concluir treino (+50 XP)" : `Marque todos os exercícios (${Object.values(done).filter(Boolean).length}/${exercises.length})`}
              </button>
            </div>
          )}

          {!loading && !genError && step === 3 && !showingOffer && exercises.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Não conseguimos montar um treino para esses filtros. Tente outro objetivo.
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
