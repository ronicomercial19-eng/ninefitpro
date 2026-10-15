import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { requestRonChat } from '@/services/ronChat';
import { useAthleteId } from '@/hooks/useAthleteId';
import { businessDate } from '@/services/dailyContextRules';
import { BehavioralHistory } from './BehavioralHistory';

// Padrão Nine Pro v2. Cada módulo tem: 1 número-foco (hero) que reage à interação
// (ou vem de dado real do atleta) + controles calmos abaixo.
const input = 'w-full rounded-xl border border-primary/20 bg-black p-2.5 text-sm text-foreground placeholder:text-muted-foreground';
const button = 'inline-flex items-center justify-center gap-1.5 rounded-full border border-primary/40 px-4 py-2.5 font-display text-[11px] font-black uppercase tracking-wider text-primary transition-colors hover:bg-primary/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40';
const chipOff = 'border-white/10 text-muted-foreground';
const chipOn = 'bg-primary/15';
const title = 'font-display text-sm font-black uppercase tracking-tight text-foreground';
const field = 'block font-data text-[9px] uppercase tracking-[0.2em] text-muted-foreground [&>input]:mt-1.5 [&>select]:mt-1.5 [&>textarea]:mt-1.5';
const result = 'rounded-xl border border-primary/30 bg-primary/5 p-3';
const row = 'rounded-xl border border-white/10 bg-white/[0.03] p-2.5';
const hint = 'text-xs text-muted-foreground';
type Props = { moduleKey: string; name: string };

function Frame({ label, value, unit, note, children }: { label: string; value: string | number; unit?: string; note?: string; children: React.ReactNode }) {
  const text = String(value);
  return <div className="space-y-4">
    <div>
      <p className="font-data text-[9px] uppercase tracking-[0.3em] text-primary/80">{label}</p>
      <p className={`mt-1 font-display font-black leading-none tracking-tighter text-foreground ${text.length > 7 ? 'text-3xl' : 'text-5xl'}`}>{text}{unit && <span className="ml-1.5 font-data text-[10px] uppercase tracking-widest text-primary">{unit}</span>}</p>
      {note && <p className="mt-1.5 text-xs text-muted-foreground">{note}</p>}
    </div>
    {children}
  </div>;
}

function Presets({ options, active, onPick }: { options: string[]; active: string | null; onPick: (value: string) => void }) {
  return <div className="flex flex-wrap gap-2">{options.map(value => <button type="button" key={value} aria-pressed={active === value} className={`${button} ${active === value ? chipOn : chipOff}`} onClick={() => onPick(value)}>{value}</button>)}</div>;
}

// ---- dado real do atleta (somente leitura; falha silenciosa vira "—") ----
function useWeeklySessions() {
  const { athleteId } = useAthleteId();
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (!athleteId) { setCount(null); return; }
    let active = true;
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    void supabase.from('workout_executions').select('id', { count: 'exact', head: true }).eq('athlete_id', athleteId).eq('status', 'completed').gte('completed_at', since).then(({ count: total, error }) => { if (active) setCount(error ? null : (total ?? 0)); });
    return () => { active = false; };
  }, [athleteId]);
  return count;
}

function useTodayKcal() {
  const { athleteId } = useAthleteId();
  const [kcal, setKcal] = useState<number | null>(null);
  useEffect(() => {
    if (!athleteId) { setKcal(null); return; }
    let active = true;
    void supabase.from('nutrition_logs').select('calories').eq('athlete_id', athleteId).eq('date', businessDate()).then(({ data, error }) => { if (active) setKcal(error ? null : Math.round((data || []).reduce((sum, row) => sum + Number(row.calories || 0), 0))); });
    return () => { active = false; };
  }, [athleteId]);
  return kcal;
}

function DraftList({ heading, placeholder, initial = [] }: { heading: string; placeholder: string; initial?: string[] }) {
  const [text, setText] = useState('');
  const [items, setItems] = useState(initial.map(label => ({ label, done: false })));
  const done = items.filter(item => item.done).length;
  return <Frame label={heading} value={`${done}/${items.length}`} unit="concluídos" note="Marque os itens conforme avança. O rascunho é temporário.">
    <form className="flex gap-2" onSubmit={event => { event.preventDefault(); if (!text.trim()) return; setItems(values => [...values, { label: text.trim(), done: false }]); setText(''); }}><input className={input} aria-label={placeholder} placeholder={placeholder} value={text} maxLength={160} onChange={event => setText(event.target.value)} /><button className={button}>Adicionar</button></form>
    {items.length === 0 && <p className={hint}>Adicione o primeiro item para experimentar.</p>}
    {items.map((item, index) => <div key={index} className={`flex items-center gap-2 ${row}`}><label className="flex flex-1 items-center gap-2 text-sm text-foreground"><input type="checkbox" className="accent-primary" checked={item.done} onChange={() => setItems(values => values.map((value, i) => i === index ? { ...value, done: !value.done } : value))} /><span className={item.done ? 'line-through opacity-60' : ''}>{item.label}</span></label><button type="button" className="px-1 text-muted-foreground hover:text-destructive" aria-label={`Remover ${item.label}`} onClick={() => setItems(values => values.filter((_, i) => i !== index))}>×</button></div>)}
  </Frame>;
}

