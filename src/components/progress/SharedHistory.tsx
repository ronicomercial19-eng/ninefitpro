import { useEffect, useMemo, useState } from 'react';
import { Activity, ChevronDown, Dumbbell, History, RefreshCw, Sparkles, Trophy } from 'lucide-react';
import { loadProgressHistory, type HistoryAssessment, type ProgressHistory } from '@/services/progressHistoryService';
import { invalidateAssessmentHub, type AssessmentRow } from '@/services/assessmentHubService';
import { compatibleMetric, assessmentMetrics, trustFor } from '@/services/assessmentMetrics';

type Panel = 'corpo' | 'performance' | 'historico';
type MetricKey = 'peso' | 'gordura_corporal' | 'massa_muscular' | 'circunferencia_cintura' | 'score_global';
const metrics: { key: MetricKey; label: string; unit: string }[] = [
  { key: 'peso', label: 'Peso', unit: 'kg' },
  { key: 'gordura_corporal', label: 'Gordura corporal', unit: '%' },
  { key: 'massa_muscular', label: 'Massa muscular', unit: 'kg' },
  { key: 'circunferencia_cintura', label: 'Cintura', unit: 'cm' },
  { key: 'score_global', label: 'Score da avaliação', unit: 'pts' },
];
const format = (value: number, digits = 1) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits }).format(value);
const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
const numeric = (value: number | null | undefined) => value == null || !Number.isFinite(Number(value)) ? null : Number(value);

