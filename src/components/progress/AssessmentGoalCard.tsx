import React, { useId, useState, useEffect, useRef } from 'react';
import { Target, ArrowUpRight, CalendarDays, ChevronDown } from 'lucide-react';
import type { AssessmentRow, HubGoal } from '@/services/assessmentHubService';
import { fmt, fullDate, goalHistory, goalProjection, goalMetric } from '@/services/assessmentMetrics';

export function AssessmentGoalCard({ goal, rows, onReassessment }: { goal: HubGoal; rows: AssessmentRow[]; onReassessment: () => void }) {
  const projection = goalProjection(goal, rows);
  const projectionAvailable = !!goalMetric(goal);
  const points = goalHistory(goal, rows);
  const total = goal.valor_meta - goal.valor_inicial;
  const valid = [goal.valor_inicial,goal.valor_atual,goal.valor_meta].every(Number.isFinite) && total!==0;
  const progress = valid ? Math.max(0, Math.min(100, (goal.valor_atual - goal.valor_inicial) / total * 100)) : 0;
  const remaining = total >= 0 ? Math.max(0, goal.valor_meta - goal.valor_atual) : Math.max(0, goal.valor_atual - goal.valor_meta);
  return <section className="aw-goal" aria-label={goal.titulo}>
    <header><div><p className="pa-kicker">SEU OBJETIVO</p><h3>{goal.titulo}</h3><p className="aw-muted">Meta de {fmt(goal.valor_meta)} {goal.unidade}</p></div><span className="pa-goal-symbol"><Target size={24} aria-hidden="true"/></span></header>
    <div className="pa-goal-snapshot"><div className="pa-goal-ring"><svg viewBox="0 0 120 120" role="img" aria-label={`${fmt(progress,0)}% do caminho`}><circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeOpacity=".1" strokeWidth="7"/><circle cx="60" cy="60" r="50" fill="none" stroke="var(--aw-accent)" strokeWidth="7" strokeLinecap="round" pathLength="100" strokeDasharray={`${progress} 100`} transform="rotate(-90 60 60)"/></svg><strong>{fmt(progress,0)}<small>%</small></strong></div><div className="pa-goal-current"><span>Valor atual · registrado na meta</span><strong>{fmt(goal.valor_atual)} <small>{goal.unidade}</small></strong><p>{!valid ? 'Meta precisa de revisão: valor inicial e alvo devem ser válidos e diferentes.' : remaining ? `Faltam ${fmt(remaining)} ${goal.unidade}` : 'Meta alcançada'}</p></div></div>
    <div className="pa-goal-milestones"><div><span>Ponto de partida</span><strong>{fmt(goal.valor_inicial)} <small>{goal.unidade}</small></strong></div><ArrowUpRight size={18} aria-hidden="true"/><div><span>Seu alvo</span><strong>{fmt(goal.valor_meta)} <small>{goal.unidade}</small></strong></div><div><span><CalendarDays size={12} aria-hidden="true"/> Prazo definido</span><strong>{goal.prazo?fullDate(goal.prazo):'Sem prazo'}</strong></div></div>
    <div className="aw-projection"><div className="pa-section-heading"><div><p className="pa-kicker">HISTÓRICO OFICIAL</p><h4>Medidas e projeção</h4></div><span className="pa-chart-key">Linha tracejada = alvo</span></div>
      {points.length > 0 ? <GoalPlot points={points} goal={goal}/> : <div className="pa-goal-chart-empty"><Target size={28} aria-hidden="true"/><p>Seu histórico começa no próximo registro oficial.</p><small>As medidas compatíveis com esta meta aparecerão aqui.</small></div>}
      {projectionAvailable && <div className="aw-projection-count" aria-label={`${Math.min(projection.count, 4)} de 4 avaliações necessárias`}>
        {[0, 1, 2, 3].map(i => <span key={i} className={projection.count > i ? 'complete' : ''} />)}
        <p>{Math.min(projection.count, 4)} de 4 avaliações necessárias</p>
      </div>}
      {!projectionAvailable ? <p className="aw-muted">Acompanhamento manual. Sem fonte compatível para projeção automática de data.</p> : projection.estimate ? <><span className="aw-trust aw-trust-estimado">Estimado</span><p className="aw-projection-date">{fullDate(projection.estimate.date)}</p><p>Faixa estimada: {fullDate(projection.estimate.from)} a {fullDate(projection.estimate.to)}.</p><p className="aw-muted">Tendência das avaliações oficiais do mesmo teste. A faixa expressa a incerteza; a data não é uma garantia.</p></> : <p className="aw-muted">{projection.count < 4 ? 'A data provável aparece a partir de quatro avaliações oficiais do mesmo teste, com faixa de incerteza e selo Estimado.' : 'Ainda não há tendência consistente em direção à meta para estimar uma data.'}</p>}
    </div>
    <details className="pa-goal-method"><summary>Como estes dados são calculados <ChevronDown size={15} aria-hidden="true"/></summary><p className="aw-note">Valor atual registrado na meta. O gráfico e a projeção usam avaliações oficiais compatíveis, não a edição manual desse valor.</p><p className="aw-note">Métrica cadastrada: {goal.metrica} · unidade: {goal.unidade}. Confirme se correspondem ao objetivo do título.</p></details>
    <button type="button" className="aw-button" onClick={onReassessment}>Ver próxima reavaliação <ArrowUpRight size={17} aria-hidden="true"/></button>
  </section>;
}

