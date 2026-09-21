import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X, Maximize2 } from 'lucide-react';

interface CollapsibleRowProps {
  icon?: React.ReactNode;
  /** Cor de acento em HSL (ex: '42 35% 65%') para acabamento refinado de telemetria */
  accent?: string;
  label: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  asSplash?: boolean;
  centered?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Visual High-Tech Telemetry Component (Fit OS):
 * - Letras centralizadas ou alinhadas com alta precisão
 * - Cores sofisticadas e não agressivas com clara diferenciação visual
 * - Modo Splash: abre em modal imersivo com backdrop blur em vez de expandir para baixo
 */
export function CollapsibleRow({ 
  icon, 
  accent = '24 85% 55%', 
  label, 
  subtitle,
  badge,
  defaultOpen = false,
  asSplash = false,
  centered = false,
  children, 
  className = '' 
}: CollapsibleRowProps) {
  const [open, setOpen] = useState(defaultOpen);

  const handleToggle = () => {
    setOpen((prev) => !prev);
  };

  return (
    <>
      <div 
        className={`group relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c0d10] backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:bg-[#121317] shadow-sm ${className}`}
      >
        {/* Subtle accent glow line at top */}
        <div 
          className="absolute top-0 left-0 right-0 h-[1.5px] opacity-40 transition-opacity duration-300 group-hover:opacity-75"
          style={{
            background: `linear-gradient(90deg, transparent, hsl(${accent}), transparent)`,
          }}
        />

        <button
          type="button"
          onClick={handleToggle}
          className={`w-full text-left transition-all ${
            centered 
              ? 'p-3 sm:p-3.5 flex flex-col items-center text-center gap-2' 
              : 'px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between'
          }`}
        >
          {centered ? (
            <>
              {/* Centered layout */}
              <div className="flex items-center justify-between w-full">
                <div className="w-5" /> {/* spacer for visual symmetry */}
                {badge && <div className="shrink-0">{badge}</div>}
                <div 
                  className="w-6 h-6 rounded-md flex items-center justify-center border border-white/10 bg-white/[0.03] text-neutral-400 group-hover:text-white transition-colors"
                  title="Expandir informações"
                >
                  <Maximize2 className="w-3 h-3" />
                </div>
              </div>

              {icon && (
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border my-0.5 transition-transform duration-300 group-hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, hsl(${accent} / 0.18), hsl(${accent} / 0.03))`,
                    borderColor: `hsl(${accent} / 0.35)`,
                    boxShadow: `0 0 16px -4px hsl(${accent} / 0.25)`,
                    color: `hsl(${accent})`,
                  }}
                >
                  {icon}
                </div>
              )}

              <div className="w-full px-1.5">
                <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight leading-snug">
                  {label}
                </h3>
                {subtitle && (
                  <p className="text-[10.5px] text-neutral-400 mt-0.5 max-w-xs mx-auto line-clamp-1 font-normal">
                    {subtitle}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Left-aligned layout */}
              <div className="flex items-center gap-3 min-w-0">
                {icon && (
                  <div
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105"
                    style={{
                      background: `linear-gradient(135deg, hsl(${accent} / 0.18), hsl(${accent} / 0.03))`,
                      borderColor: `hsl(${accent} / 0.35)`,
                      boxShadow: `0 0 12px -3px hsl(${accent} / 0.2)`,
                      color: `hsl(${accent})`,
                    }}
                  >
                    {icon}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">{label}</span>
                    {badge && <div className="shrink-0">{badge}</div>}
                  </div>
                  {subtitle && (
                    <p className="text-[10.5px] text-neutral-400 truncate mt-0.5 font-normal">{subtitle}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-2 shrink-0">
                <div className="w-6 h-6 rounded-md flex items-center justify-center border bg-white/[0.03] border-white/10 text-neutral-400 group-hover:text-white transition-colors">
                  {asSplash ? <Maximize2 className="w-3 h-3" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </div>
            </>
          )}
        </button>

        {/* Fallback accordion for non-splash mode */}
        {!asSplash && (
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden border-t border-white/5"
              >
                <div className="p-4 bg-black/20">{children}</div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Splash Modal Overlay when asSplash = true */}
      {asSplash && (
        <AnimatePresence>
          {open && (
            <motion.div
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            >
              <motion.div
                className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-3xl border border-white/15 bg-neutral-950 p-5 sm:p-6 shadow-2xl shadow-black flex flex-col my-auto"
                initial={{ scale: 0.94, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 15 }}
                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Top accent glow line */}
                <div 
                  className="absolute top-0 left-0 right-0 h-[2px] opacity-70"
                  style={{
                    background: `linear-gradient(90deg, transparent, hsl(${accent}), transparent)`,
                  }}
                />

                {/* Close Button */}
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Fechar painel"
                  className="absolute top-4 right-4 w-8 h-8 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Centered Modal Header */}
                <div className="flex flex-col items-center text-center mb-5 pt-1">
                  {icon && (
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center border mb-3 shadow-lg"
                      style={{
                        background: `linear-gradient(135deg, hsl(${accent} / 0.22), hsl(${accent} / 0.04))`,
                        borderColor: `hsl(${accent} / 0.4)`,
                        boxShadow: `0 0 24px -4px hsl(${accent} / 0.35)`,
                        color: `hsl(${accent})`,
                      }}
                    >
                      {icon}
                    </div>
                  )}

                  <div className="flex flex-col items-center gap-1.5 mb-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-white tracking-tight">{label}</h3>
                    </div>
                    {badge && <div>{badge}</div>}
                  </div>

                  {subtitle && (
                    <p className="text-xs text-neutral-400 max-w-sm mt-1">{subtitle}</p>
                  )}
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto px-1 py-1">
                  {children}
                </div>

                {/* Footer Dismiss Button */}
                <div className="mt-5 pt-4 border-t border-white/10 flex justify-center">
                  <button
                    onClick={() => setOpen(false)}
                    className="px-6 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/10 text-xs font-semibold text-neutral-300 hover:text-white transition-colors"
                  >
                    Fechar painel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </>
  );
}
