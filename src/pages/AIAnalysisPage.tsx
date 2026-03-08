import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Brain, Loader2, Dumbbell, Apple, Moon, Sparkles, BarChart3 } from 'lucide-react';
import DOMPurify from 'dompurify';

const iconMap: Record<string, React.ElementType> = {
  dumbbell: Dumbbell,
  apple: Apple,
  moon: Moon,
  brain: Brain,
};

const priorityColors: Record<string, string> = {
  alta: 'border-red-500 bg-red-500/10',
  média: 'border-yellow-500 bg-yellow-500/10',
  baixa: 'border-green-500 bg-green-500/10',
};

export default function AIAnalysisPage() {
  const { user } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState('');
  const [analysisHtml, setAnalysisHtml] = useState('');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);

  const { data: students } = useQuery({
    queryKey: ['athletes-for-ai', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('athletes')
        .select('id, name, primary_goal, experience_level, weekly_frequency, injuries_limitations')
        .eq('coach_id', user?.id || '')
        .order('name');
      return data || [];
    },
    enabled: !!user?.id,
  });

  const runAnalysis = async () => {
    if (!selectedStudent) return toast.error('Selecione um aluno');
    const student = students?.find(s => s.id === selectedStudent);
    if (!student) return;

    setLoadingAnalysis(true);
    setAnalysisHtml('');
    try {
      const { data: assessments } = await supabase
        .from('avaliacoes_unificadas')
        .select('peso, gordura_corporal, massa_muscular, data_avaliacao')
        .eq('aluno_id', selectedStudent)
        .order('data_avaliacao', { ascending: false })
        .limit(5);

      const { data: result, error } = await supabase.functions.invoke('ai-coach', {
        body: {
          type: 'analyze_progress',
          data: {
            name: student.name,
            goal: student.primary_goal,
            assessments: assessments || [],
            workoutsCompleted: 0,
            avgFrequency: student.weekly_frequency,
          },
        },
      });
      if (error) throw error;
      setAnalysisHtml(result?.content || '<p>Sem dados suficientes para análise.</p>');
      toast.success('Análise gerada!');
    } catch (err: any) {
      toast.error(err.message || 'Erro na análise');
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const runRecommendations = async () => {
    if (!selectedStudent) return toast.error('Selecione um aluno');
    const student = students?.find(s => s.id === selectedStudent);
    if (!student) return;

    setLoadingRecs(true);
    setRecommendations([]);
    try {
      const { data: result, error } = await supabase.functions.invoke('ai-coach', {
        body: {
          type: 'recommendations',
          data: {
            name: student.name,
            goal: student.primary_goal,
            level: student.experience_level,
            frequency: student.weekly_frequency,
            injuries: student.injuries_limitations,
          },
        },
      });
      if (error) throw error;

      const content = result?.content || '{}';
      try {
        const parsed = JSON.parse(content);
        setRecommendations(parsed.recommendations || []);
      } catch {
        // Try to extract JSON from the content
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          setRecommendations(parsed.recommendations || []);
        }
      }
      toast.success('Recomendações geradas!');
    } catch (err: any) {
      toast.error(err.message || 'Erro nas recomendações');
    } finally {
      setLoadingRecs(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Análise IA & Recomendações</h1>
          <p className="text-sm text-muted-foreground">Insights inteligentes sobre seus alunos</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um aluno" />
                </SelectTrigger>
                <SelectContent>
                  {students?.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={runAnalysis} disabled={loadingAnalysis || !selectedStudent}>
              {loadingAnalysis ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BarChart3 className="w-4 h-4 mr-2" />}
              Analisar Progresso
            </Button>
            <Button variant="secondary" onClick={runRecommendations} disabled={loadingRecs || !selectedStudent}>
              {loadingRecs ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Gerar Recomendações
            </Button>
          </div>
        </CardContent>
      </Card>

      {(loadingAnalysis || loadingRecs) && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-8 text-center">
            <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">A IA está processando os dados...</p>
          </CardContent>
        </Card>
      )}

      {analysisHtml && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Análise de Progresso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(analysisHtml) }}
            />
          </CardContent>
        </Card>
      )}

      {recommendations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-pink-500" />
            Recomendações Personalizadas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((rec, i) => {
              const Icon = iconMap[rec.icon] || Sparkles;
              return (
                <Card key={i} className={`border-l-4 ${priorityColors[rec.priority] || 'border-primary bg-primary/5'}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center border">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-sm">{rec.title}</h4>
                          <span className="text-xs text-muted-foreground capitalize">{rec.category}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{rec.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {!analysisHtml && recommendations.length === 0 && !loadingAnalysis && !loadingRecs && (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Selecione um aluno para começar</h3>
            <p className="text-muted-foreground text-sm">
              A IA analisará os dados de avaliações, check-ins e treinos para gerar insights valiosos.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
