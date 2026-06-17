import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Bot, Trash2, Copy, Eye, Loader2 } from 'lucide-react';
import { AITrainingQuestionnaire } from '@/components/ai-training/AITrainingQuestionnaire';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DOMPurify from 'dompurify';

interface AITraining {
  id: number;
  name: string;
  html: string;
  data: any;
  createdAt: string;
}

export default function AITrainingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [aiTrainings, setAiTrainings] = useState<AITraining[]>([]);
  const [generating, setGenerating] = useState(false);
  const [previewTraining, setPreviewTraining] = useState<AITraining | null>(null);

  const handleQuestionnaireComplete = async (data: any) => {
    setGenerating(true);
    setShowQuestionnaire(false);
    toast.info('Gerando treino via SmartTreino...');

    try {
      // CORREÇÃO CRÍTICA: reutilizar rota automática do SmartTreino (fitpro-deliver-workout)
      // em vez de criar nova lógica via ai-coach. Sem periodização → catálogo 9x9x9.
      const { data: result, error } = await supabase.functions.invoke('fitpro-deliver-workout', {
        body: {
          aluno_id: data.studentId || data.aluno_id || null,
          treino: {
            source: 'admin_questionnaire',
            studentName: data.studentName,
            goal: data.goal,
            level: data.level,
            equipment: data.equipment,
            duration: data.duration,
            frequency: data.frequency,
            preferences: data,
          },
        },
      });

      if (error) throw new Error(error.message || 'Falha na invocação da edge function');
      if (result?.success === false) throw new Error(result?.error || 'SmartTreino retornou erro');

      const html =
        result?.html ||
        result?.treino?.html ||
        result?.content ||
        `<pre style="white-space:pre-wrap">${JSON.stringify(result?.treino || result, null, 2)}</pre>`;

      const newTraining: AITraining = {
        id: Date.now(),
        name: `Treino IA - ${data.studentName}`,
        html,
        data,
        createdAt: new Date().toISOString(),
      };

      setAiTrainings(prev => [newTraining, ...prev]);
      toast.success('Treino gerado pelo SmartTreino!');
    } catch (err: any) {
      console.error('SmartTreino delivery error:', err);
      toast.error(err?.message ? `Erro: ${err.message}` : 'Erro ao gerar treino com IA');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (training: AITraining) => {
    navigator.clipboard.writeText(training.html);
    toast.success('HTML do treino copiado para a área de transferência!');
  };

  const handleDelete = (id: number) => {
    setAiTrainings(prev => prev.filter(t => t.id !== id));
    toast.success('Treino removido');
  };

  if (showQuestionnaire) {
    return (
      <AITrainingQuestionnaire
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
        <h1 className="text-3xl font-bold text-foreground">Treino com IA</h1>
        <Button
          className="bg-green-500 hover:bg-green-600"
          onClick={() => setShowQuestionnaire(true)}
          disabled={generating}
        >
          {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          {generating ? 'Gerando...' : 'Novo treino com IA'}
        </Button>
      </div>

      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              O treino com IA gera planos completos e personalizados baseados no perfil do aluno. 
              Use o botão "Copiar" para utilizar o HTML gerado nos templates de treino dos alunos.
            </p>
          </div>
        </CardContent>
      </Card>

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
                    <span className="text-xs text-blue-600 font-medium">Gerado por IA</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(training.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setPreviewTraining(training)}>
                  <Eye className="w-3 h-3 mr-1" /> Ver
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleCopy(training)}>
                  <Copy className="w-3 h-3 mr-1" /> Copiar
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(training.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!generating && filteredTrainings.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum treino com IA</h3>
              <p className="text-muted-foreground mb-4">Crie seu primeiro treino personalizado com inteligência artificial.</p>
              <Button onClick={() => setShowQuestionnaire(true)} className="bg-green-500 hover:bg-green-600">
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
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewTraining.html) }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
