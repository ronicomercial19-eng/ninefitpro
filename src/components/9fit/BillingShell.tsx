import { ArrowLeft, Check, CreditCard, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PlansGlow } from './PlansHero';

export type BillingStep = 'plan' | 'checkout' | 'confirmation';

const steps: Array<{ key: BillingStep; label: string }> = [
  { key: 'plan', label: 'Plano' },
  { key: 'checkout', label: 'Pagamento' },
  { key: 'confirmation', label: 'Confirmação' },
];

export function BillingShell({
  children,
  step,
  title,
  eyebrow = '9FIT · PRIME',
  backTo = '/9fit/planos',
  backLabel = 'Voltar aos planos',
}: {
  children: React.ReactNode;
  step: BillingStep;
  title: string;
  eyebrow?: string;
  backTo?: string;
  backLabel?: string;
}) {
  const activeIndex = steps.findIndex((item) => item.key === step);

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-background pb-16 text-foreground">
      <PlansGlow className="opacity-80" />
      <header className="relative border-b border-white/[0.08] bg-black/30 px-4 pb-5 pt-5 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <Link to={backTo} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-3 text-xs font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{backLabel}</span>
            <span className="sm:hidden">Voltar</span>
          </Link>
          <span className="font-data text-[10px] font-bold uppercase tracking-[0.24em] text-primary">{eyebrow}</span>
        </div>
        <div className="mx-auto mt-6 max-w-2xl">
          <div className="flex items-center gap-2" aria-label="Etapas da contratação">
            {steps.map((item, index) => {
              const complete = index < activeIndex;
              const current = index === activeIndex;
              return (
                <div key={item.key} className="flex min-w-0 flex-1 items-center gap-2">
                  <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[10px] font-bold transition ${complete ? 'border-primary bg-primary text-primary-foreground' : current ? 'border-primary bg-primary/15 text-primary' : 'border-white/15 text-muted-foreground'}`}>
                    {complete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  </div>
                  <span className={`truncate text-[10px] font-semibold uppercase tracking-[0.14em] ${current ? 'text-foreground' : 'text-muted-foreground'}`}>{item.label}</span>
                  {index < steps.length - 1 && <div className={`h-px min-w-3 flex-1 ${index < activeIndex ? 'bg-primary/70' : 'bg-white/10'}`} />}
                </div>
              );
            })}
          </div>
        </div>
      </header>
      <div className="relative mx-auto max-w-2xl px-4 pt-8 sm:px-6">
        <div className="mb-6 flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-[0_10px_30px_-14px_hsl(var(--primary))]">
            {step === 'confirmation' ? <ShieldCheck className="h-5 w-5" /> : step === 'checkout' ? <CreditCard className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-label text-primary">{step === 'confirmation' ? 'Status da compra' : step === 'checkout' ? 'Contratação segura' : 'Escolha seu acesso'}</p>
            <h1 className="mt-1 font-display text-3xl leading-tight tracking-tight sm:text-4xl">{title}</h1>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}

export function BillingCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[1.35rem] border border-white/[0.10] bg-card/80 p-5 shadow-card-premium backdrop-blur-md sm:p-6 ${className}`}>{children}</section>;
}
