import type { Attempt } from '@/services/assessmentHubService';
import { fmt } from '@/services/assessmentMetrics';

export function AttemptVelocityChart({ attempts }: { attempts: Attempt[] }) {
  const groups = [...new Set(attempts.filter(t => t.velocidade_ms != null && t.origem_velocidade && Number.isFinite(t.velocidade_ms) && t.velocidade_ms >= 0).map(t => t.teste))];
  if (!groups.length) return <p className="aw-note">O gráfico carga × velocidade aparece quando houver medições de um sensor identificado.</p>;
  return <>{groups.map(test => {
    const points = attempts.filter(t => t.teste === test && t.velocidade_ms != null && t.origem_velocidade && Number.isFinite(t.velocidade_ms) && t.velocidade_ms >= 0).sort((a,b) => a.ordem - b.ordem);
    const maximum = Math.max(...points.map(t => t.velocidade_ms!), .1);
    return <figure key={test} className="aw-chart"><h4>Carga × velocidade da barra · {test}</h4><svg viewBox="0 0 360 170" role="img" aria-label={points.map(t => `${fmt(t.carga_kg)} kg: ${fmt(t.velocidade_ms!,2)} metros por segundo, ${t.valida ? 'válida' : 'inválida'}`).join('; ')}>
      {[45,95,140].map(y => <line key={y} x1="20" x2="340" y1={y} y2={y} className="aw-grid-line"/>)}
      {points.map((attempt,i) => {const x=30+i*300/Math.max(1,points.length-1),height=attempt.velocidade_ms!/maximum*100;return <g key={attempt.id}><rect x={x-12} y={140-height} width="24" height={height} rx="5" fill={attempt.valida?'var(--aw-accent)':'var(--aw-muted)'}/><text x={x} y={132-height} textAnchor="middle" className="aw-chart-value">{fmt(attempt.velocidade_ms!,2)}</text><text x={x} y="163" textAnchor="middle" className="aw-chart-date">{fmt(attempt.carga_kg)} kg</text></g>;})}
    </svg><figcaption>Velocidade medida em m/s · { [...new Set(points.map(t => t.origem_velocidade))].join(', ') }. A velocidade não altera o resultado oficial do teste.</figcaption></figure>;
  })}</>;
}
