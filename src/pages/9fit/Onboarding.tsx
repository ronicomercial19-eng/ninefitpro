import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { OnboardingStepper } from "@/components/9fit/OnboardingStepper";

const STEPS = [
  { key: "name", label: "Conexão" },
  { key: "goal", label: "Perfil" },
  { key: "freq", label: "Protocolo" },
  { key: "rest", label: "Bio" },
  { key: "wear", label: "Sync" },
  { key: "prime", label: "Prime" },
];

type Goal = 'hipertrofia' | 'emagrecimento' | 'performance' | 'saude';
type Wearable = 'apple_watch' | 'garmin' | 'whoop' | 'oura' | 'none';

interface Answers {
  name: string;
  goal: Goal | null;
  frequency: number;
  restrictions: string[];
  wearable: Wearable | null;
}

const GOALS: { id: Goal; label: string; sub: string }[] = [
  { id: 'hipertrofia',    label: 'Hipertrofia',    sub: 'Construir músculo.' },
  { id: 'emagrecimento',  label: 'Emagrecimento',  sub: 'Recompor corpo.' },
  { id: 'performance',    label: 'Performance',    sub: 'Atletismo e força.' },
  { id: 'saude',          label: 'Saúde',          sub: 'Longevidade e energia.' },
];

const RESTRICTIONS = ['Lactose', 'Glúten', 'Vegetariano', 'Vegano', 'Sem restrição'];

const WEARABLES: { id: Wearable; label: string }[] = [
  { id: 'apple_watch', label: 'Apple Watch' },
  { id: 'garmin',      label: 'Garmin' },
  { id: 'whoop',       label: 'WHOOP' },
  { id: 'oura',        label: 'Oura' },
  { id: 'none',        label: 'Nenhum' },
];

