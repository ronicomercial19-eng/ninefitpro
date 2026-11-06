import { Activity, Dumbbell, HeartPulse, Ruler, Target, Timer } from 'lucide-react';

const ICONS = [Dumbbell, Activity, HeartPulse, Timer, Ruler, Target, Dumbbell, HeartPulse];
const FADE = 'linear-gradient(to bottom, #000 35%, transparent 100%)';
const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

/**
 * Fundo do paywall: gradiente azul/laranja, grade de tiles de vidro e grain,
 * tudo com fade pro preto. Camada decorativa: o pai precisa ser `relative`.
 * Estático de propósito (sem animação) pra não pesar no celular.
 */
export function PlansHeroBackdrop({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const tiles = ICONS.slice(0, size === 'lg' ? 8 : 4);
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 top-0 overflow-hidden ${size === 'lg' ? 'h-[380px]' : 'h-[220px]'}`}
      style={{ WebkitMaskImage: FADE, maskImage: FADE }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 0% 10%, #1a9fd6 0%, transparent 70%), radial-gradient(60% 50% at 100% 15%, #e8914a 0%, transparent 70%)',
          opacity: 0.9,
        }}
      />
      <div className="absolute inset-x-[-24px] top-6 grid grid-cols-4 gap-3">
        {tiles.map((Icon, i) => (
          <div
            key={i}
            className={`grid aspect-square place-items-center rounded-[28px] border border-white/10 bg-white/[0.06] backdrop-blur-md ${i % 2 ? 'translate-y-8' : ''}`}
          >
            <Icon className="h-8 w-8 text-white/55" strokeWidth={1.5} />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
    </div>
  );
}
