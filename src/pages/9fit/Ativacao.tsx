import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket, Dumbbell, Sparkles, Check, ArrowRight, ClipboardList,
  MessageSquare, Trophy, Play, CheckCircle2, Timer, RotateCcw, Flame,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useActivationFlow, type ActivationStep } from '@/hooks/useActivationFlow';
import { useAthleteId } from '@/hooks/useAthleteId';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WorkoutExercise { name: string; sets: number; reps: string; rest: string; tips?: string }
interface WorkoutPlan {
  title: string;
  focus: string;
  difficulty: string;
  estimatedDuration: string;
  exercises: WorkoutExercise[];
}

const FALLBACK_PLAN = (goal: string, level: string): WorkoutPlan => ({
  title: `Programa 9FIT: ${goal}`,
  focus: 'Força & Estabilização Muscular',
  difficulty: level,
  estimatedDuration: '40 min',
  exercises: [
    { name: 'Agachamento Goblet com Halter', sets: 3, reps: '12', rest: '45s', tips: 'Halter próximo ao peito, joelhos alinhados aos pés.' },
    { name: 'Flexão de Braço', sets: 3, reps: '10-15', rest: '45s', tips: 'Corpo alinhado, abdômen ativo.' },
    { name: 'Remada Curvada com Halteres', sets: 3, reps: '12', rest: '45s', tips: 'Coluna neutra, cotovelos rentes ao corpo.' },
    { name: 'Prancha Isométrica', sets: 3, reps: '40s', rest: '30s', tips: 'Contraia abdômen e glúteos.' },
  ],
});

const STEPS: { id: Exclude<ActivationStep, 'not_started' | 'finished'>; num: number; label: string; icon: any }[] = [
  { id: 'assessment', num: 1, label: 'Ficha', icon: ClipboardList },
  { id: 'generation', num: 2, label: 'Análise', icon: Sparkles },
  { id: 'execute', num: 3, label: 'Treino', icon: Dumbbell },
  { id: 'consistency', num: 4, label: 'Hábito', icon: MessageSquare },
];

