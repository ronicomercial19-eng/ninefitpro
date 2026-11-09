import type { ReactNode } from 'react';

export function StudentSectionHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return <header className="relative z-10 border-b border-white/[0.06] px-4 pb-4 pt-5">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />
          <p className="font-data text-[10px] font-bold uppercase tracking-[0.18em] text-primary">{kicker}</p>
        </div>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  </header>;
}
