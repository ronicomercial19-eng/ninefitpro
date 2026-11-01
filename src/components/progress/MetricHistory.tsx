import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { assessmentMetrics, assessmentOrder, fmt, fullDate, isSelf, metricValue, trustFor } from '@/services/assessmentMetrics';
import type { AssessmentHub } from '@/services/assessmentHubService';

export function MetricHistory({ hub, assessmentPath }: { hub: AssessmentHub; assessmentPath: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [period, setPeriod] = useState(0);
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - period);
  const rows = [...hub.assessments].filter(row => !period || row.data_avaliacao.slice(0, 10) >= cutoff.toISOString().slice(0, 10)).sort(assessmentOrder);
  const metrics = assessmentMetrics.filter(metric => rows.some(row => metricValue(row, metric.key) !== null));
  const metric = metrics.find(item => item.key === selected);
  const points = metric ? rows.filter(row => metricValue(row, metric.key) !== null) : [];
  return <>
    <div className="aw-chips" aria-label="Período">{[[0, 'Tudo'], [30, '30 dias'], [90, '90 dias']].map(([days, label]) => <button key={days} type="button" aria-pressed={period === days} onClick={() => setPeriod(Number(days))}>{label}</button>)}</div>
    <div className="grid grid-cols-2 gap-3">
      {metrics.map(item => { const latest = [...rows].reverse().find(row => metricValue(row, item.key) !== null)!; return <button type="button" key={item.key} onClick={() => setSelected(item.key)} className="rounded-2xl border border-border/15 bg-card p-4 text-left transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary"><span className="text-xs text-muted-foreground">{item.label}</span><strong className="mt-2 block text-2xl font-display">{fmt(metricValue(latest, item.key)!)} <small className="text-xs font-normal text-muted-foreground">{item.unit}</small></strong><span className="mt-2 block text-[11px] text-muted-foreground">{fullDate(latest.data_avaliacao)} · Ver evolução</span></button>; })}
    </div>
    {!metrics.length && <p className="aw-empty">Suas métricas aparecem aqui assim que uma avaliação for registrada.</p>}
    <button type="button" className="aw-secondary" onClick={() => setSelected('registros')}>Ver avaliações e treinos registrados</button>
    <Dialog open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}>
      <DialogContent className="fitpro-orange max-h-[90dvh] overflow-y-auto rounded-2xl border-border/20 bg-background sm:max-w-2xl">
        <DialogHeader className="border-b border-border/15 pb-4 pr-7"><DialogTitle>{metric?.label ?? 'Seus registros'}</DialogTitle><DialogDescription>{metric ? 'Todas as suas medidas, em ordem de data. A origem e o método acompanham cada registro.' : 'Avaliações e treinos em um só lugar.'}</DialogDescription></DialogHeader>
        {metric ? <div className="space-y-3">
          <p className="text-3xl font-display">{points.length ? fmt(metricValue(points.at(-1)!, metric.key)!) : '—'} <small className="text-sm text-muted-foreground">{metric.unit}</small></p>
          <MetricPlot values={points.map(row => ({ value: metricValue(row, metric.key)!, date: row.data_avaliacao }))} unit={metric.unit}/>
          <p className="text-xs text-muted-foreground">Métodos diferentes podem produzir resultados diferentes. Os valores são exibidos como registrados.</p>
          {[...points].reverse().map(row => <Link key={row.id} to={`${assessmentPath}/${row.id}`} onClick={() => setSelected(null)} className="flex items-center justify-between gap-3 rounded-xl border border-border/15 bg-card p-4"><span className="text-sm">{fullDate(row.data_avaliacao)}<small className="mt-1 block text-muted-foreground">{isSelf(row) ? 'Informado por você' : row.avaliador_nome || 'Avaliação profissional'}{trustFor(row, metric) === 'ESTIMADO' ? ' · Estimado' : ''}</small></span><strong>{fmt(metricValue(row, metric.key)!)} {metric.unit}</strong></Link>)}
        </div> : <><div className="space-y-2">{[...rows].reverse().map(row => <Link key={row.id} className="block rounded-xl border border-border/15 p-3 text-sm" to={`${assessmentPath}/${row.id}`} onClick={() => setSelected(null)}>Avaliação · {fullDate(row.data_avaliacao)}<span className="block text-xs text-muted-foreground">{assessmentMetrics.filter(item => metricValue(row, item.key) !== null).length} métricas registradas</span></Link>)}</div><h3 className="font-semibold">Treinos concluídos</h3>{hub.workouts.length ? [...hub.workouts].reverse().map(workout => <div key={workout.id} className="rounded-xl border border-border/15 p-3 text-sm"><strong>{workout.name}</strong><p className="text-xs text-muted-foreground">{fullDate(workout.date)}{workout.volumeKg != null ? ` · ${fmt(workout.volumeKg)} kg de volume` : ''}</p></div>) : <p className="text-sm text-muted-foreground">Seus treinos aparecerão aqui ao concluir uma sessão.</p>}<h3 className="font-semibold">Cargas registradas</h3>{[...hub.loads].reverse().slice(0, 50).map(load => <div key={load.id} className="flex justify-between gap-3 border-b border-border/15 py-2 text-sm"><span>{load.exercise}<small className="block text-muted-foreground">{fullDate(load.date)}</small></span><strong>{fmt(load.kg)} kg{load.reps != null ? ` × ${load.reps}` : ''}</strong></div>)}</>}
      </DialogContent>
    </Dialog>
  </>;
}

function MetricPlot({ values, unit }: { values: { value: number; date: string }[]; unit: string }) {
  if (!values.length) return null;
  const low = Math.min(...values.map(point => point.value));
  const span = Math.max(1, Math.max(...values.map(point => point.value)) - low);
  const x = (index: number) => values.length === 1 ? 160 : 20 + index * 280 / (values.length - 1);
  const y = (value: number) => 120 - (value - low) / span * 90;
  return <svg viewBox="0 0 320 155" className="h-44 w-full" role="img" aria-label={`Evolução: ${values.map(point => `${fullDate(point.date)}: ${fmt(point.value)} ${unit}`).join('; ')}`}>
    <polyline points={values.map((point, index) => `${x(index)},${y(point.value)}`).join(' ')} fill="none" stroke="hsl(var(--primary))" strokeWidth="2"/>
    {values.map((point, index) => <g key={index}><circle cx={x(index)} cy={y(point.value)} r="4" fill="hsl(var(--primary))"/><title>{fullDate(point.date)}: {fmt(point.value)} {unit}</title>{(index === 0 || index === values.length - 1) && <text x={x(index)} y="149" textAnchor="middle" fill="currentColor" fontSize="9">{fullDate(point.date).slice(0,5)}</text>}</g>)}
  </svg>;
}