export default function NineFitOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0); // 0..5 (6 telas)
  const [saving, setSaving] = useState(false);
  const [answers, setAnswers] = useState<Answers>({
    name: '',
    goal: null,
    frequency: 0,
    restrictions: [],
    wearable: null,
  });

  // Pre-fill name from auth metadata
  useEffect(() => {
    if (user) {
      const n = (user.user_metadata?.full_name as string) || (user.email?.split('@')[0]) || '';
      setAnswers((a) => ({ ...a, name: n }));
    }
  }, [user]);

  const total = 6;
  const progress = ((step + 1) / total) * 100;

  const canAdvance = () => {
    switch (step) {
      case 0: return answers.name.trim().length >= 2;
      case 1: return !!answers.goal;
      case 2: return answers.frequency >= 2;
      case 3: return answers.restrictions.length > 0;
      case 4: return !!answers.wearable;
      default: return true;
    }
  };

  const next = () => {
    if (!canAdvance()) return;
    setStep((s) => Math.min(total - 1, s + 1));
  };

  const finish = async () => {
    setSaving(true);
    try {
      // 1) persiste em athletes
      if (user) {
        await supabase
          .from('athletes')
          .update({
            name: answers.name,
            preferred_goal: answers.goal,
            weekly_frequency: answers.frequency,
          } as any)
          .eq('user_id', user.id);

        // 2) marca onboarding completo via RPC
        await supabase.rpc('complete_onboarding' as any, {
          p_payload: answers as any,
        });

        // 3) registra evento
        await supabase.from('master_registry' as any).insert({
          user_id: user.id,
          event_type: 'onboarding_completed',
          source: 'onboarding',
          payload: answers as any,
        });
      }
      toast.success('Seu sistema está online.');
      navigate('/9fit/hub');
    } catch (e: any) {
      console.error(e);
      toast.error('Salvamos parcialmente. Continuando...');
      navigate('/9fit/hub');
    } finally {
      setSaving(false);
    }
  };

  // --- Step renderers ---
  const RonBubble = ({ text }: { text: string }) => (
    <div className="flex items-start gap-3 mb-8">
      <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
        <Sparkles className="w-4 h-4 text-primary" />
      </div>
      <div className="bg-card/60 border border-white/[0.06] rounded-2xl rounded-tl-md px-4 py-3 max-w-md">
        <p className="text-[10px] tracking-[0.2em] uppercase text-primary/80 font-semibold mb-0.5">RON</p>
        <p className="text-sm text-foreground leading-snug">{text}</p>
      </div>
    </div>
  );

  const stepContent = () => {
    switch (step) {
      case 0:
        return (
          <>
            <RonBubble text="Como prefere ser chamado?" />
            <input
              autoFocus
              value={answers.name}
              onChange={(e) => setAnswers({ ...answers, name: e.target.value })}
              placeholder="Seu nome"
              className="w-full bg-transparent border-b-2 border-white/10 focus:border-primary outline-none py-3 text-2xl font-display tracking-tight text-foreground placeholder:text-white/20"
              onKeyDown={(e) => e.key === 'Enter' && next()}
            />
          </>
        );
      case 1:
        return (
          <>
            <RonBubble text={`Prazer, ${answers.name.split(' ')[0]}. Qual seu objetivo principal agora?`} />
            <div className="grid grid-cols-2 gap-3">
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => { setAnswers({ ...answers, goal: g.id }); setTimeout(next, 250); }}
                  className={`p-5 rounded-2xl text-left border transition-all ${
                    answers.goal === g.id
                      ? 'border-primary bg-primary/10'
                      : 'border-white/[0.06] bg-card/40 hover:border-white/15'
                  }`}
                >
                  <p className="font-display text-lg text-foreground mb-1">{g.label}</p>
                  <p className="text-xs text-muted-foreground">{g.sub}</p>
                </button>
              ))}
            </div>
          </>
        );
      case 2:
        return (
          <>
            <RonBubble text="Quantos dias por semana você consegue treinar?" />
            <div className="flex justify-between gap-2">
              {[2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  onClick={() => { setAnswers({ ...answers, frequency: n }); setTimeout(next, 250); }}
                  className={`w-14 h-14 rounded-full font-display text-xl transition-all ${
                    answers.frequency === n
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card/40 border border-white/[0.06] text-foreground hover:border-primary/40'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">
              {answers.frequency > 0 ? `${answers.frequency} dias por semana` : 'Selecione'}
            </p>
          </>
        );
      case 3:
        return (
          <>
            <RonBubble text="Alguma restrição alimentar?" />
            <div className="flex flex-wrap gap-2">
              {RESTRICTIONS.map((r) => {
                const sel = answers.restrictions.includes(r);
                return (
                  <button
                    key={r}
                    onClick={() => {
                      const next = sel
                        ? answers.restrictions.filter((x) => x !== r)
                        : r === 'Sem restrição'
                          ? ['Sem restrição']
                          : [...answers.restrictions.filter((x) => x !== 'Sem restrição'), r];
                      setAnswers({ ...answers, restrictions: next });
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      sel
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card/40 border-white/[0.06] text-foreground hover:border-white/15'
                    }`}
                  >
                    {sel && <Check className="w-3 h-3 inline mr-1" />} {r}
                  </button>
                );
              })}
            </div>
          </>
        );
      case 4:
        return (
          <>
            <RonBubble text="Usa algum wearable? Não tem problema se não." />
            <div className="grid grid-cols-2 gap-2">
              {WEARABLES.map((w) => (
                <button
                  key={w.id}
                  onClick={() => { setAnswers({ ...answers, wearable: w.id }); setTimeout(next, 250); }}
                  className={`px-4 py-4 rounded-xl text-sm font-medium border transition-all text-left ${
                    answers.wearable === w.id
                      ? 'bg-primary/10 border-primary text-foreground'
                      : 'bg-card/40 border-white/[0.06] text-foreground hover:border-white/15'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </>
        );
      case 5:
        return (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-9 h-9 text-primary" />
            </div>
            <h2 className="text-4xl font-display tracking-tight text-foreground mb-3">
              Seu sistema está online.
            </h2>
            <p className="text-muted-foreground max-w-sm mx-auto mb-6">
              RON está calibrando seu protocolo com base nas respostas.
            </p>

            {/* Bloco 9 — CTA para oferta Audience R$49 */}
            <div className="max-w-sm mx-auto mb-6 rounded-2xl border border-primary/40 bg-primary/[0.06] p-4 text-left">
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-1">Oferta inicial</p>
              <p className="font-display text-lg text-foreground mb-1">9FIT Audience — R$49/mês</p>
              <p className="text-xs text-muted-foreground mb-3">
                Hub completo, gamificação, comunidade e protocolos básicos. Cancele quando quiser.
              </p>
              <button
                onClick={async () => {
                  const { supabase } = await import("@/integrations/supabase/client");
                  const { data } = await supabase
                    .from("monetization_offers")
                    .select("id")
                    .eq("status", "active")
                    .order("priority", { ascending: false })
                    .limit(1)
                    .maybeSingle();
                  const id = (data as any)?.id;
                  navigate(id ? `/9fit/oferta/${id}` : "/9fit/hub");
                }}
                className="w-full rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-bold"
              >
                Ver oferta
              </button>
            </div>

            <button
              onClick={finish}
              disabled={saving}
              className="px-8 py-4 rounded-full border border-white/15 text-foreground font-semibold tracking-wide hover:bg-white/[0.04] transition inline-flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? 'Sincronizando...' : 'Continuar para o Hub'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar fina */}
      <div className="h-[2px] bg-white/[0.04]">
        <motion.div
          className="h-full bg-primary"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 90, damping: 18 }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <OnboardingStepper steps={STEPS} currentIndex={step} />
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28 }}
            >
              {stepContent()}
            </motion.div>
          </AnimatePresence>

          {step < 5 && (
            <div className="mt-10 flex items-center justify-between">
              <span className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                {step + 1} / {total}
              </span>
              <button
                onClick={next}
                disabled={!canAdvance()}
                className="px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold tracking-wide hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity inline-flex items-center gap-2"
              >
                Continuar <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
