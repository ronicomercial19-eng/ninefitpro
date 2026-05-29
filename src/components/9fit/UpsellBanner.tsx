import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, X } from 'lucide-react';
import { ContextualPaywall } from './ContextualPaywall';
import type { MonetizationContext } from '@/services/monetization';
import { trackMonetizationEvent } from '@/services/monetization';
import { cn } from '@/lib/utils';

interface Props {
  context: MonetizationContext;
  storageKey: string;            // chave única para cooldown localStorage
  headline?: string;
  cta?: string;
  cooldownHours?: number;        // default 24h
  variant?: 'amber' | 'cyan' | 'primary';
  className?: string;
}

const VARIANT_STYLE: Record<NonNullable<Props['variant']>, { border: string; from: string; to: string; icon: string }> = {
  primary: { border: 'hsl(var(--primary) / 0.35)', from: 'hsl(var(--primary) / 0.12)', to: 'transparent', icon: 'hsl(var(--primary))' },
  amber:   { border: 'hsl(38 95% 55% / 0.35)',     from: 'hsl(38 95% 55% / 0.10)',     to: 'transparent', icon: 'hsl(38 95% 60%)' },
  cyan:    { border: 'hsl(190 95% 50% / 0.35)',    from: 'hsl(190 95% 50% / 0.10)',    to: 'transparent', icon: 'hsl(190 95% 55%)' },
};

/**
 * Banner glassmorphism contextual. Dismissable com cooldown via localStorage.
 * Abre ContextualPaywall ao clicar.
 */
export function UpsellBanner({
  context,
  storageKey,
  headline = 'Desbloqueie agentes IA completos e protocolos exclusivos',
  cta = 'Testar 7 dias grátis',
  cooldownHours = 24,
  variant = 'primary',
  className,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const style = VARIANT_STYLE[variant];
  const fullKey = `9fit_upsell_${storageKey}_dismissed`;

  useEffect(() => {
    const last = Number(localStorage.getItem(fullKey) || 0);
    const elapsed = Date.now() - last;
    if (elapsed > cooldownHours * 3600_000) setVisible(true);
  }, [fullKey, cooldownHours]);

  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem(fullKey, String(Date.now()));
    trackMonetizationEvent('dismiss_paywall', null, context);
    setVisible(false);
  };

  if (!visible) return <ContextualPaywall open={paywallOpen} onClose={() => setPaywallOpen(false)} context={context} />;

  return (
    <>
      <AnimatePresence>
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          onClick={() => setPaywallOpen(true)}
          className={cn(
            'w-full rounded-2xl p-3.5 flex items-center gap-3 backdrop-blur-xl text-left transition-all hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden',
            className,
          )}
          style={{
            border: `1px solid ${style.border}`,
            background: `linear-gradient(135deg, ${style.from} 0%, ${style.to} 100%), hsl(var(--card) / 0.4)`,
          }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: style.icon + '22', border: `1px solid ${style.icon}40` }}
          >
            <Sparkles className="w-4 h-4" style={{ color: style.icon }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] tracking-[0.3em] uppercase font-bold mb-0.5" style={{ color: style.icon }}>
              9FIT PRIME
            </p>
            <p className="text-[13px] text-foreground font-semibold leading-snug truncate">{headline}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{cta} · cancele quando quiser</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          <button
            onClick={dismiss}
            aria-label="Dispensar"
            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full hover:bg-white/10 flex items-center justify-center text-muted-foreground"
          >
            <X className="w-3 h-3" />
          </button>
        </motion.button>
      </AnimatePresence>
      <ContextualPaywall open={paywallOpen} onClose={() => setPaywallOpen(false)} context={context} />
    </>
  );
}
