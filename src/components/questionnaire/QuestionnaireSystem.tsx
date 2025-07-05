
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Activity, Timer, Zap, Target } from "lucide-react";

interface Question {
  id: string;
  type: string;
  question: string;
  options?: string[];
  multiple?: boolean;
  min?: number;
  max?: number;
  unit?: string;
}

interface QuestionnaireData {
  id: string;
  title: string;
  description: string;
  category: string;
  questions: {
    sections: Array<{
      title: string;
      questions: Question[];
    }>;
  };
}

export const QuestionnaireSystem = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireData[]>([]);
  const [currentQuestionnaire, setCurrentQuestionnaire] = useState<QuestionnaireData | null>(null);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);

  useEffect(() => {
    fetchQuestionnaires();
  }, []);

  const fetchQuestionnaires = async () => {
    try {
      const { data, error } = await supabase
        .from('questionnaires')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setQuestionnaires(data || []);
    } catch (error) {
      console.error('Erro ao buscar questionários:', error);
    }
  };

  const handleQuestionnaireSelect = (questionnaire: QuestionnaireData) => {
    setCurrentQuestionnaire(questionnaire);
    setCurrentSection(0);
    setResponses({});
  };

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = async () => {
    if (!currentQuestionnaire || !user) return;

    setLoading(true);
    try {
      // Salvar respostas do questionário
      const { error: responseError } = await supabase
        .from('questionnaire_responses')
        .insert({
          user_id: user.id,
          questionnaire_id: currentQuestionnaire.id,
          responses: responses
        });

      if (responseError) throw responseError;

      // Salvar métricas específicas baseadas no tipo de questionário
      if (currentQuestionnaire.category === 'fitness') {
        await savePhysicalMetrics();
      } else if (currentQuestionnaire.category === 'strength') {
        await saveStrengthRecords();
      }

      toast({
        title: "Sucesso!",
        description: "Questionário respondido com sucesso!"
      });

      setCurrentQuestionnaire(null);
      setResponses({});
    } catch (error) {
      console.error('Erro ao salvar respostas:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar respostas.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const savePhysicalMetrics = async () => {
    const metrics = [
      { type: 'flexoes_1min', value: responses.flexoes_1min, unit: 'reps' },
      { type: 'agachamentos_1min', value: responses.agachamentos_1min, unit: 'reps' },
      { type: 'abdominais_1min', value: responses.abdominais_1min, unit: 'reps' },
      { type: 'polichinelos_1min', value: responses.polichinelos_1min, unit: 'reps' },
      { type: 'elevacao_pelvica_1min', value: responses.elevacao_pelvica_1min, unit: 'reps' }
    ];

    for (const metric of metrics) {
      if (metric.value) {
        await supabase.from('user_metrics').insert({
          user_id: user!.id,
          metric_type: metric.type,
          value: metric.value,
          unit: metric.unit,
          category: 'physical_test',
          test_date: new Date().toISOString().split('T')[0]
        });
      }
    }
  };

  const saveStrengthRecords = async () => {
    const exercises = [
      { name: 'Supino Reto', weight: responses.supino_reto_carga },
      { name: 'Agachamento Livre', weight: responses.agachamento_livre_carga },
      { name: 'Levantamento Terra', weight: responses.terra_carga },
      { name: 'Puxada Frontal', weight: responses.puxada_frontal_carga },
      { name: 'Desenvolvimento Militar', weight: responses.desenvolvimento_carga }
    ];

    for (const exercise of exercises) {
      if (exercise.weight) {
        await supabase.from('strength_records').insert({
          user_id: user!.id,
          exercise_name: exercise.name,
          weight_kg: exercise.weight,
          reps: 1,
          sets: 1
        });
      }
    }
  };

  const renderQuestion = (question: Question) => {
    switch (question.type) {
      case 'number':
        return (
          <div className="space-y-2">
            <Label>{question.question}</Label>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                min={question.min}
                max={question.max}
                value={responses[question.id] || ''}
                onChange={(e) => handleResponseChange(question.id, parseInt(e.target.value) || 0)}
                className="flex-1"
              />
              {question.unit && <span className="text-sm text-gray-500">{question.unit}</span>}
            </div>
          </div>
        );

      case 'multiple_choice':
        return (
          <div className="space-y-3">
            <Label>{question.question}</Label>
            <div className="grid grid-cols-1 gap-2">
              {question.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${question.id}_${index}`}
                    checked={question.multiple 
                      ? (responses[question.id] || []).includes(option)
                      : responses[question.id] === option
                    }
                    onCheckedChange={(checked) => {
                      if (question.multiple) {
                        const current = responses[question.id] || [];
                        if (checked) {
                          handleResponseChange(question.id, [...current, option]);
                        } else {
                          handleResponseChange(question.id, current.filter((item: string) => item !== option));
                        }
                      } else {
                        handleResponseChange(question.id, checked ? option : '');
                      }
                    }}
                  />
                  <Label htmlFor={`${question.id}_${index}`}>{option}</Label>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'fitness': return <Activity className="w-5 h-5" />;
      case 'strength': return <Zap className="w-5 h-5" />;
      case 'preferences': return <Target className="w-5 h-5" />;
      default: return <Timer className="w-5 h-5" />;
    }
  };

  if (currentQuestionnaire) {
    const currentSectionData = currentQuestionnaire.questions.sections[currentSection];
    const totalSections = currentQuestionnaire.questions.sections.length;
    const progress = ((currentSection + 1) / totalSections) * 100;

    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getCategoryIcon(currentQuestionnaire.category)}
                <CardTitle>{currentQuestionnaire.title}</CardTitle>
              </div>
              <Badge variant="outline">
                Seção {currentSection + 1} de {totalSections}
              </Badge>
            </div>
            <Progress value={progress} className="w-full" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">{currentSectionData.title}</h3>
              <div className="space-y-4">
                {currentSectionData.questions.map((question) => (
                  <div key={question.id} className="p-4 border rounded-lg">
                    {renderQuestion(question)}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                disabled={currentSection === 0}
              >
                Anterior
              </Button>

              {currentSection < totalSections - 1 ? (
                <Button
                  onClick={() => setCurrentSection(currentSection + 1)}
                >
                  Próxima
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {loading ? 'Salvando...' : 'Finalizar'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Avaliação Física Completa</h2>
        <p className="text-gray-600">
          Complete os questionários para personalizar seu treino
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {questionnaires.map((questionnaire) => (
          <Card 
            key={questionnaire.id} 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleQuestionnaireSelect(questionnaire)}
          >
            <CardHeader>
              <div className="flex items-center space-x-2">
                {getCategoryIcon(questionnaire.category)}
                <CardTitle className="text-lg">{questionnaire.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                {questionnaire.description}
              </p>
              <Badge className="bg-orange-500 text-white">
                {questionnaire.questions.sections.length} seções
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