const TRAIN_PRESETS: Record<string, { goal: string; sets: number; reps: number; rest: number }> = {
  'Força 5×5': { goal: 'Força', sets: 5, reps: 5, rest: 180 },
  'Resistência 3×15': { goal: 'Resistência', sets: 3, reps: 15, rest: 45 },
  'Mobilidade 2×10': { goal: 'Mobilidade', sets: 2, reps: 10, rest: 30 },
};

function TrainingWorkbench({ adjustment }: { adjustment: boolean }) {
  const sessions = useWeeklySessions();
  const [goal, setGoal] = useState('Força');
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [rest, setRest] = useState(60);
  const [preset, setPreset] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [items, setItems] = useState<string[]>([]);
  return <Frame label="Sessões nos últimos 7 dias" value={sessions ?? '—'} unit="concluídas" note={adjustment ? 'Experimente um ajuste no seu bloco.' : 'Monte um bloco de treino. Os rascunhos são temporários.'}>
    <Presets options={Object.keys(TRAIN_PRESETS)} active={preset} onPick={key => { const p = TRAIN_PRESETS[key]; setPreset(key); setGoal(p.goal); setSets(p.sets); setReps(p.reps); setRest(p.rest); }} />
    <label className={field}>Objetivo<select className={input} value={goal} onChange={event => { setGoal(event.target.value); setPreset(null); }}>{['Força', 'Resistência', 'Mobilidade'].map(value => <option key={value}>{value}</option>)}</select></label>
    <div className="grid grid-cols-3 gap-2">{[{ label: 'Séries', value: sets, max: 10, change: setSets }, { label: 'Repetições', value: reps, max: 50, change: setReps }, { label: 'Descanso (s)', value: rest, max: 300, change: setRest }].map(f => <label key={f.label} className={field}>{f.label}<input type="number" className={input} value={f.value} min={1} max={f.max} onChange={event => { f.change(Math.max(1, Math.min(f.max, Number(event.target.value) || 1))); setPreset(null); }} /></label>)}</div>
    <div className={result}><strong className="font-display font-black uppercase tracking-tight text-foreground">{goal} · {sets} × {reps}</strong><p className="mt-1 text-sm text-muted-foreground">{sets * reps} repetições · {Math.max(0, sets - 1) * rest} s de intervalo entre séries</p></div>
    <form className="flex gap-2" onSubmit={event => { event.preventDefault(); if (!text.trim()) return; setItems(values => [...values, text.trim()]); setText(''); }}><input className={input} aria-label="Nome do exercício" placeholder="Nome do exercício" value={text} maxLength={160} onChange={event => setText(event.target.value)} /><button className={button}>Adicionar</button></form>
    {items.length === 0 ? <p className={hint}>Adicione o primeiro exercício do bloco.</p> : items.map((item, index) => <div key={index} className={`flex items-center justify-between ${row}`}><span className="text-sm text-foreground">{index + 1}. {item} <span className="font-data text-[9px] uppercase tracking-widest text-muted-foreground">{sets}×{reps}</span></span><button type="button" className="px-1 text-muted-foreground hover:text-destructive" aria-label={`Remover ${item}`} onClick={() => setItems(values => values.filter((_, i) => i !== index))}>×</button></div>)}
  </Frame>;
}

const WEEK_PRESETS: Record<string, string[]> = {
  '3 dias': ['Seg', 'Qua', 'Sex'],
  '4 dias': ['Seg', 'Ter', 'Qui', 'Sex'],
  '5 dias': ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'],
};

