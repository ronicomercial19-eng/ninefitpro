import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Bot, Eye, Loader2, Send, Users } from 'lucide-react';
import { AITrainingQuestionnaire } from '@/components/ai-training/AITrainingQuestionnaire';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DOMPurify from 'dompurify';

interface AITraining {
  id: string;
  athleteId: string;
  name: string;
  html: string;
  data: any;
  createdAt: string;
}

export default function AITrainingPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const athleteId = new URLSearchParams(location.search).get('athleteId');
  const [athlete, setAthlete] = useState<{id: string; name: string} | null>(null);
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set());
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [aiTrainings, setAiTrainings] = useState<AITraining[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [previewTraining, setPreviewTraining] = useState<AITraining | null>(null);

  // QA (15/09): antes esses treinos só viviam em useState — sumiam ao
  // recarregar a página. Agora persistem em ai_training_generations.
  const loadTrainings = async () => {
    setAthlete(null);
    setAiTrainings([]);
    setPublishedIds(new Set());
    if (!user?.id || !athleteId) { setLoadingList(false); return; }
    setLoadingList(true);
    const { data: selectedAthlete, error: athleteError } = await supabase.from('athletes').select('id,name').eq('id', athleteId).maybeSingle();
    if (athleteError || !selectedAthlete) { toast.error('Aluno indisponível ou sem acesso.'); setLoadingList(false); return; }
    setAthlete(selectedAthlete);
    const { data, error } = await supabase
      .from('ai_training_generations' as any)
      .select('id, athlete_id, student_name, html, request_data, created_at')
      .eq('coach_id', user.id)
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[AITrainingPage] falha ao carregar histórico:', error);
    } else {
      setAiTrainings((data || []).map((row: any) => ({
        id: row.id,
        athleteId: row.athlete_id,
        name: `Treino IA - ${row.student_name}`,
        html: row.html,
        data: row.request_data,
        createdAt: row.created_at,
      })));
    }
    const { data: assignments, error: assignmentError } = await supabase.from('student_training_assignments').select('training_data').eq('student_id', athleteId);
    if (assignmentError) toast.error('Não foi possível verificar os treinos entregues.');
    else setPublishedIds(new Set((assignments || []).map(row => (row.training_data as any)?.generation_id).filter(Boolean)));
    setLoadingList(false);
  };

  useEffect(() => { void loadTrainings(); }, [user?.id, athleteId]);

  const handleQuestionnaireComplete = async (data: any) => {
    if (!athlete || !user?.id || data.studentId !== athlete.id) return;
    setGenerating(true);
    setShowQuestionnaire(false);

    try {
      const { data: result, error } = await supabase.functions.invoke('ai-coach', {
        body: { mode: 'generate_training', data: { ...data, athleteId: athlete.id, studentName: athlete.name } },
      });
      if (error || result?.success !== true || typeof result?.data?.content !== 'string') throw error ?? new Error('Resposta inválida da IA');
      const html = DOMPurify.sanitize(result.data.content).trim();
      if (!html) throw new Error('A IA não retornou um treino válido');

      const { data: saved, error: saveError } = await supabase
        .from('ai_training_generations' as any)
        .insert({
          coach_id: user.id,
          athlete_id: athlete.id,
          student_name: athlete.name,
          html,
          request_data: data,
        })
        .select('id, athlete_id, student_name, html, request_data, created_at')
        .single();

      if (saveError) throw saveError;

      const row: any = saved;
      const newTraining: AITraining = {
        id: row.id,
        athleteId: row.athlete_id,
        name: `Treino IA - ${row.student_name}`,
        html: row.html,
        data: row.request_data,
        createdAt: row.created_at,
      };

      setAiTrainings(prev => [newTraining, ...prev]);
      setPreviewTraining(newTraining);
      toast.success('Rascunho gerado. Revise antes de entregar ao aluno.');
    } catch (err: any) {
      console.error('generate_training error:', err);
      toast.error(err?.message ? `Erro: ${err.message}` : 'Erro ao gerar treino com IA');
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async (training: AITraining) => {
    if (!athlete || !user?.id || training.athleteId !== athlete.id || publishingId || publishedIds.has(training.id)) return;
    setPublishingId(training.id);
    try {
      const { data: existing, error: checkError } = await supabase.from('student_training_assignments')
        .select('id').eq('student_id', athlete.id).contains('training_data', { generation_id: training.id }).limit(1);
      if (checkError) throw checkError;
      if (!existing?.length) {
        const { error } = await supabase.from('student_training_assignments').insert({
          student_id: athlete.id, created_by: user.id, training_name: training.name,
          training_description: 'Treino gerado com IA e revisado pelo professor',
          training_type: 'html', content_type: 'html', periodization_html: training.html,
          training_data: { source: 'ai_training_generation', generation_id: training.id },
          start_date: new Date().toLocaleDateString('en-CA'), is_active: true,
        } as any);
        if (error) throw error;
      }
      setPublishedIds(previous => new Set(previous).add(training.id));
      toast.success(existing?.length ? 'Este treino já foi entregue.' : 'Treino entregue ao aluno.');
    } catch (error: any) { toast.error(error?.message || 'Não foi possível entregar o treino.'); }
    finally { setPublishingId(null); }
  };


  if (showQuestionnaire) {
    return (
      <AITrainingQuestionnaire
        studentId={athlete!.id}
        studentName={athlete!.name}
        onComplete={handleQuestionnaireComplete}
        onCancel={() => setShowQuestionnaire(false)}
      />
    );
  }

  const filteredTrainings = aiTrainings.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-foreground">Treino com IA</h1><p className="text-sm text-muted-foreground">{athlete ? `Aluno em foco: ${athlete.name}` : loadingList ? 'Carregando aluno…' : 'Selecione um aluno no cabeçalho para começar.'}</p></div>
        <Button
          className="bg-green-500 hover:bg-green-600"
          onClick={() => setShowQuestionnaire(true)}
          disabled={generating || loadingList || !athlete}
        >
          {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          {generating ? 'Gerando...' : 'Novo rascunho'}
        </Button>
      </div>

      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Gere um treino para o aluno em foco, revise o conteúdo e use “Entregar ao aluno” quando estiver pronto. Rascunhos não aparecem no aplicativo do aluno.
            </p>
          </div>
        </CardContent>
      </Card>

      {!athleteId && <Button variant="outline" onClick={() => navigate('/app/alunos')}><Users className="w-4 h-4 mr-2" />Escolher aluno</Button>}

      {generating && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-8">
            <div className="text-center space-y-3">
              <Loader2 className="w-10 h-10 text-primary mx-auto animate-spin" />
              <h3 className="text-lg font-medium">Gerando treino com IA...</h3>
              <p className="text-sm text-muted-foreground">A inteligência artificial está criando um plano personalizado</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Pesquisar treinos gerados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {loadingList && !generating && (
        <div className="text-center text-sm text-muted-foreground py-6">
          <Loader2 className="w-5 h-5 mx-auto animate-spin mb-2" /> Carregando histórico...
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTrainings.map((training) => (
          <Card key={training.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-1 h-16 bg-primary rounded" />
                <div className="flex-1 ml-4">
                  <h3 className="font-semibold text-lg mb-1">{training.name}</h3>
                  <div className="flex items-center gap-2 mb-1">
                    <Bot className="w-4 h-4 text-blue-500" />
                    <span className="text-xs text-blue-600 font-medium">{publishedIds.has(training.id) ? 'Entregue ao aluno' : 'Rascunho para revisão'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(training.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setPreviewTraining(training)}>
                  <Eye className="w-3 h-3 mr-1" /> Revisar
                </Button>
                <Button size="sm" className="flex-1" onClick={() => void handlePublish(training)} disabled={publishedIds.has(training.id) || !!publishingId}>
                  <Send className="w-3 h-3 mr-1" /> {publishedIds.has(training.id) ? 'Entregue' : publishingId === training.id ? 'Entregando...' : 'Entregar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!generating && !loadingList && filteredTrainings.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum treino com IA</h3>
              <p className="text-muted-foreground mb-4">Crie seu primeiro treino personalizado com inteligência artificial.</p>
              <Button onClick={() => setShowQuestionnaire(true)} disabled={!athlete} className="bg-green-500 hover:bg-green-600">
                <Plus className="w-4 h-4 mr-2" /> Gerar primeiro treino
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!previewTraining} onOpenChange={() => setPreviewTraining(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTraining?.name}</DialogTitle>
          </DialogHeader>
          {previewTraining && (
            <>
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewTraining.html) }}
            />
            <Button onClick={() => void handlePublish(previewTraining)} disabled={publishedIds.has(previewTraining.id) || !!publishingId}>{publishedIds.has(previewTraining.id) ? 'Entregue ao aluno' : 'Entregar ao aluno'}</Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
