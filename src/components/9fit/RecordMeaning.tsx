import type { DailyContext } from '@/services/dailyContextRules';
import { studentEvidence } from '@/lib/studentGuidance';

export function RecordMeaning({ context }: { context: DailyContext | null | undefined }) {
  const evidence = studentEvidence(context);
  if (!evidence.length) return null;
  return <details className="group mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
    <summary className="min-h-11 cursor-pointer text-sm font-semibold text-foreground focus-visible:outline focus-visible:outline-primary">Dos seus registros ao próximo passo <span className="block pt-1 text-xs font-normal text-muted-foreground">Entenda o que o 9FIT usa — e o que ainda precisa da sua confirmação.</span></summary>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">{evidence.map((item, index) => <div key={item.title} className="min-w-0 rounded-xl border border-primary/15 bg-background/50 p-3"><p className="text-[10px] uppercase tracking-widest text-primary">0{index + 1} / {item.title}</p><p className="mt-2 text-sm font-semibold text-foreground">{item.value}</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.use}</p></div>)}</div>
    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">SYNC é um resumo do dia. No Treino, confira a decisão da sessão; em Progresso, compare seu histórico. O número sozinho não mede sua saúde.</p>
  </details>;
}