function WeekPlanner() {
  const [week, setWeek] = useState<Record<string, string>>({});
  const [preset, setPreset] = useState<string | null>(null);
  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const active = Object.values(week).filter(value => value !== 'Descanso').length;
  return <Frame label="Dias de atividade" value={`${active}/7`} unit="na semana" note="Desenhe sua semana. O rascunho é temporário.">
    <Presets options={Object.keys(WEEK_PRESETS)} active={preset} onPick={key => { setPreset(key); setWeek(Object.fromEntries(WEEK_PRESETS[key].map(day => [day, 'Força']))); }} />
    {days.map(day => <label key={day} className="flex items-center gap-3 text-sm"><span className="w-9 font-data text-[10px] uppercase tracking-widest text-primary/80">{day}</span><select className={input} value={week[day] || 'Descanso'} onChange={event => { setPreset(null); setWeek(values => ({ ...values, [day]: event.target.value })); }}>{['Descanso', 'Força', 'Cardio', 'Mobilidade'].map(value => <option key={value}>{value}</option>)}</select></label>)}
    <button type="button" className={button} onClick={() => { setWeek({}); setPreset(null); }}>Limpar semana</button>
  </Frame>;
}

function MacroCalculator() {
  const today = useTodayKcal();
  const [macros, setMacros] = useState({ protein: 0, carbs: 0, fat: 0 });
  const estimate = Math.round(macros.protein * 4 + macros.carbs * 4 + macros.fat * 9);
  return <Frame label="Kcal registradas hoje" value={today ?? '—'} unit="kcal" note="Simule uma refeição abaixo. Para registrar de verdade, abra sua dieta.">
    {([{ key: 'protein', label: 'Proteína' }, { key: 'carbs', label: 'Carboidratos' }, { key: 'fat', label: 'Gorduras' }] as const).map(f => <label key={f.key} className={field}>{f.label} (g)<input className={input} type="number" min={0} max={1000} value={macros[f.key]} onChange={event => setMacros(values => ({ ...values, [f.key]: Math.min(1000, Math.max(0, Number(event.target.value) || 0)) }))} /></label>)}
    <div className={result}><p className="font-display text-2xl font-black text-foreground">{estimate} <span className="font-data text-[10px] uppercase tracking-widest text-primary">kcal na simulação</span></p>{today !== null && estimate > 0 && <p className="mt-1 text-xs text-muted-foreground">Total do dia com essa refeição: {today + estimate} kcal</p>}</div>
  </Frame>;
}

