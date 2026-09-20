import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface CollapsibleRowProps {
  icon?: React.ReactNode;
  label: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Redesign v2 (Nine Pro, 14/09): "navegação progressiva" — cada seção que não é
 * a decisão primária da tela vira uma linha de resumo de uma linha só, que
 * expande in-place com um toque. Usado no Home pra Calibração diária, Ranking,
 * Ativação, Check-in e Ecossistema, mantendo o Comando do dia como único
 * bloco "aberto" e com brilho da tela.
 */
export function CollapsibleRow({ icon, label, defaultOpen = false, children, className = '' }: CollapsibleRowProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`fit-os-panel bg-card/30 overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {icon}
          <span className="text-[13px] font-semibold truncate">{label}</span>
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
