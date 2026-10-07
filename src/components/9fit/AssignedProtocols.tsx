import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import { AssignedTraining, isAvailableTraining, trainingMedia } from '@/lib/assignedProtocols';
import { AssignedTrainingViewer } from './AssignedTrainingViewer';
import { ProtocolListItem, ProtocolViewer } from './ProtocolViewer';
import { Button } from '@/components/ui/button';

export function AssignedProtocols({ athleteId }: { athleteId: string | null }) {
  const [trainings, setTrainings] = useState<AssignedTraining[]>([]);
  const [library, setLibrary] = useState<any[]>([]);
  const [selected, setSelected] = useState<{ source: 'training' | 'library'; row: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    if (!athleteId) { setLoading(false); return; }
    setLoading(true); setError(false);
    const [training, contents] = await Promise.all([
      supabase.from('student_training_assignments').select('*').eq('student_id', athleteId).eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('student_library_assignments').select('*').eq('athlete_id', athleteId).order('assigned_at', { ascending: false }),
    ]);
    if (training.error || contents.error) setError(true);
    else { setTrainings((training.data || []).map(row => ({ ...row, training_data: row.training_data && typeof row.training_data === 'object' && !Array.isArray(row.training_data) ? row.training_data : null })).filter(row => isAvailableTraining(row))); setLibrary((contents.data || []).filter(row => row.status !== 'cancelled')); }
    setLoading(false);
  }, [athleteId]);
  useEffect(() => { setSelected(null); void load(); }, [load]);
  useEffect(() => {
    const refresh = () => { void load(); };
    const visibility = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', visibility); };
  }, [load]);
  useRealtimeTable({ table: 'student_training_assignments', filter: athleteId ? 'student_id=eq.'+athleteId : undefined, enabled: !!athleteId }, () => void load());
  useRealtimeTable({ table: 'student_library_assignments', filter: athleteId ? 'athlete_id=eq.'+athleteId : undefined, enabled: !!athleteId }, () => void load());
  if (selected?.source === 'training') return <AssignedTrainingViewer key={selected.row.id} training={selected.row} onBack={() => setSelected(null)} />;
  if (selected) return <ProtocolViewer key={selected.row.id} assignment={selected.row} onBack={() => setSelected(null)} onComplete={() => { setSelected(null); void load(); }} />;
  if (loading) return <p role="status">Carregando protocolos…</p>;
  if (error) return <div role="alert" className="surface-card p-4"><p>Não foi possível consultar seus protocolos.</p><Button onClick={() => void load()}>Tentar novamente</Button></div>;
  if (!trainings.length && !library.length) return <div className="surface-card p-6 text-center"><p>Nenhum protocolo atribuído.</p><p className="text-sm text-muted-foreground">Quando seu coach enviar um conteúdo, ele aparecerá aqui.</p></div>;
  return <div className="space-y-3">
    {trainings.map(row => <button key={row.id} className="surface-card p-4 w-full text-left hover:border-primary/40" onClick={() => setSelected({ source: 'training', row })}>
      <p className="text-xs uppercase text-primary">{trainingMedia(row).kind === 'model' ? 'Prescrição / modelo' : trainingMedia(row).kind}</p><p className="font-semibold">{row.training_name}</p><p className="text-xs text-muted-foreground mt-1">Abrir protocolo →</p>
    </button>)}
    {library.map(row => <ProtocolListItem key={row.id} a={row} onOpen={() => setSelected({ source: 'library', row })} />)}
  </div>;
}
