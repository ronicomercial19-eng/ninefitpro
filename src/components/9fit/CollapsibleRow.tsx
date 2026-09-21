import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface CollapsibleRowProps {
  icon?: React.ReactNode;
  /** Cor de acento em HSL (ex: '25 95% 55%') pro tile do ícone — dá vida/identidade a cada linha. */
  accent?: string;
  label: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Redesign v2 (Nine Pro, 14/09): "navegação progressiva" — cada seção que não é
 * a decisão primária da tela vira uma linha de resumo de uma linha só, que
 * expande in-place com um toque.
 *
 * Ajuste (20/09, feedback do Rony: "sem vida, sem cor/gradiente"): o ícone
 * ganhou um tile com gradiente + glow na cor de acento da seção, em vez de
 * um ícone cinza solto — cada linha tem identidade visual própria mesmo
 * fechada, como uma miniatura do que tem lá dentro.
 */
export function CollapsibleRow({ icon, accent = '18 100% 59%', label, defaultOpen = false, children, className = '' }: CollapsibleRowProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`fit-os-panel bg-card/30 overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3.5 py-3 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
              style={{
                background: `linear-gradient(135deg, hsl(${accent} / 0.30), hsl(${accent} / 0.06))`,
                borderColor: `hsl(${accent} / 0.35)`,
                boxShadow: `0 0 14px -4px hsl(${accent} / 0.55)`,
                color: `hsl(${accent})`,
              }}
            >
              {icon}
            </div>
          )}
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
