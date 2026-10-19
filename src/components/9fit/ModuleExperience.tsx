import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { requestRonChat } from '@/services/ronChat';
import { BehavioralHistory } from './BehavioralHistory';

const input = 'w-full rounded-lg border border-white/15 bg-background p-2 text-sm';
const button = 'rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm hover:bg-primary/20';
type Props = { moduleKey: string; name: string };

function DraftList({ title, placeholder, initial = [] }: { title: string; placeholder: string; initial?: string[] }) {
  const [text, setText] = useState('');
  const [items, setItems] = useState(initial.map(label => ({ label, done: false })));
  return <div className="space-y-3"><h4 className="font-bold">{title}</h4><form className="flex gap-2" onSubmit={event => { event.preventDefault(); if (!text.trim()) return; setItems(values => [...values, { label: text.trim(), done: false }]); setText(''); }}><input className={input} aria-label={placeholder} placeholder={placeholder} value={text} maxLength={160} onChange={event => setText(event.target.value)} /><button className={button}>Adicionar</button></form>
    {items.length === 0 && <p className="text-xs text-muted-foreground">Adicione o primeiro item para experimentar.</p>}
    {items.map((item, index) => <div key={index} className="flex items-center gap-2 rounded-lg bg-white/5 p-2"><label className="flex flex-1 items-center gap-2"><input type="checkbox" checked={item.done} onChange={() => setItems(values => values.map((value, i) => i === index ? { ...value, done: !value.done } : value))} /><span className={item.done ? 'line-through opacity-60' : ''}>{item.label}</span></label><button type="button" aria-label={`Remover ${item.label}`} onClick={() => setItems(values => values.filter((_, i) => i !== index))}>×</button></div>)}
    <p className="text-xs text-muted-foreground">{items.filter(item => item.done).length} de {items.length} marcados neste rascunho</p></div>;
}

function TrainingWorkbench({ adjustment }: { adjustment: boolean }) {
  const [goal, setGoal] = useState('Força');
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [rest, setRest] = useState(60);
  return <div className="space-y-3"><h4 className="font-bold">{adjustment ? 'Experimente um ajuste' : 'Monte um bloco de treino'}</h4><label className="block text-xs">Objetivo<select className={input} value={goal} onChange={event => setGoal(event.target.value)}>{['Força', 'Resistência', 'Mobilidade'].map(value => <option key={value}>{value}</option>)}</select></label>
    <div className="grid grid-cols-3 gap-2">{[{ label: 'Séries', value: sets, max: 10, change: setSets }, { label: 'Repetições', value: reps, max: 50, change: setReps }, { label: 'Descanso (s)', value: rest, max: 300, change: setRest }].map(field => <label key={field.label} className="text-xs">{field.label}<input type="number" className={input} value={field.value} min={1} max={field.max} onChange={event => field.change(Math.max(1, Math.min(field.max, Number(event.target.value) || 1)))} /></label>)}</div>
    <div className="rounded-xl border border-primary/30 p-3"><strong>{goal} · {sets} × {reps}</strong><p className="text-sm">{sets * reps} repetições · {Math.max(0, sets - 1) * rest} s de intervalo entre séries</p></div><DraftList title="Exercícios do bloco" placeholder="Nome do exercício" /></div>;
}