function GoalPlot({points,goal}:{points:{date:string;value:number}[];goal:HubGoal}) {
  const [selected,setSelected]=useState<number|null>(null);
  const host=useRef<HTMLElement>(null);
  const [width,setWidth]=useState(600);
  useEffect(()=>{if(!host.current)return;const observer=new ResizeObserver(([entry])=>setWidth(Math.max(240,Math.min(600,Math.round(entry.contentRect.width)))));observer.observe(host.current);return()=>observer.disconnect();},[]);
  const id=useId().replace(/:/g,'');
  const active=Math.min(selected??points.length-1,points.length-1);
  const low=Math.min(...points.map(p=>p.value),goal.valor_meta),high=Math.max(...points.map(p=>p.value),goal.valor_meta);
  const y=(value:number)=>145-(value-low)/Math.max(1,high-low)*110;
  const times=points.map(p=>new Date(p.date.slice(0,10)+'T12:00:00Z').getTime());
  const span=times.at(-1)!-times[0];
  const x=(i:number)=>span?38+(times[i]-times[0])/span*(width-76):width/2;
  const line=points.map((p,i)=>`${i?'L':'M'} ${x(i)},${y(p.value)}`).join(' ');
  return <figure ref={host} className="pa-goal-chart"><div className="pa-chart-reading" aria-live="polite"><strong>{fmt(points[active].value)} {goal.unidade}</strong><span>{fullDate(points[active].date)} · avaliação oficial</span></div><svg viewBox={`0 0 ${width} 184`} role="group" aria-label="Histórico oficial da meta. Selecione uma medida para consultar.">
    <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop stopColor="var(--aw-accent)" stopOpacity=".2"/><stop offset="1" stopColor="var(--aw-accent)" stopOpacity="0"/></linearGradient></defs>
    {[35,90,145].map(v=><line key={v} x1="24" x2={width-24} y1={v} y2={v} stroke="currentColor" strokeOpacity=".08"/>)}
    <path d={`${line} L ${x(points.length-1)},155 L ${x(0)},155 Z`} fill={`url(#${id})`}/><path d={line} fill="none" stroke="var(--aw-accent)" strokeWidth="2.5"/>
    <line x1="24" x2={width-24} y1={y(goal.valor_meta)} y2={y(goal.valor_meta)} stroke="var(--aw-muted)" strokeDasharray="5 6"/><text x={width-24} y={y(goal.valor_meta)-10} textAnchor="end" fill="var(--aw-muted)" fontSize="11">Alvo · {fmt(goal.valor_meta)} {goal.unidade}</text>
    {points.map((p,i)=><g key={p.date+'-'+i}  aria-label={`${fullDate(p.date)}: ${fmt(p.value)} ${goal.unidade}`} onMouseEnter={()=>setSelected(i)} onFocus={()=>setSelected(i)} onClick={()=>setSelected(i)}><circle cx={x(i)} cy={y(p.value)} r="14" fill="transparent"/><circle cx={x(i)} cy={y(p.value)} r={active===i?6:4} fill="var(--aw-accent)" stroke="hsl(var(--card))" strokeWidth="2"/>{(i===0||i===points.length-1)&&<text x={x(i)} y="178" textAnchor="middle" fill="var(--aw-muted)" fontSize="10">{fullDate(p.date).slice(0,5)}</text>}</g>)}
  </svg><div className="pa-chart-selectors" aria-label="Selecionar avaliação">{points.map((p,i)=><button key={p.date+'-'+i} type="button" aria-pressed={active===i} aria-label={`${fullDate(p.date)}: ${fmt(p.value)} ${goal.unidade}`} onClick={()=>setSelected(i)}>{fullDate(p.date).slice(0,5)}</button>)}</div><figcaption>Toque nos pontos para explorar. A linha tracejada marca o valor-alvo.</figcaption></figure>;
}
