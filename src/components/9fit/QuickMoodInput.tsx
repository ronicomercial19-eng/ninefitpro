import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Props {
  onLogged?: () => void;
}

// 5 níveis discretos (0-10 escala)
const LEVELS = [
  { emoji: '😵', label: 'Exausto', score: 2,   feedback: 'Acordei exausto, fadiga acumulada.' },
  { emoji: '😐', label: 'Baixo',   score: 4,   feedback: 'Energia abaixo da média hoje.' },
  { emoji: '🙂', label: 'OK',       score: 6,   feedback: 'Estado equilibrado.' },
  { emoji: '💪', label: 'Forte',   score: 8,   feedback: 'Me sinto forte e recuperado.' },
  { emoji: '🔥', label: 'Pico',     score: 9.5, feedback: 'Energia em alta, animado para hoje.' },
] as const;

/**
 * Quick-emoji input: grava em sync_score_logs e re-infere o estado adaptativo.
 * Posiciona-se no topo do Hub e some por 12h após registro do dia.
 */
export function QuickMoodInput({ onLogged }: Props) {
  const { user } = useAuth();
  const todayKey = `9fit_mood_${new Date().toISOString().slice(0, 10)}`;
  const [done, setDone] = useState<boolean>(() => localStorage.getItem(todayKey) === 'true');
  const [busy, setBusy] = useState<number | null>(null);

  if (done) return null;

  const log = async (lvl: typeof LEVELS[number]) => {
    if (!user?.id || busy !== null) return;
    setBusy(lvl.score);
    try {
      await supabase.from('sync_score_logs' as any).insert({
        user_id: user.id,
        score: lvl.score,
        feedback_text: lvl.feedback,
        source: 'hub_mood',
      });
      localStorage.setItem(todayKey, 'true');
      setDone(true);
      toast.success(`Registrado — RON está recalibrando.`, { duration: 1800 });
      onLogged?.();
    } catch (e) {
      console.error(e);
      toast.error('Não consegui registrar agora.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-4"
    >
      <p className="text-[10px] tracking-[0.3em] uppercase text-primary/80 font-data mb-3">
        COMO VOCÊ ACORDOU?
      </p>
      <div className="flex items-center justify-between gap-2">
        {LEVELS.map((l) => (
          <button
            key={l.score}
            onClick={() => log(l)}
            disabled={busy !== null}
            className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border transition-all ${
              busy === l.score
                ? 'border-primary bg-primary/10 scale-95'
                : 'border-transparent hover:border-white/10 hover:bg-white/[0.04]'
            }`}
          >
            <span className="text-2xl leading-none">{l.emoji}</span>
            <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground font-data">
              {l.label}
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
