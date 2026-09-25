import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';

interface CollapsibleRowProps {
  icon?: React.ReactNode;
  /** Cor de acento em HSL (ex: '24 85% 55%') */
  accent?: string;
  tag?: string;
  label: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  /** Abre o conteúdo interno em modal / splash overlay */
  asSplash?: boolean;
  centered?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Visual Retangular Minimalista com Gradiente Leve e Texto Objetivo:
 * - Sem emojis
 * - Design retangular limpo com gradiente suave
 * - Tipografia técnica objetiva
 * - Ao clicar, abre o conteúdo interno em Splash Modal
 */
export function CollapsibleRow({ 
  accent = '24 85% 55%', 
  tag,
  label, 
  subtitle,
  badge,
  asSplash = true,
  children, 
  className = '' 
}: CollapsibleRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* CARD RETANGULAR COM GRADIENTE LEVE */}
      <div 
        className={`group relative overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-r from-[#0c0d12] via-[#0f1118] to-[#0a0b0f] transition-all duration-300 hover:border-white/20 shadow-md ${className}`}
      >
        {/* Hairline luminoso superior sutil com a cor de acento */}
        <div 
          className="absolute top-0 left-0 right-0 h-[1.5px] opacity-40 transition-opacity duration-300 group-hover:opacity-85"
          style={{
            background: `linear-gradient(90deg, transparent, hsl(${accent}), transparent)`,
          }}
        />
        {/* Textura sutil de micro-retícula */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff04_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative z-10 w-full text-left px-4 py-3.5 sm:px-5 sm:py-4 flex items-center justify-between gap-4 cursor-pointer"
        >
          <div className="min-w-0 flex-1">
            {tag && (
              <p 
                className="text-[9px] font-mono tracking-[0.25em] font-bold uppercase mb-1"
                style={{ color: `hsl(${accent})` }}
              >
                {tag}
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm sm:text-base font-bold text-white tracking-tight font-display">
                {label}
              </span>
              {badge && <div className="shrink-0">{badge}</div>}
            </div>
            {subtitle && (
              <p className="text-xs text-neutral-400 truncate mt-1 font-normal leading-relaxed">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div 
              className="w-7 h-7 rounded-lg flex items-center justify-center border bg-white/[0.03] border-white/10 text-neutral-400 group-hover:text-white group-hover:border-white/20 transition-all"
            >
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </button>
      </div>

      {/* SPLASH OVERLAY / MODAL COM CONTEÚDO INTERNO */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl border border-white/15 bg-neutral-950 p-5 sm:p-6 shadow-2xl shadow-black flex flex-col my-auto"
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Hairline superior do Splash */}
              <div 
                className="absolute top-0 left-0 right-0 h-[2px] opacity-75"
                style={{
                  background: `linear-gradient(90deg, transparent, hsl(${accent}), transparent)`,
                }}
              />

              {/* Botão de Fechar */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar painel"
                className="absolute top-4 right-4 w-8 h-8 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header do Splash */}
              <div className="mb-4 pt-1 pr-8">
                {tag && (
                  <p 
                    className="text-[9px] font-mono tracking-[0.25em] font-bold uppercase mb-1"
                    style={{ color: `hsl(${accent})` }}
                  >
                    {tag}
                  </p>
                )}
                <h3 className="text-xl font-bold text-white tracking-tight font-display">{label}</h3>
                {subtitle && (
                  <p className="text-xs text-neutral-400 mt-1 font-normal">{subtitle}</p>
                )}
              </div>

              {/* Corpo do Splash */}
              <div className="flex-1 overflow-y-auto px-1 py-1">
                {children}
              </div>

              {/* Rodapé com botão de fechar */}
              <div className="mt-5 pt-4 border-t border-white/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-5 py-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/10 text-xs font-semibold text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