function Plot({ points, unit, color = 'hsl(var(--primary))' }: { points: { date: string; value: number }[]; unit: string; color?: string }) {
  if (!points.length) return <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-border/15 text-center text-sm text-muted-foreground">Ainda não há medidas registradas para este gráfico.</div>;
  const values = points.map(p => p.value);
  const min = Math.min(...values), max = Math.max(...values);
  const spread = Math.max(max - min, 1);
  const position = (p: { value: number }, i: number) => ({ x: points.length === 1 ? 160 : 30 + i * 260 / (points.length - 1), y: 150 - (p.value - min) / spread * 105 });
  const line = points.map((p, i) => { const { x, y } = position(p, i); return `${x},${y}`; }).join(' ');
  return <div className="rounded-xl border border-border/10 bg-muted/30 px-2 pt-3">
    <svg viewBox="0 0 320 190" className="h-52 w-full" role="img" aria-label={`Evolução de ${points.length} registros: ${format(points[0].value)} para ${format(points[points.length - 1].value)} ${unit}`}>
      {[45, 97, 150].map(y => <line key={y} x1="30" x2="290" y1={y} y2={y} stroke="hsl(var(--border)/.1)" />)}
      {points.length > 1 && <polyline points={line} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
      {points.map((p, i) => { const { x, y } = position(p, i); return <g key={`${p.date}-${i}`}><circle cx={x} cy={y} r="5" fill={color} stroke="hsl(var(--card))" strokeWidth="2" /><text x={x} y={Math.max(y - 12, 18)} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="10">{format(p.value)}</text>{(i === 0 || i === points.length - 1 || points.length <= 5) && <text x={x} y="180" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="9">{dateLabel(p.date)}</text>}</g>; })}
    </svg>
  </div>;
}

function SourceBadge({ children }: { children: React.ReactNode }) { return <span className="rounded-md border border-border/10 bg-elevated px-2 py-1 font-mono text-[10px] text-muted-foreground">{children}</span>; }
function Empty({ children }: { children: React.ReactNode }) { return <div className="rounded-xl border border-dashed border-border/15 p-8 text-center text-sm text-muted-foreground">{children}</div>; }

export function SharedHistory({ athleteId, compact = false }: { athleteId: string; compact?: boolean }) {
  const [data, setData] = useState<ProgressHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel | null>('corpo');
  const [metric, setMetric] = useState<MetricKey | null>(null);
  const [exercise, setExercise] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision(n => n + 1);
    window.addEventListener('focus', refresh);
    window.addEventListener('9fit:sync_updated', refresh);
    window.addEventListener('9fit:workout-updated', refresh);
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('9fit:sync_updated', refresh); window.removeEventListener('9fit:workout-updated', refresh); };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(null); setData(null);
    loadProgressHistory(athleteId).then(result => { if (active) setData(result); }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o histórico.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [athleteId, revision]);

  const assessments = data?.assessments ?? [];
  const workouts = data?.workouts ?? [];
  const loads = data?.loads ?? [];
  const records = data?.records ?? [];
  const latestScore = [...assessments].reverse().find(a => a.oficial && numeric(a.score_global) != null)?.score_global;
  const activeMetric = metric ?? metrics.find(item => assessments.some(a => numeric(a[item.key]) != null))?.key ?? 'peso';
  const metricInfo = metrics.find(m => m.key === activeMetric)!;
  const metricPoints = compatibleHistory(assessments,activeMetric).flatMap(a => { const value = numeric(a[activeMetric]); return value == null || (activeMetric === 'score_global' && !a.oficial) ? [] : [{ date: a.data_avaliacao, value }]; });
  const exerciseNames = useMemo(() => [...new Set(loads.map(l => l.exercise))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [loads]);
  const selectedExercise = exercise && exerciseNames.includes(exercise) ? exercise : exerciseNames[0];
  const selectedLoads = loads.filter(l => l.exercise === selectedExercise);
  const dailyMaximum = new Map<string, number>();
  selectedLoads.forEach(load => dailyMaximum.set(load.date, Math.max(load.kg, dailyMaximum.get(load.date) ?? 0)));
  const loadPoints = [...dailyMaximum].map(([date, value]) => ({ date, value }));
  const firstDate = assessments[0]?.data_avaliacao;
  const since = firstDate ? workouts.filter(w => w.date >= firstDate).length : workouts.length;
  const latestWeight = [...assessments].reverse().find(a => numeric(a.peso) != null)?.peso;
  const deltaWeight = metricDelta(assessments, 'peso');
  const bodyFatDelta = metricDelta(assessments, 'gordura_corporal');
  const firstLoad = selectedLoads[0], lastLoad = selectedLoads[selectedLoads.length - 1];

  return <section className={`space-y-4 text-foreground ${compact ? '' : 'mt-6'}`} aria-label="Histórico integrado de avaliações e treinos">
    <div className="rounded-2xl border border-border/10 bg-gradient-to-br from-primary/5 via-card to-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">9FIT · Progress Tracker</p><h2 className="mt-1 font-display text-2xl font-bold">Histórico integrado</h2><p className="mt-1 text-sm text-muted-foreground">Avaliações e treinos no mesmo banco, com a origem de cada registro.</p></div><button type="button" onClick={() => { invalidateAssessmentHub(athleteId); setRevision(n => n + 1); }} className="rounded-lg border border-border/15 p-2 text-muted-foreground hover:text-foreground" aria-label="Atualizar histórico"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button></div>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Summary label="Score oficial" value={latestScore == null ? '—' : format(Number(latestScore), 0)} unit="pts" />
        <Summary label="Peso atual" value={latestWeight == null ? '—' : format(Number(latestWeight))} unit="kg" detail={deltaWeight == null ? undefined : `${deltaWeight > 0 ? '+' : ''}${format(deltaWeight)} kg vs primeiro registro`} />
        <Summary label="Avaliações" value={String(assessments.length)} unit="registros" />
        <Summary label="Treinos" value={String(since)} unit={firstDate ? 'desde a avaliação inicial' : 'concluídos'} />
      </div>
    </div>

    {loading && <p className="py-6 text-center text-sm text-muted-foreground">Carregando avaliações e treinos…</p>}
    {error && <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm"><p>{error}</p><button type="button" className="mt-2 text-primary underline" onClick={() => setRevision(n => n + 1)}>Tentar novamente</button></div>}
    {!loading && !error && data && <>
      <div className="rounded-xl border border-border/10 bg-card p-4"><div className="flex items-center gap-2 text-primary"><Sparkles className="h-4 w-4" /><h3 className="font-semibold">Leitura dos seus registros</h3></div><div className="mt-3 grid gap-2 sm:grid-cols-3 text-xs text-foreground/80">
        <Insight source="Avaliações" text={bodyFatDelta == null ? 'Registre duas medidas de gordura corporal para comparar a evolução.' : `Gordura corporal: ${bodyFatDelta > 0 ? '+' : ''}${format(bodyFatDelta)} pontos percentuais entre a primeira e a última medida.`} />
        <Insight source="Treinos FitPro + Progress" text={firstLoad && lastLoad && firstLoad.id !== lastLoad.id ? `${selectedExercise}: ${format(firstLoad.kg)} → ${format(lastLoad.kg)} kg de carga registrada.` : 'Registre séries concluídas para acompanhar a carga por exercício.'} />
        <Insight source="Sessões concluídas" text={since ? `${since} treinos registrados${firstDate ? ' desde a avaliação inicial' : ''}.` : 'Os treinos concluídos aparecerão aqui conforme forem registrados.'} />
      </div><p className="mt-3 text-[11px] text-muted-foreground">As comparações mostram registros observados; carga de treino não é teste de 1RM.</p></div>
      <div className="grid gap-2 sm:grid-cols-3">
        {([{ id: 'corpo', title: 'Corpo', desc: 'Composição e medidas', count: `${assessments.length} avaliações`, Icon: Activity }, { id: 'performance', title: 'Performance física', desc: 'Testes, cargas e recordes', count: `${exerciseNames.length} exercícios`, Icon: Dumbbell }, { id: 'historico', title: 'Histórico', desc: 'Treinos e linha do tempo', count: `${workouts.length} treinos`, Icon: History }] as const).map(tab => <button key={tab.id} type="button" aria-expanded={panel === tab.id} onClick={() => setPanel(panel === tab.id ? null : tab.id)} className={`rounded-xl border p-4 text-left transition-colors ${panel === tab.id ? 'border-primary/30 bg-primary/10' : 'border-border/10 bg-card hover:border-primary/30'}`}><div className="flex justify-between"><tab.Icon className="h-5 w-5 text-primary" /><ChevronDown className={`h-4 w-4 transition-transform ${panel === tab.id ? 'rotate-180' : ''}`} /></div><h3 className="mt-3 font-display text-lg font-bold">{tab.title}</h3><p className="text-xs text-muted-foreground">{tab.desc}</p><p className="mt-3 font-mono text-[10px] text-primary">{tab.count}</p></button>)}
      </div>
      {panel === 'corpo' && <div className="grid gap-3 lg:grid-cols-2"><div className="rounded-xl border border-border/10 bg-card p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold">Evolução corporal</h3><p className="text-xs text-muted-foreground">Aparecem somente medidas registradas.</p></div><SourceBadge>Avaliações</SourceBadge></div><div className="mt-4 flex flex-wrap gap-2">{metrics.map(item => <button key={item.key} type="button" onClick={() => setMetric(item.key)} className={`rounded-lg px-2 py-1.5 text-xs ${activeMetric === item.key ? 'bg-primary/10 text-primary ring-1 ring-primary/30' : 'bg-elevated text-foreground/80'}`}>{item.label}</button>)}</div><div className="mt-4"><Plot points={metricPoints} unit={metricInfo.unit} /></div></div><div className="rounded-xl border border-border/10 bg-card p-4"><h3 className="font-semibold">Primeiro × último registro</h3><p className="mt-1 text-xs text-muted-foreground">Comparação por métrica, sem completar campos ausentes.</p><div className="mt-4 space-y-2">{metrics.map(item => { const points = assessments.flatMap(a => { const value = numeric(a[item.key]); return value == null || (item.key === 'score_global' && !a.oficial) ? [] : [value]; }); return <div key={item.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border/10 py-2 text-xs"><span>{item.label}</span><span className="text-muted-foreground">{points.length ? `${format(points[0])} ${item.unit}` : '—'}</span><strong>{points.length ? `${format(points[points.length - 1])} ${item.unit}` : '—'}</strong></div>; })}</div>{!assessments.length && <Empty>Faça a avaliação guiada no FitPro para iniciar este histórico.</Empty>}<p className="mt-4 text-[11px] text-muted-foreground">Autoavaliações e avaliações profissionais são identificadas na linha do tempo.</p></div></div>}
      {panel === 'performance' && <div className="grid gap-3 lg:grid-cols-2"><div className="rounded-xl border border-border/10 bg-card p-4"><div className="flex justify-between gap-2"><div><h3 className="font-semibold">Carga registrada no treino</h3><p className="text-xs text-muted-foreground">Séries concluídas, por exercício.</p></div><SourceBadge>FitPro + Progress</SourceBadge></div>{exerciseNames.length ? <><select aria-label="Exercício" className="mt-4 w-full rounded-lg border border-border/15 bg-background p-2 text-sm" value={selectedExercise} onChange={e => setExercise(e.target.value)}>{exerciseNames.map(name => <option key={name}>{name}</option>)}</select><div className="mt-3"><Plot points={loadPoints} unit="kg" color="hsl(var(--primary))" /></div></> : <div className="mt-4"><Empty>Nenhuma série com carga confirmada neste perfil.</Empty></div>}</div><div className="space-y-3"><div className="rounded-xl border border-border/10 bg-card p-4"><h3 className="font-semibold">1RM avaliado</h3><p className="mb-3 text-xs text-muted-foreground">Teste da avaliação; não calculado a partir da carga de treino.</p>{([['Supino', 'rm1_empurrar_superior'], ['Agachamento', 'rm1_empurrar_perna'], ['Puxada', 'rm1_puxar_costas']] as const).map(([label, key]) => { const latest = [...assessments].reverse().find(a => numeric(a[key]) != null); return <div key={key} className="flex justify-between border-b border-border/10 py-2 text-sm"><span>{label}</span><strong>{latest ? `${format(Number(latest[key]))} kg` : 'Sem teste'}</strong></div>; })}</div><div className="rounded-xl border border-border/10 bg-card p-4"><div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" /><h3 className="font-semibold">Recordes</h3></div>{records.length ? <div className="mt-2 space-y-2">{records.slice(-5).reverse().map(r => <div key={r.id} className="flex justify-between gap-2 border-b border-border/10 py-2 text-xs"><span>{r.exercise}<small className="block text-muted-foreground">{dateLabel(r.date)}</small></span><strong>{format(r.value)} {r.unit}</strong></div>)}</div> : <p className="mt-3 text-xs text-muted-foreground">Nenhum recorde registrado.</p>}</div></div></div>}
      {panel === 'historico' && <div className="grid gap-3 lg:grid-cols-2"><div className="rounded-xl border border-border/10 bg-card p-4"><h3 className="font-semibold">Consistência de treino</h3><p className="text-xs text-muted-foreground">Últimos 84 dias · sessões concluídas</p><Calendar dates={workouts.map(w => w.date)} /><p className="mt-3 text-xs text-muted-foreground">{workouts.length} treinos no total</p></div><div className="rounded-xl border border-border/10 bg-card p-4"><h3 className="font-semibold">Linha do tempo</h3><div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">{timeline(assessments, workouts, records).length ? timeline(assessments, workouts, records).map(item => <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border border-border/10 bg-muted/20 p-3 text-xs"><div><strong>{item.title}</strong><p className="mt-1 text-muted-foreground">{item.detail}</p></div><time className="whitespace-nowrap font-mono text-[10px] text-muted-foreground">{dateLabel(item.date)}</time></div>) : <Empty>O histórico começa com a primeira avaliação ou treino concluído.</Empty>}</div></div></div>}
    </>}
  </section>;
}

function Summary({ label, value, unit, detail }: { label: string; value: string; unit: string; detail?: string }) { return <div className="rounded-xl border border-border/10 bg-muted/40 p-3"><p className="font-mono text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-2 font-display text-2xl font-bold">{value}<span className="ml-1 font-sans text-[10px] font-normal text-muted-foreground">{unit}</span></p>{detail && <p className="mt-1 text-[10px] text-muted-foreground">{detail}</p>}</div>; }
function Insight({ source, text }: { source: string; text: string }) { return <div className="rounded-lg border border-border/10 bg-muted/40 p-3"><p className="mb-2 font-mono text-[10px] uppercase text-primary">{source}</p><p>{text}</p></div>; }
function compatibleHistory(rows:HistoryAssessment[],key:MetricKey) { const latest=[...rows].reverse().find(r=>numeric(r[key])!=null&&(key!=='score_global'||r.oficial)); return latest?rows.filter(r=>compatibleMetric(latest as AssessmentRow,r as AssessmentRow,key)):[]; }
function metricDelta(rows: HistoryAssessment[], key: MetricKey) { const metric=assessmentMetrics.find(m=>m.key===key); const values = compatibleHistory(rows,key).filter(r=>!metric||['CONFIRMADO','DERIVADO'].includes(trustFor(r as AssessmentRow,metric))).flatMap(row => { const value = numeric(row[key]); return value == null ? [] : [value]; }); return values.length >= 2 ? values[values.length - 1] - values[0] : null; }
function Calendar({ dates }: { dates: string[] }) { const counts = new Map<string, number>(); dates.forEach(d => counts.set(d, (counts.get(d) ?? 0) + 1)); const today = new Date(); today.setHours(12, 0, 0, 0); return <div className="mt-5 grid grid-cols-12 gap-1.5" role="img" aria-label="Calendário dos últimos 84 dias de treino">{Array.from({ length: 84 }, (_, i) => { const day = new Date(today); day.setDate(today.getDate() - (83 - i)); const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`; const count = counts.get(key) ?? 0; return <span key={key} title={`${day.toLocaleDateString('pt-BR')}: ${count} treino(s)`} className={`aspect-square rounded-sm ${count > 1 ? 'bg-primary' : count ? 'bg-primary/65' : 'bg-elevated'}`} />; })}</div>; }
function timeline(assessments: HistoryAssessment[], workouts: ProgressHistory['workouts'], records: ProgressHistory['records']) { return [
  ...assessments.map(a => ({ id: `a:${a.id}`, date: a.data_avaliacao, title: a.origem === 'avaliacao_guiada' ? 'Autoavaliação guiada' : 'Avaliação física', detail: !a.oficial || a.score_global == null ? 'Medidas registradas' : `Score ${format(Number(a.score_global), 0)} pontos` })),
  ...workouts.map(w => ({ id: `w:${w.id}`, date: w.date, title: w.name, detail: `Treino concluído · ${w.source}${w.volumeKg == null ? '' : ` · ${format(Number(w.volumeKg), 0)} kg de volume`}` })),
  ...records.map(r => ({ id: `r:${r.id}`, date: r.date, title: `Recorde · ${r.exercise}`, detail: `${format(r.value)} ${r.unit}` })),
].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40); }
