import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AssignedTraining, safeContentUrl, trainingMedia } from '@/lib/assignedProtocols';

export function AssignedTrainingViewer({ training, onBack }: { training: AssignedTraining; onBack: () => void }) {
  const media = trainingMedia(training);
  const [html, setHtml] = useState<string | null>(media.html);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<{ description?: string; goal?: string; duration?: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [privatePdfUrl, setPrivatePdfUrl] = useState<string | null>(null);
  const pdfPath = media.kind === 'pdf' && typeof training.training_data?.file_path === 'string'
    ? training.training_data.file_path
    : media.kind === 'pdf' && training.periodization_file_url && !safeContentUrl(training.periodization_file_url)
      ? training.periodization_file_url : null;
  useEffect(() => {
    const controller = new AbortController();
    setHtml(media.html); setError(false); setLoading(false);
    setModel(null);
    if (media.kind === 'model' && training.training_data?.model_id) {
      setLoading(true);
      supabase.from('periodization_models').select('description,goal,duration').eq('id', training.training_data.model_id).maybeSingle().then(({ data, error }) => {
        if (controller.signal.aborted) return;
        setModel(data); setError(!!error); setLoading(false);
      });
    }
    if (media.kind === 'html' && !media.html && media.url) {
      setLoading(true);
      fetch(media.url, { signal: controller.signal }).then(async response => {
        if (!response.ok) throw new Error('Arquivo indisponível');
        const content = await response.text();
        if (!content.trim()) throw new Error('Arquivo vazio');
        if (!controller.signal.aborted) setHtml(content);
      }).catch(() => { if (!controller.signal.aborted) setError(true); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }
    return () => controller.abort();
  }, [training.id, media.html, media.url, media.kind, training.training_data?.model_id, attempt]);
  useEffect(() => {
    let active = true;
    setPrivatePdfUrl(null);
    if (!pdfPath || !pdfPath.startsWith(`${training.student_id}/`)) return () => { active = false; };
    setLoading(true);
    supabase.storage.from('plans-pdfs').createSignedUrl(pdfPath, 600).then(({ data, error: signError }) => {
      if (!active) return;
      if (signError || !data?.signedUrl) setError(true);
      else setPrivatePdfUrl(data.signedUrl);
      setLoading(false);
    });
    return () => { active = false; };
  }, [pdfPath, training.student_id, attempt]);
  const data = training.training_data || {};
  const fileUrl = pdfPath ? privatePdfUrl : media.url;
  return <div className="space-y-4">
    <Button variant="ghost" onClick={onBack}>Voltar aos protocolos</Button>
    <div className="surface-card p-4"><h2 className="text-xl font-bold">{training.training_name}</h2>
      {training.training_description && <p className="mt-2 text-sm text-muted-foreground">{training.training_description}</p>}
    </div>
    {loading && <p role="status">Carregando protocolo…</p>}
    {error && <div role="alert" className="surface-card p-4"><p>Não foi possível carregar o conteúdo.</p><Button onClick={() => setAttempt(v => v+1)}>Tentar novamente</Button></div>}
    {html && <iframe srcDoc={html} sandbox="allow-scripts" title={training.training_name} className="w-full h-[75vh] rounded-xl border bg-white" />}
    {!html && media.kind === 'pdf' && fileUrl && <iframe src={fileUrl} title={training.training_name} className="w-full h-[75vh] rounded-xl border bg-white" />}
    {fileUrl && <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block text-primary underline">{media.kind === 'pdf' ? 'Abrir / baixar PDF' : 'Abrir arquivo em nova aba'}</a>}
    {media.kind === 'model' && <div className="surface-card p-4 space-y-2">
      {data.model_title && <p>{data.model_title}</p>}
      {model?.description && <p className="whitespace-pre-wrap">{model.description}</p>}
      {data.goal && <p>Objetivo: {data.goal}</p>}
      {data.duration && <p>Duração: {data.duration}</p>}
      {Array.isArray(data.exercises) && data.exercises.map((ex: any, i: number) => <p key={i}>{ex.name || 'Exercício'} — {ex.sets} × {ex.reps}</p>)}
      {!data.exercises?.length && <p className="text-sm text-muted-foreground">Modelo atribuído pelo coach. A prescrição de exercícios deve ser preparada pelo coach antes de iniciar uma sessão guiada.</p>}
    </div>}
  </div>;
}
