import { Target } from 'lucide-react';
import type { AssessmentRow, HubGoal } from '@/services/assessmentHubService';
import { fmt, fullDate, goalHistory, goalProjection } from '@/services/assessmentMetrics';

export function AssessmentGoalCard({ goal, rows, onReassessment }: { goal: HubGoal; rows: AssessmentRow[]; onReassessment: () => void }) {
  const projection = goalProjection(goal, rows);
  const points = goalHistory(goal, rows);
  const values = points.map(p => p.value);
  const low = Math.min(...values, goal.valor_meta), high = Math.max(...values, goal.valor_meta);
  const point = (value: number, index: number) => `${16 + index * 210 / Math.max(1, points.length - 1)},${78 - (value - low) / Math.max(1, high - low) * 60}`;
  const total = goal.valor_meta - goal.valor_inicial;
  const progress = total ? Math.max(0, Math.min(100, (goal.valor_atual - goal.valor_inicial) / total * 100)) : 100;
  const remaining = total >= 0 ? Math.max(0, goal.valor_meta - goal.valor_atual) : Math.max(0, goal.valor_atual - goal.valor_meta);
  return <section className="aw-goal" aria-label={goal.titulo}>
    <header><div><h3>{goal.titulo}</h3><p className="aw-muted">Meta de {fmt(goal.valor_meta)} {goal.unidade}</p></div><Target size={22} /></header>
    <p className="aw-note">Valor atual registrado na meta. O gráfico e a projeção usam avaliações oficiais compatíveis, não a edição manual desse valor.</p>
    <div className="aw-card"><div className="aw-goal-values"><strong>{fmt(goal.valor_atual)} <small>{goal.unidade}</small></strong><span>de {fmt(goal.valor_meta)} {goal.unidade}</span></div>
      <progress value={progress} max={100} aria-label={`Progresso da meta ${goal.titulo}`} />
      <p>{remaining ? `Faltam ${fmt(remaining)} ${goal.unidade}` : 'Meta alcançada'} · {fmt(progress, 0)}% do caminho</p>
      {goal.prazo && <p className="aw-muted">Prazo definido: {fullDate(goal.prazo)}</p>}
    </div>
    <div className="aw-projection"><h4>Projeção de data</h4>
      {points.length > 0 && <svg viewBox="0 0 320 100" role="img" aria-label={`Medidas oficiais registradas: ${points.map(p => `${fullDate(p.date)}: ${fmt(p.value)} ${goal.unidade}`).join('; ')}. O trecho tracejado indica a meta, não uma data confirmada.`}>
        <polyline points={points.map((p,i) => point(p.value,i)).join(' ')} fill="none" stroke="var(--aw-accent)" strokeWidth="3" strokeLinecap="round" />
        {points.map((p,i) => {const [cx,cy] = point(p.value,i).split(',');return <circle key={p.date} cx={cx} cy={cy} r="4" fill="var(--aw-accent)"/>;})}
        <polyline points={`${point(points.at(-1)!.value,points.length-1)} 306,${78 - (goal.valor_meta - low) / Math.max(1, high - low) * 60}`} fill="none" stroke="var(--aw-muted)" strokeWidth="2" strokeDasharray="4 6"/>
        <text x="306" y="96" textAnchor="end" fill="var(--aw-muted)" fontSize="10">Meta · {fmt(goal.valor_meta)} {goal.unidade}</text>
      </svg>}
      <div className="aw-projection-count" aria-label={`${Math.min(projection.count, 4)} de 4 avaliações necessárias`}>
        {[0, 1, 2, 3].map(i => <span key={i} className={projection.count > i ? 'complete' : ''} />)}
        <p>{Math.min(projection.count, 4)} de 4 avaliações necessárias</p>
      </div>
      {projection.estimate ? <><span className="aw-trust aw-trust-estimado">Estimado</span><p className="aw-projection-date">{fullDate(projection.estimate.date)}</p><p>Faixa estimada: {fullDate(projection.estimate.from)} a {fullDate(projection.estimate.to)}.</p><p className="aw-muted">Tendência das avaliações oficiais do mesmo teste. A faixa expressa a incerteza; a data não é uma garantia.</p></> : <p className="aw-muted">{projection.count < 4 ? 'A data provável aparece a partir de quatro avaliações oficiais do mesmo teste, com faixa de incerteza e selo Estimado.' : 'Ainda não há tendência consistente em direção à meta para estimar uma data.'}</p>}
    </div>
    <button type="button" className="aw-button" onClick={onReassessment}>Ver próxima reavaliação</button>
  </section>;
}
