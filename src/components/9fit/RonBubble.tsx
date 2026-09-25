import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, MessageSquare } from 'lucide-react';
import { useProactiveRon } from '@/hooks/useProactiveRon';
import { useUserState } from '@/hooks/useUserState';
import { STATE_LABEL, STATE_COLOR } from '@/services/adaptiveState';
import { RonConciergeSheet } from './RonConciergeSheet';

/**
 * Bubble flutuante e Launcher Global do RON — canto inferior direito, acima do BottomNav.
 * Sempre visível para servir como Concierge e Centro de Inteligência 360 do atleta.
 * Apresenta dicas proativas dinâmicas e botão neural de acesso instantâneo.
 */
export function RonBubble() {
  const { tip, dismiss } = useProactiveRon();
  const { state } = useUserState();
  const [minimized, setMinimized] = useState(false);

  const openConcierge = (prompt?: string) => {
    window.dispatchEvent(new CustomEvent('9fit:open-ron-concierge', { detail: { prompt } }));
  };

  return (
    <>
      <div className="fixed bottom-24 right-3.5 z-40 flex flex-col items-end gap-2 pointer-events-none">
        {/* Dica Proativa Contextual do RON */}
        <AnimatePresence>
          {tip && !minimized && (
            <motion.div
              key={tip.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 220, damping: 20 }}
              className="pointer-events-auto max-w-[280px]"
            >
              <div className="relative bg-[#0c0d12]/95 backdrop-blur-xl border border-primary/30 rounded-2xl rounded-br-xs p-3 pr-8 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.8)]">
                <button
                  onClick={() => dismiss(tip.id)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                  aria-label="Dispensar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-[9px] tracking-[0.2em] uppercase text-primary font-bold">RON · GEMINI</p>
                      <span
                        className="text-[8px] tracking-[0.15em] uppercase font-bold px-1.5 py-px rounded"
                        style={{ color: STATE_COLOR[state], background: STATE_COLOR[state] + '20' }}
                      >
                        {STATE_LABEL[state]}
                      </span>
                    </div>
                    <p className="text-[12px] text-neutral-200 leading-snug mb-2">{tip.text}</p>
                    <button
                      onClick={() => {
                        dismiss(tip.id);
                        openConcierge(tip.cta);
                      }}
                      className="text-[11px] font-semibold tracking-wide text-primary hover:underline flex items-center gap-1"
                    >
                      {tip.cta || 'Abrir Concierge'} →
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botão Neural Flutuante Permanente */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => openConcierge()}
          className="pointer-events-auto relative group flex items-center gap-2 p-2.5 pr-3.5 rounded-full bg-[#0a0b10]/90 backdrop-blur-xl border border-primary/40 hover:border-primary shadow-[0_8px_32px_-8px_rgba(34,197,94,0.4)] transition-all cursor-pointer"
          aria-label="Abrir RON Concierge"
        >
          {/* Anel pulsante de atividade */}
          <span className="absolute -inset-0.5 rounded-full bg-primary/20 blur-sm group-hover:bg-primary/40 animate-pulse -z-10" />

          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-colors shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>

          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold tracking-wider uppercase text-white">RON IA</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
            </div>
            <span className="text-[8px] text-muted-foreground uppercase tracking-widest font-mono">
              CONCIERGE
            </span>
          </div>
        </motion.button>
      </div>

      {/* Componente Global de Concierge */}
      <RonConciergeSheet />
    </>
  );
}
