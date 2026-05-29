import { Sparkles, ChevronRight, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUserState } from '@/hooks/useUserState';
import { STATE_LABEL, STATE_COLOR, STATE_INSIGHT } from '@/services/adaptiveState';

interface Props {
  syncScore: number;
  name?: string;
}

/**
 * Hub RON & PRESENÇA card — substitui o stub de RON Insight.
 * Mostra estado adaptativo + Sync Score + insight do dia + CTA conversar.
 */
export function HubRonCard({ syncScore, name }: Props) {
  const navigate = useNavigate();
  const { state, reasoning } = useUserState();
  const color = STATE_COLOR[state];
  const insights = STATE_INSIGHT[state];
  const insight = insights[syncScore % insights.length] ?? insights[0];

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate(`/9fit/ron?context=hub_card&state=${state}`)}
      className="w-full text-left rounded-2xl p-4 border backdrop-blur-xl relative overflow-hidden transition-all hover:scale-[1.005] active:scale-[0.99]"
      style={{
        borderColor: color + '40',
        background: `linear-gradient(135deg, ${color}10 0%, transparent 70%), hsl(var(--card) / 0.45)`,
      }}
    >
      {/* halo */}
      <div
        className="absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ background: color }}
        aria-hidden
      />

      <div className="flex items-start gap-3 relative">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: color + '20', border: `1px solid ${color}55` }}
        >
          <Sparkles className="w-4 h-4" style={{ color }} />
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] tracking-[0.3em] uppercase font-bold" style={{ color }}>
              RON • PRESENÇA
            </span>
            <span
              className="text-[8px] tracking-[0.2em] uppercase font-bold px-1.5 py-px rounded"
              style={{ color, background: color + '15' }}
            >
              {STATE_LABEL[state]}
            </span>
          </div>
          <p className="text-[14px] text-foreground font-semibold leading-snug mb-2">
            {name ? `${name}, ` : ''}{insight}
          </p>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Activity className="w-3 h-3" style={{ color }} /> Sync {syncScore}
            </span>
            <span className="opacity-60">·</span>
            <span className="truncate">{reasoning}</span>
          </div>
          <p className="text-[11px] mt-2.5 font-semibold tracking-wide inline-flex items-center gap-1" style={{ color }}>
            Conversar com o RON <ChevronRight className="w-3.5 h-3.5" />
          </p>
        </div>
      </div>
    </motion.button>
  );
}