const fmtPace = (secondsPerKm: number) => `${Math.floor(secondsPerKm / 60)}:${String(Math.round(secondsPerKm % 60)).padStart(2, '0')}`;
const fmtTime = (totalSeconds: number) => { const h = Math.floor(totalSeconds / 3600), m = Math.floor((totalSeconds % 3600) / 60), s = Math.round(totalSeconds % 60); return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`; };

function PaceCalculator() {
  const [km, setKm] = useState('5');
  const [minutes, setMinutes] = useState('30');
  const distance = Number(km.replace(',', '.')), time = Number(minutes.replace(',', '.'));
  const valid = distance > 0 && time > 0;
  const perKm = valid ? time * 60 / distance : null;
  return <Frame label="Ritmo médio" value={perKm !== null ? fmtPace(perKm) : '—'} unit="min/km" note={valid ? `${(distance / time * 60).toFixed(1)} km/h` : 'Informe distância e tempo válidos.'}>
    <Presets options={['5 km', '10 km', '21 km']} active={`${distance} km`} onPick={value => setKm(value.split(' ')[0])} />
    <div className="grid grid-cols-2 gap-2"><label className={field}>Distância (km)<input className={input} inputMode="decimal" value={km} onChange={event => setKm(event.target.value)} /></label><label className={field}>Tempo (min)<input className={input} inputMode="decimal" value={minutes} onChange={event => setMinutes(event.target.value)} /></label></div>
    {perKm !== null && <div className="grid grid-cols-3 gap-2">{[5, 10, 21.1].map(d => <div key={d} className={`${row} text-center`}><p className="font-data text-[9px] uppercase tracking-widest text-muted-foreground">{d === 21.1 ? '21 km' : `${d} km`}</p><p className="font-display text-sm font-black text-foreground">{fmtTime(perKm * d)}</p></div>)}</div>}
    {perKm !== null && <p className={hint}>Projeção mantendo o mesmo ritmo.</p>}
  </Frame>;
}

function RonPreview() {
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <Frame label="RON IA" value={Math.floor(history.length / 2)} unit="perguntas nesta sessão" note="Converse com o RON. Histórico completo fica no módulo.">
    <div className="max-h-64 space-y-2 overflow-y-auto" aria-live="polite">{history.map((entry, index) => <p key={index} className={`${row} whitespace-pre-wrap text-sm text-foreground`}><strong className="font-data text-[9px] uppercase tracking-widest text-primary">{entry.role === 'user' ? 'Você' : 'RON'}: </strong>{entry.content}</p>)}</div>
    <form className="space-y-2" onSubmit={async event => { event.preventDefault(); if (busy || !message.trim()) return; const text = message.trim(); setBusy(true); setError(''); try { const reply = await requestRonChat(text, history); setHistory(values => [...values, { role: 'user', content: text }, { role: 'assistant', content: reply.content }]); setMessage(''); } catch (failure) { setError(failure instanceof Error ? failure.message : 'RON indisponível'); } finally { setBusy(false); } }}><textarea className={input} aria-label="Mensagem ao RON" placeholder="O que você quer entender sobre sua rotina?" value={message} maxLength={2000} onChange={event => setMessage(event.target.value)} /><button className={button} disabled={busy || !message.trim()}>{busy ? 'RON está respondendo…' : 'Enviar ao RON'}</button></form>{error && <p role="alert" className="text-xs text-destructive">{error}</p>}
  </Frame>;
}

function CatalogPreview({ video }: { video: boolean }) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Array<{ id: string; name: string; url: string | null }>>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState('Carregando acervo…');
  useEffect(() => {
    let active = true;
    void (async () => {
      const res = video ? await supabase.from('library_items').select('id,name,player_url').in('type', ['videos', 'video', 'streaming', 'aula']).limit(80) : await supabase.from('exercises').select('id,name,video_url').order('name').limit(200);
      if (!active) return;
      if (res.error) { setStatus('Não foi possível carregar o acervo.'); return; }
      setItems((res.data || []).map(row => ({ id: String(row.id), name: row.name || 'Sem título', url: 'player_url' in row ? row.player_url : row.video_url })));
      setStatus('');
    })();
    return () => { active = false; };
  }, [video]);
  const filtered = items.filter(item => item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  let player: string | null = null;
  try { const url = new URL(selected || ''); if (url.protocol === 'https:') { const youtube = ['youtube.com', 'www.youtube.com', 'youtu.be'].includes(url.hostname); const id = url.hostname === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v') || url.pathname.split('/embed/')[1]; player = youtube && id && /^[\w-]+$/.test(id) ? `https://www.youtube.com/embed/${id}` : url.hostname === 'vimeo.com' && /^\/\d+$/.test(url.pathname) ? `https://player.vimeo.com/video${url.pathname}` : null; } } catch { /* Missing/unsupported video uses explicit fallback. */ }
  return <Frame label={video ? 'Vídeos no catálogo' : 'Exercícios no acervo'} value={status ? '—' : (query ? `${filtered.length}/${items.length}` : items.length)} unit={query ? 'encontrados' : 'disponíveis'} note={video ? 'Explore o catálogo de vídeos.' : 'Explore os exercícios do acervo.'}>
    <input className={input} aria-label="Buscar no acervo" placeholder="Buscar pelo nome" value={query} onChange={event => setQuery(event.target.value)} />
    {status ? <p className={hint}>{status}</p> : <div className="max-h-52 space-y-2 overflow-y-auto">{filtered.length === 0 && <p className={hint}>Nenhum conteúdo encontrado.</p>}{filtered.map(item => <button type="button" className={`block w-full text-left text-sm text-foreground transition-colors hover:border-primary/40 ${row}`} key={item.id} onClick={() => setSelected(item.url)}>{item.name}<span className="block font-data text-[9px] uppercase tracking-widest text-muted-foreground">{item.url ? 'Abrir vídeo' : 'Sem vídeo disponível'}</span></button>)}</div>}
    {player && <iframe title="Vídeo selecionado" src={player} className="h-56 w-full rounded-xl" allowFullScreen />}
    {selected && !player && <p className={hint}>Este conteúdo requer o player do sistema completo.</p>}
  </Frame>;
}

