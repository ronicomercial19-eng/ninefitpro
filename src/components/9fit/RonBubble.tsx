import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { useProactiveRon } from '@/hooks/useProactiveRon';

/**
 * Bubble flutuante do RON proativo — canto inferior direito, acima do BottomNav.
 * Dismissable (persistido por dia em localStorage via useProactiveRon).
 */
export function RonBubble() {
  const navigate = useNavigate();
  const { tip, dismiss } = useProactiveRon();

  return (
    <AnimatePresence>
      {tip && (
        <motion.div
          key={tip.id}
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 180, damping: 22 }}
          className="fixed bottom-24 right-3 z-50 max-w-[300px]"
        >
          <div className="relative bg-card/95 backdrop-blur-xl border border-primary/30 rounded-2xl rounded-br-md p-3 pr-9 shadow-[0_16px_48px_-16px_rgba(0,0,0,0.6)]">
            <button
              onClick={() => dismiss(tip.id)}
              className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              aria-label="Dispensar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-start gap-2.5">
              <motion.div
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] tracking-[0.25em] uppercase text-primary/80 font-semibold mb-0.5">RON</p>
                <p className="text-[13px] text-foreground leading-snug mb-2">{tip.text}</p>
                <button
                  onClick={() => { dismiss(tip.id); navigate('/9fit/ron'); }}
                  className="text-[11px] font-semibold tracking-wide text-primary hover:underline"
                >
                  {tip.cta || 'Conversar'} →
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
