import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { useOnboardings } from '@/hooks/useOnboardings';
import { QuickActivation } from './QuickActivation';

const SUB: Record<string, string> = {
  ativacao_rapida: '3 respostas. Seu professor já fica com o essencial.',
  conhecer_app: 'Vídeos curtos de cada parte do app.',
  usar_app: 'Avaliação, plano e seus primeiros treinos.',
};
const CTA: Record<string, { label: string; route?: string }> = {
  ativacao_rapida: { label: 'Fazer ativação rápida' },
  conhecer_app: { label: 'Conhecer o app', route: '/9fit/ativacao?view=onboarding' },
  usar_app: { label: 'Continuar', route: '/9fit/ativacao' },
};

/** Perfil > Onboardings: 1) ativação rápida, 2) conhecer o app, 3) usar o app. */
export function OnboardingsCard() {
  const navigate = useNavigate();
  const query = useOnboardings();
  const [quickOpen, setQuickOpen] = useState(false);
  if (query.isPending) return null;
  if (query.isError || !query.data) {
    return <section className="px-4 mt-5"><button className="w-full rounded-2xl border border-border p-4 text-left text-sm" onClick={() => void query.refetch()}>Não foi possível carregar seus onboardings. Tentar novamente</button></section>;
  }
  const { stages, current } = query.data;
  const allDone = stages.every((s) => s.completed);
  return (
    <section className="px-4 mt-5 space-y-2" aria-label="Onboardings">
      <h2 className="pt-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Onboardings</h2>
      {stages.map((stage, i) => {
        const isCurrent = stage.key === current;
        const cta = CTA[stage.key];
        return (
          <div key={stage.key} className={`rounded-2xl border p-4 space-y-3 ${isCurrent ? 'border-primary/40 bg-primary/[0.04]' : 'border-white/10 bg-white/[0.02]'}`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 shrink-0 rounded-lg bg-primary/15 grid place-items-center text-xs font-display text-primary">{String(i + 1).padStart(2, '0')}</div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-lg leading-tight">{stage.title}</p>
                <p className="text-xs text-muted-foreground">{SUB[stage.key]}</p>
              </div>
              {stage.completed ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> : <span className="text-[11px] font-mono text-muted-foreground tabular-nums">{stage.done}/{stage.total}</span>}
            </div>
            {isCurrent && (
              <>
                <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {stage.steps.map((s) => (
                    <li key={s.key} className="flex items-center gap-2 text-xs text-muted-foreground">
                      {s.done ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> : <Circle className="w-4 h-4 text-white/35 shrink-0" />}
                      <span className="truncate">{s.label}</span>
                    </li>
                  ))}
                </ul>
                <button type="button" className="w-full min-h-11 rounded-xl bg-primary text-primary-foreground text-[11px] font-display uppercase tracking-widest" onClick={() => (cta.route ? navigate(cta.route) : setQuickOpen(true))}>{cta.label}</button>
              </>
            )}
          </div>
        );
      })}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 pt-1 text-xs">
        <Link className="text-primary underline" to="/9fit/profile?section=pdi">Minha ficha completa (opcional)</Link>
        <Link className="text-primary underline" to="/9fit/ativacao">{allDone ? 'Ver minhas missões' : 'Missões e ativações'}</Link>
      </div>
      <QuickActivation open={quickOpen} onClose={() => setQuickOpen(false)} onDone={() => setQuickOpen(false)} />
    </section>
  );
}