export default function NineFitAtivacao() {
  const navigate = useNavigate();
  const { athleteId } = useAthleteId();
  const { row, loading, derivedStep, advanceStep, finishActivation, advancing } = useActivationFlow();

  const [uiState, setUiState] = useState<ActivationStep>('not_started');
  const [xpNotif, setXpNotif] = useState<{ amount: number; id: number } | null>(null);

  // Assessment
  const [level, setLevel] = useState('Intermediário');
  const [goal, setGoal] = useState('Hipertrofia e Definição');
  const [frequency, setFrequency] = useState(4);
  const [restrictions, setRestrictions] = useState('');

  // Generation
  const [generating, setGenerating] = useState(false);
  const [genLogs, setGenLogs] = useState<string[]>([]);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);

  // Execute
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [timerCount, setTimerCount] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [done, setDone] = useState<Record<number, boolean>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  // Consistency
  const consistencyDays = row?.consistency_days ?? 0;

  // Sync UI with derived server state (initial load)
  useEffect(() => {
    if (loading) return;
    if (row?.finished_at) { navigate('/9fit/os', { replace: true }); return; }
    if (uiState === 'not_started' && derivedStep !== 'not_started') setUiState(derivedStep);
  }, [loading, derivedStep, row?.finished_at, uiState, navigate]);

  // Timer
  useEffect(() => {
    if (!timerActive) return;
    const t = setInterval(() => setTimerCount((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [timerActive]);

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const awardXp = (amount: number) => {
    const id = Date.now();
    setXpNotif({ amount, id });
    setTimeout(() => setXpNotif((p) => (p?.id === id ? null : p)), 2500);
  };

  // ── Step 1: Assessment ────────────────────────────────
  const handleSaveAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    await advanceStep('assessment', {
      goal, experience_level: level, weekly_frequency: frequency, restrictions,
    });
    awardXp(50);
    setUiState('generation');
  };

  // ── Step 2: Generation ────────────────────────────────
  const runGeneration = async () => {
    setGenerating(true);
    setGenLogs([]);
    const logs = [
      '📥 Conectando ao motor de biomecânica 9FIT...',
      `🧬 Mapeando perfil metabólico: "${goal}"`,
      `⚡ Ajustando volume ao nível: ${level}`,
      `🛡️ Aplicando restrições: "${restrictions || 'Sem restrições'}"`,
      '🚀 Finalizando programa adaptado!',
    ];
    for (let i = 0; i < logs.length; i++) {
      await new Promise((r) => setTimeout(r, 550));
      setGenLogs((prev) => [...prev, logs[i]]);
    }

    // Tenta usar RPC oficial de treino rápido; fallback local em qualquer erro
    let workout = FALLBACK_PLAN(goal, level);
    try {
      const { data } = await supabase.rpc('fn_treino_rapido' as any, {
        p_athlete_id: athleteId,
        p_objetivo: goal,
        p_tempo_min: 40,
        p_equipamento: null,
      });
      const arr = (data as any)?.exercises;
      if (Array.isArray(arr) && arr.length) {
        workout = {
          ...workout,
          exercises: arr.slice(0, 6).map((e: any) => ({
            name: e.name ?? e.nome ?? 'Exercício',
            sets: (data as any)?.sets_default ?? 3,
            reps: String((data as any)?.reps_default ?? '10-12'),
            rest: `${(data as any)?.rest_default_seconds ?? 60}s`,
            tips: e.target_muscles ? `Foco: ${(e.target_muscles || []).join(', ')}` : undefined,
          })),
        };
      }
    } catch (err) {
      console.warn('[fn_treino_rapido] fallback:', err);
    }

    setPlan(workout);
    await advanceStep('generation', {
      day_number: 1,
      day_name: workout.title,
      focus_muscles: [workout.focus],
      workout_type: 'quick',
    });
    setGenerating(false);
    awardXp(50);
    setUiState('execute');
  };

  useEffect(() => {
    if (uiState === 'generation' && !generating && !plan) runGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiState]);

  // ── Step 3: Execute ───────────────────────────────────
  const startWorkout = () => {
    setWorkoutStarted(true);
    setTimerCount(0);
    setTimerActive(true);
    setDone({});
    awardXp(15);
  };

  const toggleDone = (idx: number) => {
    const isChecking = !done[idx];
    setDone((d) => ({ ...d, [idx]: isChecking }));
    if (isChecking) awardXp(20);
  };

  const finishWorkout = async () => {
    setTimerActive(false);
    setWorkoutStarted(false);
    await advanceStep('execute', { amount: 100, source: 'first_workout' });
    awardXp(100);
    setShowSuccess(true);
  };

  const advanceToConsistency = () => {
    setShowSuccess(false);
    setUiState('consistency');
  };

  // ── Step 4: Consistency ───────────────────────────────
  const registerConsistencyDay = async () => {
    await advanceStep('consistency');
    awardXp(30);
  };

  const finishFlow = async () => {
    await finishActivation();
    awardXp(150);
    toast.success('Ativação concluída! Bem-vindo ao 9FIT.');
    setTimeout(() => navigate('/9fit/os', { replace: true }), 800);
  };

  // ── Stepper ───────────────────────────────────────────
  const currentIndex = useMemo(
    () => STEPS.findIndex((s) => s.id === uiState),
    [uiState],
  );

  const stepStatus = (id: string) => {
    const i = STEPS.findIndex((s) => s.id === id);
    if (currentIndex > i) return 'completed';
    if (currentIndex === i) return 'active';
    return 'upcoming';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm tracking-widest uppercase">Carregando ativação…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased pb-24">
      {/* XP notification */}
      <AnimatePresence>
        {xpNotif && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-black text-xs shadow-2xl z-50 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> +{xpNotif.amount} XP
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-border/40 bg-card/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black shadow-[0_0_20px_hsl(var(--primary)/0.35)]">9F</div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black tracking-wider text-lg">9FIT PRO</span>
                <span className="text-[9px] font-mono bg-primary/15 border border-primary/30 text-primary px-2 py-0.5 rounded uppercase tracking-widest font-bold">Ativação</span>
              </div>
              <p className="text-[9px] font-mono text-muted-foreground mt-0.5 uppercase tracking-wide">Ficha · Análise · Treino · Consistência</p>
            </div>
          </div>
        </div>
      </header>

      {/* Progress stepper */}
      {uiState !== 'not_started' && uiState !== 'finished' && (
        <div className="max-w-2xl mx-auto pt-8 px-6">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-5 right-5 top-5 h-[2px] bg-border -z-10" />
            <div
              className="absolute left-5 top-5 h-[2px] bg-primary -z-10 transition-all duration-500"
              style={{ width: `calc(${(Math.max(currentIndex, 0) / 3) * 100}% - 20px)` }}
            />
            {STEPS.map((s) => {
              const status = stepStatus(s.id);
              const Icon = s.icon;
              return (
                <div key={s.id} className="flex flex-col items-center relative">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 transition-all',
                    status === 'completed' && 'bg-primary border-primary text-primary-foreground',
                    status === 'active' && 'bg-card border-primary text-primary scale-110 shadow-[0_0_18px_hsl(var(--primary)/0.4)]',
                    status === 'upcoming' && 'bg-card border-border text-muted-foreground',
                  )}>
                    {status === 'completed' ? <Check className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={cn(
                    'text-[10px] font-mono tracking-widest uppercase font-bold mt-2',
                    status === 'active' ? 'text-primary' : status === 'completed' ? 'text-foreground' : 'text-muted-foreground',
                  )}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <main className="max-w-3xl w-full mx-auto px-6 py-10">
        <AnimatePresence mode="wait">

          {/* ── WELCOME ── */}
          {uiState === 'not_started' && (
            <motion.section
              key="welcome"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="bg-card/70 border border-border rounded-3xl p-8 text-center max-w-2xl mx-auto shadow-xl"
            >
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 border border-primary/30 text-primary flex items-center justify-center">
                <Rocket className="w-8 h-8" />
              </div>
              <p className="text-[10px] font-mono text-primary uppercase tracking-widest font-black mb-2">Sistema de integração 9FIT</p>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-4">Inicie sua Ativação Guiada</h1>
              <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-md mx-auto">
                Um fluxo contínuo de triagem, geração de treino IA e fixação de hábito. Ao concluir, seu perfil está oficialmente ativado.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 text-left">
                {[
                  { s: '01', t: 'Ficha', d: 'Objetivos e nível' },
                  { s: '02', t: 'Análise IA', d: 'Criação do treino' },
                  { s: '03', t: 'Prática', d: 'Registro real' },
                  { s: '04', t: 'Constância', d: 'Trilha 7 dias' },
                ].map((i) => (
                  <div key={i.s} className="p-3 bg-background/40 border border-border rounded-xl">
                    <span className="text-[10px] font-mono text-primary font-bold block">{i.s}</span>
                    <span className="text-xs font-semibold block">{i.t}</span>
                    <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">{i.d}</span>
                  </div>
                ))}
              </div>
              <Button size="lg" onClick={() => setUiState('assessment')} className="gap-2">
                Iniciar ativação <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.section>
          )}

          {/* ── STEP 1: ASSESSMENT ── */}
          {uiState === 'assessment' && (
            <motion.form
              key="assessment"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              onSubmit={handleSaveAssessment}
              className="bg-card/70 border border-border rounded-3xl p-8 space-y-6"
            >
              <div>
                <p className="text-[10px] font-mono text-primary uppercase tracking-widest font-black">Etapa 01</p>
                <h2 className="text-2xl font-black tracking-tight mt-1">Ficha Técnica</h2>
                <p className="text-sm text-muted-foreground mt-1">Precisamos entender seu perfil para calibrar o motor de treino.</p>
              </div>

              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block mb-2">Nível de experiência</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Iniciante', 'Intermediário', 'Avançado'].map((v) => (
                    <button type="button" key={v} onClick={() => setLevel(v)}
                      className={cn('py-2.5 rounded-xl border text-sm font-semibold transition',
                        level === v ? 'bg-primary text-primary-foreground border-primary' : 'bg-background/40 border-border hover:border-primary/50',
                      )}>{v}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block mb-2">Objetivo principal</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Hipertrofia e Definição', 'Emagrecimento', 'Força', 'Saúde e Bem-estar'].map((v) => (
                    <button type="button" key={v} onClick={() => setGoal(v)}
                      className={cn('py-2.5 px-3 rounded-xl border text-xs font-semibold transition text-left',
                        goal === v ? 'bg-primary text-primary-foreground border-primary' : 'bg-background/40 border-border hover:border-primary/50',
                      )}>{v}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block mb-2">Frequência semanal: <span className="text-primary font-black">{frequency}x</span></label>
                <input type="range" min={2} max={6} value={frequency} onChange={(e) => setFrequency(+e.target.value)}
                  className="w-full accent-primary" />
              </div>

              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block mb-2">Restrições ou lesões (opcional)</label>
                <textarea value={restrictions} onChange={(e) => setRestrictions(e.target.value)} rows={2}
                  placeholder="Ex.: dor lombar leve, joelho direito sensível…"
                  className="w-full bg-background/40 border border-border rounded-xl p-3 text-sm resize-none focus:border-primary outline-none" />
              </div>

              <Button type="submit" size="lg" disabled={advancing} className="w-full gap-2">
                Salvar ficha e gerar treino <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.form>
          )}

          {/* ── STEP 2: GENERATION ── */}
          {uiState === 'generation' && (
            <motion.section
              key="generation"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="bg-card/70 border border-border rounded-3xl p-8"
            >
              <p className="text-[10px] font-mono text-primary uppercase tracking-widest font-black">Etapa 02</p>
              <h2 className="text-2xl font-black tracking-tight mt-1 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" /> Análise IA em andamento
              </h2>
              <p className="text-sm text-muted-foreground mt-1 mb-6">O motor 9FIT está montando seu programa.</p>

              <div className="bg-background/60 border border-border rounded-2xl p-5 font-mono text-xs space-y-2 min-h-[220px]">
                {genLogs.map((l, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    className="text-muted-foreground">{l}</motion.div>
                ))}
                {generating && (
                  <div className="flex items-center gap-2 text-primary pt-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span>Processando…</span>
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {/* ── STEP 3: EXECUTE ── */}
          {uiState === 'execute' && plan && (
            <motion.section
              key="execute"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="bg-card/70 border border-border rounded-3xl p-8"
            >
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className="text-[10px] font-mono text-primary uppercase tracking-widest font-black">Etapa 03</p>
                  <h2 className="text-2xl font-black tracking-tight mt-1">{plan.title}</h2>
                  <p className="text-xs text-muted-foreground mt-1">{plan.focus} · {plan.difficulty} · {plan.estimatedDuration}</p>
                </div>
                {workoutStarted && (
                  <div className="text-right">
                    <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Timer</div>
                    <div className="text-2xl font-black text-primary tabular-nums flex items-center gap-1"><Timer className="w-5 h-5" /> {fmtTime(timerCount)}</div>
                  </div>
                )}
              </div>

              {!workoutStarted && (
                <Button size="lg" onClick={startWorkout} className="w-full gap-2 mb-6">
                  <Play className="w-4 h-4" /> Iniciar treino
                </Button>
              )}

              <ul className="space-y-2">
                {plan.exercises.map((ex, idx) => (
                  <li key={idx}
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-xl border transition',
                      done[idx] ? 'bg-primary/10 border-primary/40' : 'bg-background/40 border-border',
                    )}>
                    <button
                      type="button" disabled={!workoutStarted}
                      onClick={() => toggleDone(idx)}
                      className={cn(
                        'w-8 h-8 rounded-lg border flex items-center justify-center shrink-0',
                        done[idx] ? 'bg-primary border-primary text-primary-foreground' : 'border-border',
                      )}
                    >
                      {done[idx] ? <Check className="w-4 h-4" /> : <span className="text-xs font-mono">{idx + 1}</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{ex.name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">{ex.sets}x{ex.reps} · descanso {ex.rest}</div>
                      {ex.tips && <div className="text-[11px] text-muted-foreground mt-1">{ex.tips}</div>}
                    </div>
                  </li>
                ))}
              </ul>

              {workoutStarted && (
                <Button
                  size="lg" variant="default" onClick={finishWorkout}
                  disabled={advancing || Object.values(done).filter(Boolean).length < plan.exercises.length}
                  className="w-full gap-2 mt-6"
                >
                  <CheckCircle2 className="w-4 h-4" /> Finalizar e registrar treino
                </Button>
              )}
            </motion.section>
          )}

          {/* Modal success após treino */}
          <AnimatePresence>
            {showSuccess && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
              >
                <motion.div
                  initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }}
                  className="bg-card border border-primary/40 rounded-3xl p-8 max-w-md text-center shadow-2xl"
                >
                  <Trophy className="w-14 h-14 mx-auto text-primary mb-4" />
                  <h3 className="text-2xl font-black tracking-tight mb-2">Primeiro treino registrado!</h3>
                  <p className="text-sm text-muted-foreground mb-6">+100 XP · Você desbloqueou a trilha de consistência.</p>
                  <Button size="lg" onClick={advanceToConsistency} className="w-full gap-2">
                    Continuar <ArrowRight className="w-4 h-4" />
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── STEP 4: CONSISTENCY ── */}
          {uiState === 'consistency' && (
            <motion.section
              key="consistency"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="bg-card/70 border border-border rounded-3xl p-8"
            >
              <p className="text-[10px] font-mono text-primary uppercase tracking-widest font-black">Etapa 04</p>
              <h2 className="text-2xl font-black tracking-tight mt-1 flex items-center gap-2">
                <Flame className="w-6 h-6 text-primary" /> Trilha dos 7 dias
              </h2>
              <p className="text-sm text-muted-foreground mt-1 mb-6">
                Marque seu check-in diário. Ao completar hoje, seu perfil é oficialmente ativado.
              </p>

              <div className="grid grid-cols-7 gap-2 mb-6">
                {Array.from({ length: 7 }).map((_, i) => {
                  const filled = i < consistencyDays;
                  return (
                    <div key={i} className={cn(
                      'aspect-square rounded-xl border flex flex-col items-center justify-center',
                      filled ? 'bg-primary/15 border-primary text-primary' : 'bg-background/40 border-border text-muted-foreground',
                    )}>
                      <span className="text-[10px] font-mono uppercase">Dia</span>
                      <span className="text-lg font-black">{i + 1}</span>
                      {filled && <Check className="w-3 h-3 mt-0.5" />}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" size="lg" disabled={advancing} onClick={registerConsistencyDay} className="flex-1 gap-2">
                  <RotateCcw className="w-4 h-4" /> Registrar check-in de hoje
                </Button>
                <Button size="lg" disabled={advancing} onClick={finishFlow} className="flex-1 gap-2">
                  Finalizar ativação <Trophy className="w-4 h-4" />
                </Button>
              </div>

              <p className="text-[10px] text-muted-foreground mt-4 text-center font-mono">
                Ativação oficial libera o app imediatamente. O selo de consistência (7 dias) é conquistado com o tempo.
              </p>
            </motion.section>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
