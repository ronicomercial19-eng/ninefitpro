import { ArrowUpRight, Dumbbell, FileText, Layers3 } from 'lucide-react';
import { isExecutableTraining } from '@/lib/executableTraining';
import { withTimeout } from '@/lib/withTimeout';
import { useCallback, useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import { AssignedTraining, isAvailableTraining, trainingMedia } from '@/lib/assignedProtocols';
import { AssignedTrainingViewer } from './AssignedTrainingViewer';
import { ProtocolListItem, ProtocolViewer } from './ProtocolViewer';
import { Button } from '@/components/ui/button';
import { useSearchParams } from 'react-router-dom';

// Lista única de tudo o que o coach (ou o NINE/LIMA) entregou ao aluno, separada em dois grupos:
// prescrições/modelos de treino e conteúdos (infoprodutos, e-books, sistemas, HTML).
export function AssignedProtocols({ athleteId }: { athleteId: string | null }) {
  const [params, setParams] = useSearchParams();
  const requested = params.get('assignment');
  const requestRef = useRef(0);
  const [trainings, setTrainings] = useState<AssignedTraining[]>([]);
  const [library, setLibrary] = useState<any[]>([]);
  const [selected, setSelected] = useState<{ source: 'training' | 'library'; row: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    const request = ++requestRef.current;
    if (!athleteId) { setTrainings([]); setLibrary([]); setLoading(false); return; }
    setLoading(true); setError(false);
    try {
    const [training, contents] = await withTimeout(Promise.all([
      supabase.from('student_training_assignments').select('*').eq('student_id', athleteId).eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('student_library_assignments').select('*').eq('athlete_id', athleteId).order('assigned_at', { ascending: false }),
    ]));
    if (request !== requestRef.current) return;
    if (training.error || contents.error) setError(true);
    else { setTrainings((training.data || []).map(row => ({ ...row, training_data: row.training_data && typeof row.training_data === 'object' && !Array.isArray(row.training_data) ? row.training_data : null })).filter(row => isAvailableTraining(row))); setLibrary((contents.data || []).filter(row => row.status !== 'cancelled')); }
    } catch { if (request === requestRef.current) setError(true); } finally { if (request === requestRef.current) setLoading(false); }
  }, [athleteId]);
  useEffect(() => { setSelected(null); void load(); return () => { ++requestRef.current; }; }, [load]);
  useEffect(() => {
    const refresh = () => { void load(); };
    const visibility = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', visibility); };
  }, [load]);
  useRealtimeTable({ table: 'student_training_assignments', filter: athleteId ? 'student_id=eq.'+athleteId : undefined, enabled: !!athleteId }, () => void load());
  useRealtimeTable({ table: 'student_library_assignments', filter: athleteId ? 'athlete_id=eq.'+athleteId : undefined, enabled: !!athleteId }, () => void load());
  const linked = requested ? library.find(row => row.id === requested) : null;
  const close = () => {
    setSelected(null);
    if (!requested) return;
    const next = new URLSearchParams(params);
    next.delete('assignment');
    setParams(next, { replace: true });
  };
  if (selected?.source === 'training') return <AssignedTrainingViewer key={selected.row.id} training={selected.row} onBack={close} />;
  const opened = selected?.row ?? linked;
  if (opened) return <ProtocolViewer key={opened.id} assignment={opened} onBack={close} onComplete={() => { close(); void load(); }} />;
  if (loading) return <p role="status">Carregando protocolos…</p>;
  if (error) return <div role="alert" className="surface-card p-4"><p>Não foi possível consultar seus protocolos.</p><Button onClick={() => void load()}>Tentar novamente</Button></div>;
  if (!trainings.length && !library.length) return <div className="surface-card p-6 text-center"><p>Nenhum protocolo atribuído.</p><p className="text-sm text-muted-foreground">Quando seu coach enviar um conteúdo, ele aparecerá aqui.</p></div>;

  const activeLibrary = library.filter(row => !row.completed_at);
  const doneLibrary = library.filter(row => !!row.completed_at);

  return <div className="space-y-5">
    {requested && <p role="status" className="text-sm text-muted-foreground">Este conteúdo não está disponível para sua conta.</p>}
    {[{ label: 'Prescrições com exercícios', kind: 'ready', icon: Dumbbell, caption: 'Seu treino em detalhes, exercício por exercício.', rows: trainings.filter(isExecutableTraining) },
      { label: 'Modelos em preparação', kind: 'pending', icon: Layers3, caption: 'O planejamento começa aqui. Seu professor ainda está definindo os exercícios e as doses.', rows: trainings.filter(row => trainingMedia(row).kind === 'model' && !isExecutableTraining(row)) },
      { label: 'Arquivos do profissional', kind: 'files', icon: FileText, caption: 'Materiais de apoio para acompanhar sua jornada.', rows: trainings.filter(row => trainingMedia(row).kind !== 'model' && !isExecutableTraining(row)) }].map(group => group.rows.length > 0 && <section key={group.kind} className={`protocol-group protocol-group--${group.kind}`}>
      <div className="protocol-group-heading"><h3>{group.label}<span>{String(group.rows.length).padStart(2,'0')}</span></h3><p>{group.caption}</p></div>
      <div className="protocol-grid">{group.rows.map((row,index) => <button type="button" key={row.id} className="protocol-tile" onClick={() => setSelected({ source: 'training', row })}>
        <div className="protocol-tile-top"><span className="protocol-tile-icon"><group.icon size={23} aria-hidden="true"/></span><span className="protocol-tile-status">{group.kind==='ready'?'Prescrição disponível':group.kind==='pending'?'Em preparação':'Material do professor'}</span></div>
        <div className="protocol-tile-body"><span className="protocol-tile-number" aria-hidden="true">{String(index+1).padStart(2,'0')}</span><h4>{row.training_name}</h4></div>
        <div className="protocol-tile-action"><span>{group.kind==='pending'?'Consultar planejamento':group.kind==='files'?'Abrir arquivo':'Ver prescrição'}</span><ArrowUpRight size={20} aria-hidden="true"/></div>
      </button>)}</div>
    </section>)}
    {activeLibrary.length > 0 && (
      <div>
        <p className="text-label mb-2">CONTEÚDOS E INFOPRODUTOS ({activeLibrary.length})</p>
        <div className="space-y-2">
          {activeLibrary.map(row => <ProtocolListItem key={row.id} a={row} onOpen={() => setSelected({ source: 'library', row })} />)}
        </div>
      </div>
    )}
    {doneLibrary.length > 0 && (
      <div>
        <p className="text-label mb-2">CONCLUÍDOS ({doneLibrary.length})</p>
        <div className="space-y-2 opacity-60">
          {doneLibrary.map(row => <ProtocolListItem key={row.id} a={row} onOpen={() => setSelected({ source: 'library', row })} />)}
        </div>
      </div>
    )}
  </div>;
}