function WeekPlanner() {
  const [week, setWeek] = useState<Record<string, string>>({});
  return <div className="space-y-3"><h4 className="font-bold">Desenhe sua semana</h4>{['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => <label key={day} className="flex items-center gap-3 text-sm"><span className="w-8">{day}</span><select className={input} value={week[day] || 'Descanso'} onChange={event => setWeek(values => ({ ...values, [day]: event.target.value }))}>{['Descanso', 'Força', 'Cardio', 'Mobilidade'].map(value => <option key={value}>{value}</option>)}</select></label>)}<p className="text-xs text-primary">{Object.values(week).filter(value => value !== 'Descanso').length} dias de atividade no rascunho</p></div>;
}

function MacroCalculator() {
  const [macros, setMacros] = useState({ protein: 0, carbs: 0, fat: 0 });
  return <div className="space-y-3"><h4 className="font-bold">Experimente a composição de uma refeição</h4>{([{ key: 'protein', label: 'Proteína' }, { key: 'carbs', label: 'Carboidratos' }, { key: 'fat', label: 'Gorduras' }] as const).map(field => <label key={field.key} className="block text-xs">{field.label} (g)<input className={input} type="number" min={0} max={1000} value={macros[field.key]} onChange={event => setMacros(values => ({ ...values, [field.key]: Math.min(1000, Math.max(0, Number(event.target.value) || 0)) }))} /></label>)}<p className="rounded-xl bg-primary/10 p-3 text-lg font-bold">{Math.round(macros.protein * 4 + macros.carbs * 4 + macros.fat * 9)} kcal estimadas</p><p className="text-xs text-muted-foreground">Estimativa energética dos macros informados. Abra sua dieta para registrar uma refeição.</p></div>;
}

function PaceCalculator() {
  const [km, setKm] = useState('5');
  const [minutes, setMinutes] = useState('30');
  const distance = Number(km.replace(',', '.')), time = Number(minutes.replace(',', '.'));
  const seconds = distance > 0 && time > 0 ? Math.round(time * 60 / distance) : null;
  return <div className="space-y-3"><h4 className="font-bold">Planeje seu ritmo</h4><label className="block text-xs">Distância (km)<input className={input} inputMode="decimal" value={km} onChange={event => setKm(event.target.value)} /></label><label className="block text-xs">Tempo (min)<input className={input} inputMode="decimal" value={minutes} onChange={event => setMinutes(event.target.value)} /></label><p className="rounded-xl bg-primary/10 p-3 font-bold">{seconds !== null && Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} min/km · ${(distance / time * 60).toFixed(1)} km/h` : 'Informe distância e tempo válidos.'}</p></div>;
}

function RonPreview() {
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <div className="space-y-3"><h4 className="font-bold">Converse com o RON</h4><div className="max-h-64 space-y-2 overflow-y-auto" aria-live="polite">{history.map((entry, index) => <p key={index} className="rounded-lg bg-white/5 p-3 text-sm whitespace-pre-wrap"><strong>{entry.role === 'user' ? 'Você' : 'RON'}: </strong>{entry.content}</p>)}</div><form onSubmit={async event => { event.preventDefault(); if (busy || !message.trim()) return; const text = message.trim(); setBusy(true); setError(''); try { const reply = await requestRonChat(text, history); setHistory(values => [...values, { role: 'user', content: text }, { role: 'assistant', content: reply.content }]); setMessage(''); } catch (failure) { setError(failure instanceof Error ? failure.message : 'RON indisponível'); } finally { setBusy(false); } }}><textarea className={input} aria-label="Mensagem ao RON" placeholder="O que você quer entender sobre sua rotina?" value={message} maxLength={2000} onChange={event => setMessage(event.target.value)} /><button className={button} disabled={busy || !message.trim()}>{busy ? 'RON está respondendo…' : 'Enviar ao RON'}</button></form>{error && <p role="alert" className="text-xs text-red-400">{error}</p>}</div>;
}

function CatalogPreview({ video }: { video: boolean }) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Array<{ id: string; name: string; url: string | null }>>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState('Carregando acervo…');
  useEffect(() => {
    let active = true;
    void (async () => {
      const result = video ? await supabase.from('library_items').select('id,name,player_url').in('type', ['videos', 'video', 'streaming', 'aula']).limit(80) : await supabase.from('exercises').select('id,name,video_url').order('name').limit(200);
      if (!active) return;
      if (result.error) { setStatus('Não foi possível carregar o acervo.'); return; }
      setItems((result.data || []).map(row => ({ id: String(row.id), name: row.name || 'Sem título', url: 'player_url' in row ? row.player_url : row.video_url })));
      setStatus('');
    })();
    return () => { active = false; };
  }, [video]);
  const filtered = items.filter(item => item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  let player: string | null = null;
  try { const url = new URL(selected || ''); if (url.protocol === 'https:') { const youtube = ['youtube.com', 'www.youtube.com', 'youtu.be'].includes(url.hostname); const id = url.hostname === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v') || url.pathname.split('/embed/')[1]; player = youtube && id && /^[\w-]+$/.test(id) ? `https://www.youtube.com/embed/${id}` : url.hostname === 'vimeo.com' && /^\/\d+$/.test(url.pathname) ? `https://player.vimeo.com/video${url.pathname}` : null; } } catch { /* Missing/unsupported video uses explicit fallback. */ }
  return <div className="space-y-3"><h4 className="font-bold">{video ? 'Explore o catálogo de vídeos' : 'Explore exercícios do acervo'}</h4><input className={input} aria-label="Buscar no acervo" placeholder="Buscar pelo nome" value={query} onChange={event => setQuery(event.target.value)} />{status ? <p className="text-xs">{status}</p> : <div className="max-h-52 space-y-2 overflow-y-auto">{filtered.length === 0 && <p className="text-xs">Nenhum conteúdo encontrado.</p>}{filtered.map(item => <button type="button" className="block w-full rounded-lg bg-white/5 p-2 text-left text-sm" key={item.id} onClick={() => setSelected(item.url)}>{item.name}<span className="block text-xs text-muted-foreground">{item.url ? 'Abrir vídeo' : 'Sem vídeo disponível'}</span></button>)}</div>}{player && <iframe title="Vídeo selecionado" src={player} className="h-56 w-full rounded-xl" allowFullScreen />}{selected && !player && <p className="text-xs">Este conteúdo requer o player do sistema completo.</p>}</div>;
}

function AppointmentDraft({ events }: { events: boolean }) {
  const [date, setDate] = useState('');
  const [category, setCategory] = useState(events ? 'Workshop' : 'Personal trainer');
  const [confirmed, setConfirmed] = useState(false);
  return <div className="space-y-3"><h4 className="font-bold">{events ? 'Prepare sua agenda de eventos' : 'Prepare sua busca por um profissional'}</h4><select aria-label="Categoria" className={input} value={category} onChange={event => { setCategory(event.target.value); setConfirmed(false); }}>{(events ? ['Workshop', 'Encontro', 'Desafio'] : ['Personal trainer', 'Nutricionista', 'Fisioterapeuta']).map(value => <option key={value}>{value}</option>)}</select><label className="block text-xs">Data de interesse<input type="date" className={input} value={date} onChange={event => { setDate(event.target.value); setConfirmed(false); }} /></label><button type="button" className={button} disabled={!date} onClick={() => setConfirmed(true)}>Preparar interesse</button>{confirmed && <p className="rounded-lg bg-primary/10 p-3 text-sm">{category} · {date.split('-').reverse().join('/')}<span className="block text-xs">Rascunho pronto. Consulte disponibilidade e confirme no sistema completo.</span></p>}</div>;
}

function MessageDraft() {
  const [audience, setAudience] = useState('Meu treinador');
  const [text, setText] = useState('');
  return <div className="space-y-3"><h4 className="font-bold">Prepare uma mensagem</h4><select className={input} aria-label="Destinatário" value={audience} onChange={event => setAudience(event.target.value)}>{['Meu treinador', 'Suporte', 'Minha equipe'].map(value => <option key={value}>{value}</option>)}</select><textarea className={input} aria-label="Rascunho de mensagem" value={text} maxLength={1000} onChange={event => setText(event.target.value)} placeholder="Escreva sua mensagem…" /><div className="rounded-lg bg-white/5 p-3 text-sm"><strong>Para: {audience}</strong><p className="whitespace-pre-wrap">{text || 'Sua prévia aparece aqui.'}</p></div><p className="text-xs text-muted-foreground">Prévia local. Nenhuma mensagem foi enviada.</p></div>;
}

function PrimeExplorer() {
  const [interest, setInterest] = useState('Treino');
  const benefits: Record<string, string> = { Treino: 'Explore periodização e acompanhamento de evolução.', Recuperação: 'Conheça os protocolos de recuperação e acompanhamento.', Assistente: 'Explore o RON e recursos de orientação.' };
  return <div className="space-y-3"><h4 className="font-bold">Explore o que importa para você</h4><div className="flex flex-wrap gap-2">{Object.keys(benefits).map(value => <button type="button" className={button} aria-pressed={interest === value} key={value} onClick={() => setInterest(value)}>{value}</button>)}</div><p className="rounded-xl bg-primary/10 p-4 text-sm">{benefits[interest]}</p><p className="text-xs text-muted-foreground">Consulte planos, preços e disponibilidade no Prime Pass. Explorar não inicia uma assinatura.</p></div>;
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
  else if (key === 'store') content = <DraftList title="Monte sua lista de interesse" placeholder="Produto que deseja procurar" />;
  else if (key === 'habitflow') content = <DraftList title="Experimente sua rotina de hábitos" placeholder="Novo hábito" initial={['Preparar a rotina de amanhã', 'Reservar um horário para se movimentar']} />;
  else if (key === 'posturapro') content = <DraftList title="Prepare sua avaliação de postura" placeholder="Observação para o profissional" initial={['Separar um local iluminado', 'Preparar as fotos para avaliação', 'Anotar dúvidas para o profissional']} />;
  else if (key === 'nexus') content = <DraftList title="Organize suas próximas ações" placeholder="Ação que deseja coordenar" />;
  else content = <DraftList title={`Explore ${name}`} placeholder="Objetivo que deseja levar para o módulo" />;
  return <section className="rounded-2xl border border-white/10 bg-background/70 p-4 space-y-3" aria-label={`Experimentar ${name}`}><p className="text-[11px] text-muted-foreground">Experimente aqui. Os rascunhos são temporários; registros e confirmações ficam no sistema completo. Histórico, acervo e RON usam os serviços do aplicativo.</p>{content}</section>;
}