function AppointmentDraft({ events }: { events: boolean }) {
  const [date, setDate] = useState('');
  const [category, setCategory] = useState(events ? 'Workshop' : 'Personal trainer');
  const [confirmed, setConfirmed] = useState(false);
  const options = events ? ['Workshop', 'Encontro', 'Desafio'] : ['Personal trainer', 'Nutricionista', 'Fisioterapeuta'];
  const diff = date ? Math.round((new Date(`${date}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000) : null;
  const when = diff === null ? '—' : diff === 0 ? 'hoje' : diff > 0 ? String(diff) : '—';
  return <Frame label={events ? 'Dias até o evento' : 'Dias até a data de interesse'} value={when} unit={diff !== null && diff > 0 ? (diff === 1 ? 'dia' : 'dias') : undefined} note={diff !== null && diff < 0 ? 'Escolha uma data futura.' : events ? 'Prepare sua agenda de eventos.' : 'Prepare sua busca por um profissional.'}>
    <Presets options={options} active={category} onPick={value => { setCategory(value); setConfirmed(false); }} />
    <label className={field}>Data de interesse<input type="date" className={input} value={date} onChange={event => { setDate(event.target.value); setConfirmed(false); }} /></label>
    <button type="button" className={button} disabled={!date} onClick={() => setConfirmed(true)}>Preparar interesse</button>
    {confirmed && <p className={`${result} text-sm text-foreground`}>{category} · {date.split('-').reverse().join('/')}<span className="mt-1 block text-xs text-muted-foreground">Rascunho pronto. Consulte disponibilidade e confirme no sistema completo.</span></p>}
  </Frame>;
}

function MessageDraft() {
  const [audience, setAudience] = useState('Meu treinador');
  const [text, setText] = useState('');
  return <Frame label="Mensagem" value={text.length} unit="/ 1000 caracteres" note="Prévia local. Nenhuma mensagem foi enviada.">
    <Presets options={['Meu treinador', 'Suporte', 'Minha equipe']} active={audience} onPick={setAudience} />
    <textarea className={input} aria-label="Rascunho de mensagem" rows={4} value={text} maxLength={1000} onChange={event => setText(event.target.value)} placeholder="Escreva sua mensagem…" />
    <div className={`${row} text-sm`}><strong className="font-data text-[9px] uppercase tracking-widest text-primary">Para: {audience}</strong><p className="mt-1 whitespace-pre-wrap text-foreground">{text || 'Sua prévia aparece aqui.'}</p></div>
  </Frame>;
}

function PrimeExplorer() {
  const [interest, setInterest] = useState('Treino');
  const benefits: Record<string, string> = { Treino: 'Explore periodização e acompanhamento de evolução.', Recuperação: 'Conheça os protocolos de recuperação e acompanhamento.', Assistente: 'Explore o RON e recursos de orientação.' };
  return <Frame label="Foco do seu interesse" value={interest} note="Explorar não inicia uma assinatura. Consulte planos e preços no Prime Pass.">
    <Presets options={Object.keys(benefits)} active={interest} onPick={setInterest} />
    <p className={`${result} text-sm text-foreground`}>{benefits[interest]}</p>
  </Frame>;
}

export function ModuleExperience({ moduleKey, name }: Props) {
  const key = moduleKey.toLowerCase().replace(/[-_\s]/g, '');
  let content;
  if (['train', 'smarttreino', 'smartreino', 'ajustetreino'].includes(key)) content = <TrainingWorkbench adjustment={key === 'ajustetreino'} />;
  else if (['planejamento', 'smartperiodizer', 'periodizer'].includes(key)) content = <WeekPlanner />;
  else if (['foods', 'nutri', 'nutricao'].includes(key)) content = <MacroCalculator />;
  else if (key === 'move') content = <PaceCalculator />;
  else if (['progress', 'progresso', 'hub'].includes(key)) content = <BehavioralHistory />;
  else if (key === 'ron') content = <RonPreview />;
  else if (['biblioteca', 'healthflix'].includes(key)) content = <CatalogPreview video={key === 'healthflix'} />;
  else if (['staff', 'events'].includes(key)) content = <AppointmentDraft events={key === 'events'} />;
  else if (['zap', '9zap'].includes(key)) content = <MessageDraft />;
  else if (key === 'primepass') content = <PrimeExplorer />;
  else if (key === 'store') content = <DraftList heading="Lista de interesse" placeholder="Produto que deseja procurar" />;
  else if (key === 'habitflow') content = <DraftList heading="Rotina de hábitos" placeholder="Novo hábito" initial={['Preparar a rotina de amanhã', 'Reservar um horário para se movimentar']} />;
  else if (key === 'posturapro') content = <DraftList heading="Avaliação de postura" placeholder="Observação para o profissional" initial={['Separar um local iluminado', 'Preparar as fotos para avaliação', 'Anotar dúvidas para o profissional']} />;
  else if (key === 'nexus') content = <DraftList heading="Próximas ações" placeholder="Ação que deseja coordenar" />;
  else content = <DraftList heading={name} placeholder="Objetivo que deseja levar para o módulo" />;
  return <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4" aria-label={`Experimentar ${name}`}>{content}</section>;
}
