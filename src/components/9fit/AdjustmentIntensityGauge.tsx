import type { PointerEvent } from 'react';

export function AdjustmentIntensityGauge({ value, onChange, disabled }: { value: number; onChange: (value: number) => void; disabled?: boolean }) {
  const update = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const angle = Math.atan2(bounds.bottom - 15 - event.clientY, event.clientX - (bounds.left + bounds.width / 2));
    onChange(Math.round(Math.max(0, Math.min(100, (1 - angle / Math.PI) * 100))));
  };
  const angle = Math.PI * (1 - value / 100);
  return <div className="shrink-0">
    <div role="slider" tabIndex={disabled ? -1 : 0} aria-label="Intensidade do treino" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-valuetext={value < 34 ? 'Leve' : value < 67 ? 'Moderada' : 'Alta'} aria-disabled={disabled}
      className="w-[92px] touch-none cursor-grab rounded-lg focus-visible:outline focus-visible:outline-primary active:cursor-grabbing"
      onPointerDown={event => { if (disabled) return; event.currentTarget.setPointerCapture(event.pointerId); update(event); }}
      onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) update(event); }}
      onKeyDown={event => { if (!disabled && ['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'Home', 'End'].includes(event.key)) { event.preventDefault(); onChange(event.key === 'Home' ? 0 : event.key === 'End' ? 100 : Math.max(0, Math.min(100, value + (['ArrowLeft', 'ArrowDown'].includes(event.key) ? -5 : 5)))); } }}>
      <svg viewBox="0 0 100 65" className="w-full" aria-hidden="true">
        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/10" strokeLinecap="round" />
        <path d="M 10 50 A 40 40 0 0 1 90 50" pathLength="100" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray={`${value} 100`} className="text-primary" strokeLinecap="round" />
        <line x1="50" y1="50" x2={50 + 28 * Math.cos(angle)} y2={50 - 28 * Math.sin(angle)} stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <circle cx="50" cy="50" r="4" fill="currentColor" />
      </svg>
    </div>
    {!disabled && <p className="-mt-1 text-center text-[9px] text-muted-foreground">arraste</p>}
  </div>;
}
