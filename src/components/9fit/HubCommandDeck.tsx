import { motion } from "framer-motion";
import { ArrowUpRight, Brain, CheckCircle2, Dumbbell, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { HubScoreStatus } from "@/hooks/useAthleteScores";
import { useState } from 'react';
import { useDailyContext } from '@/hooks/useDailyContext';
import { businessDate, dayProgress, selectDayCommand } from '@/services/dailyContext';
import { EmojiCalibrationQuiz } from './EmojiCalibrationQuiz';
import { PDIWizard } from './PDIWizard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAthleteId } from '@/hooks/useAthleteId';
import { toast } from 'sonner';

interface Props {
  name: string;
  syncScore: number | null;
  scoreStatus: HubScoreStatus;
  weekly: { treinos: number; nutri: number; minutos: number };
  hasPlan: boolean;
}

export function HubCommandDeck({ name, syncScore, scoreStatus, weekly }: Props) {
  const navigate = useNavigate();
  const context = useDailyContext();
  const { athleteId } = useAthleteId();
  const [modal, setModal] = useState<'calibration' | 'profile' | 'review' | null>(null);
  const [saving, setSaving] = useState(false);
  const current = !context.isError && context.data?.date === businessDate() ? context.data : null;
  const command = current ? selectDayCommand(current) : null;
  const progress = current ? dayProgress(current) : null;
  const scoreReady = typeof syncScore === "number" && scoreStatus === "available";
  const headline = command?.title || (context.isError ? 'Não consegui ler seu dia.' : 'Lendo seus registros de hoje…');
  const primaryLabel = command?.label || 'Tentar atualizar';
  const act = () => { if (!command) { void context.refetch(); return; } if (command.route) navigate(command.route); else if (['calibration', 'profile', 'review'].includes(command.key)) setModal(command.key as 'calibration' | 'profile' | 'review'); };
  const record = async (patch: { rating?: number; training_choice?: string }) => {
    if (!athleteId || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('athlete_day_reviews' as any).upsert({ athlete_id: athleteId, review_date: businessDate(), updated_at: new Date().toISOString(), ...patch }, { onConflict: 'athlete_id,review_date' });
      if (error) throw error;
      window.dispatchEvent(new Event('9fit:day-reviewed'));
      setModal(null);
      toast.success(patch.rating ? 'Balanço registrado' : 'Descanso registrado para hoje. Sua prescrição foi preservada.');
    } catch { toast.error('Não foi possível salvar. Tente novamente.'); } finally { setSaving(false); }
  };
  const consistency = Math.min(100, Math.round((weekly.treinos / 5) * 100));

  return (
    <section className="w-full" aria-label="Comando do dia">
      <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c0d10] p-3.5 sm:p-4.5 shadow-xl transition-all">
        {/* Hairline subtle top light */}
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />

        <div className="relative">
          {/* Header do Card */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md border border-primary/40 bg-primary/10">
                <Sparkles className="h-3 w-3 text-primary" />
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-primary">
                Comando do Dia
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${scoreReady ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
              <span className="font-mono text-[9.5px] uppercase tracking-wider text-neutral-400 font-medium">
                {scoreReady ? `SYNC ${Math.round(syncScore!)}` : "CALIBRANDO"}
              </span>
            </div>
          </div>

          {/* Grid Principal: Chamada + Dial Compacto */}
          <div className="mt-2.5 grid grid-cols-[1fr_96px] sm:grid-cols-[1fr_104px] items-center gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white leading-snug font-display">
                {name}, {headline}
              </h2>
              <p className="mt-0.5 text-[11.5px] text-neutral-400 leading-normal">
                {command?.description || 'A próxima ação depende dos seus registros confirmados.'}
              </p>
            </div>
            <SyncDial score={scoreReady ? Math.round(syncScore!) : null} />
          </div>

          {/* Botão de Ação Primária */}
          <button
            type="button"
            onClick={act}
            disabled={!context.online || context.isFetching}
            className="mt-3 flex w-full items-center justify-between gap-2.5 rounded-lg bg-primary hover:bg-primary/90 px-3.5 py-2.5 text-left text-xs font-semibold tracking-wide text-primary-foreground transition-all active:scale-[0.99] shadow-sm"
          >
            <span className="flex items-center gap-2">
              <Dumbbell className="h-3.5 w-3.5" />
              <span>{primaryLabel}</span>
            </span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
          {progress && <p className="mt-2 text-xs text-neutral-400" aria-live="polite">{progress.completed}/{progress.total} etapas registradas · {current?.today.rest_day ? 'Descanso registrado' : 'Jornada de hoje'}</p>}
          {(command?.key === 'training' || command?.key === 'safety') && <button type="button" disabled={saving || !navigator.onLine} onClick={() => void record({ training_choice: 'rest' })} className="mt-2 text-xs text-neutral-400 underline">Hoje vou descansar</button>}
          {context.isError && <p role="alert" className="mt-2 text-xs text-amber-400">Falha ao atualizar. Conecte-se e tente novamente antes de continuar.</p>}
          {!context.online && <p role="status" className="mt-2 text-xs text-amber-400">Sem conexão. Seus últimos registros ficam visíveis; reconecte para continuar.</p>}

          {/* Métricas Semanais — Números Elegantes & Labels Nítidos */}
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            <CommandMetric label="Treinos" value={weekly.treinos} suffix="sem" progress={consistency} />
            <CommandMetric label="Minutos" value={weekly.minutos} suffix="min" progress={Math.min(100, Math.round((weekly.minutos / 180) * 100))} />
            <CommandMetric label="Nutrição" value={weekly.nutri} suffix="reg" progress={Math.min(100, weekly.nutri * 20)} />
          </div>

          {/* Ações Secundárias Compactas */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => navigate("/9fit/ron?context=hub_command")}
              className="flex items-center justify-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] px-3 py-2 text-[11px] font-medium text-neutral-300 hover:text-white transition-colors"
            >
              <Brain className="h-3.5 w-3.5 text-primary" />
              <span>Perguntar ao RON</span>
            </button>
            <button
              type="button"
              onClick={() => setModal('calibration')}
              className="flex items-center justify-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] px-3 py-2 text-[11px] font-medium text-neutral-300 hover:text-white transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              <span>Registrar sinal</span>
            </button>
          </div>
        </div>
      </div>
      <PDIWizard open={modal === 'profile'} onClose={() => setModal(null)} />
      <Dialog open={modal === 'calibration' || modal === 'review'} onOpenChange={open => { if (!open) setModal(null); }}>
        <DialogContent><DialogHeader><DialogTitle>{modal === 'review' ? 'Como foi seu dia?' : 'Calibração diária'}</DialogTitle><DialogDescription>{modal === 'review' ? 'Um balanço da sua rotina, separado dos sinais ao acordar.' : 'Cinco sinais declarados para orientar o dia.'}</DialogDescription></DialogHeader>
          {modal === 'calibration' && <EmojiCalibrationQuiz onComplete={() => setModal(null)} />}
          {modal === 'review' && <div className="grid grid-cols-5 gap-2">{['😵', '😕', '😐', '🙂', '🤩'].map((emoji, i) => <button key={emoji} aria-label={['Péssimo', 'Ruim', 'Regular', 'Bom', 'Ótimo'][i]} disabled={saving} onClick={() => void record({ rating: i + 1 })} className="rounded-xl border border-white/10 py-3"><span className="text-2xl">{emoji}</span><span className="block text-[10px]">{['Péssimo', 'Ruim', 'Regular', 'Bom', 'Ótimo'][i]}</span></button>)}</div>}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function SyncDial({ score }: { score: number | null }) {
  const value = score ?? 0;
  const circumference = 2 * Math.PI * 36;
  return (
    <div className="relative mx-auto h-24 w-24">
      <svg viewBox="0 0 88 88" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="44" cy="44" r="36" fill="none" stroke="currentColor" strokeWidth="4" className="text-white/10" />
        <circle
          cx="44"
          cy="44"
          r="36"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          className="text-primary transition-all duration-700"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-neutral-400 font-semibold">SYNC</span>
        <span className="text-xl sm:text-2xl font-bold tracking-tight text-white tabular-nums font-mono leading-none my-0.5">
          {score === null ? "—" : score}
        </span>
        <span className="font-mono text-[8.5px] text-neutral-500 tracking-wider font-medium">/ 100</span>
      </div>
    </div>
  );
}

function CommandMetric({ label, value, suffix, progress }: { label: string; value: number; suffix: string; progress: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 sm:p-2.5 transition-all"
    >
      <p className="text-[9.5px] font-mono font-semibold uppercase tracking-[0.16em] text-neutral-400">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-base sm:text-lg font-bold tracking-tight text-white tabular-nums font-mono leading-none">
          {value}
        </span>
        <span className="text-[9.5px] font-mono font-medium text-neutral-500 lowercase">
          {suffix}
        </span>
      </div>
      <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
    </motion.div>
  );
}
