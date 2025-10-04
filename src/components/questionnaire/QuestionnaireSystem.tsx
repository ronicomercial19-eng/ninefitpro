
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface QuestionOption {
  value: string;
  label: string;
  points?: number;
}

interface Question {
  id: string;
  text: string;
  type: 'radio' | 'checkbox' | 'scale';
  options: QuestionOption[];
  required?: boolean;
}

interface QuestionSection {
  title: string;
  questions: Question[];
}

interface Questionnaire {
  id: string;
  title: string;
  description: string;
  sections: QuestionSection[];
  scoring_system?: any;
  recommendations?: any;
}

export const QuestionnaireSystem = () => {
  const { user } = useAuth();
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [currentQuestionnaire, setCurrentQuestionnaire] = useState<Questionnaire | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [loading, setLoading] = useState(false);

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

      const formattedQuestionnaires = data?.map(q => ({
        id: q.id,
        title: q.title,
        description: q.description || '',
        sections: (q.questions as any)?.sections || [],
        scoring_system: q.scoring_system,
        recommendations: q.recommendations
      })) || [];

      setQuestionnaires(formattedQuestionnaires);
    } catch (error) {
      console.error('Erro ao buscar questionários:', error);
      toast.error('Erro ao carregar questionários');
    }
  };

  const startQuestionnaire = (questionnaire: Questionnaire) => {
    setCurrentQuestionnaire(questionnaire);
    setCurrentSection(0);
    setResponses({});
  };

  const handleResponse = (questionId: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const nextSection = () => {
    if (currentQuestionnaire && currentSection < currentQuestionnaire.sections.length - 1) {
      setCurrentSection(prev => prev + 1);
    }
  };

  const prevSection = () => {
    if (currentSection > 0) {
      setCurrentSection(prev => prev - 1);
    }
  };

  const submitQuestionnaire = async () => {
    if (!currentQuestionnaire) return;

    setLoading(true);
    try {
      // Se não tiver usuário logado, apenas redireciona ao WhatsApp
      if (!user) {
        toast.success('Questionário concluído! Redirecionando...');
        setTimeout(() => {
          window.location.href = '/whatsapp-redirect';
        }, 1500);
        return;
      }

      const { error } = await supabase
        .from('questionnaire_responses')
        .insert({
          user_id: user.id,
          questionnaire_id: currentQuestionnaire.id,
          responses: responses,
          completed_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Questionário enviado com sucesso!');
      setCurrentQuestionnaire(null);
      setResponses({});
      setCurrentSection(0);
    } catch (error) {
      console.error('Erro ao enviar questionário:', error);
      toast.error('Erro ao enviar questionário');
    } finally {
      setLoading(false);
    }
  };

  if (!currentQuestionnaire) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Questionários Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {questionnaires.map(questionnaire => (
                <Card key={questionnaire.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2">{questionnaire.title}</h3>
                    <p className="text-gray-600 mb-4">{questionnaire.description}</p>
                    <Button onClick={() => startQuestionnaire(questionnaire)}>
                      Iniciar Questionário
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentSectionData = currentQuestionnaire.sections[currentSection];
  const progress = ((currentSection + 1) / currentQuestionnaire.sections.length) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{currentQuestionnaire.title}</CardTitle>
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-gray-600">
            Seção {currentSection + 1} de {currentQuestionnaire.sections.length}
          </p>
        </CardHeader>
        <CardContent>
          <h2 className="text-xl font-semibold mb-6">{currentSectionData.title}</h2>
          
          <div className="space-y-6">
            {currentSectionData.questions.map(question => (
              <div key={question.id} className="space-y-3">
                <Label className="text-base font-medium">
                  {question.text}
                  {question.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                
                <RadioGroup
                  value={responses[question.id] || ''}
                  onValueChange={(value) => handleResponse(question.id, value)}
                >
                  {question.options.map(option => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label htmlFor={option.value}>{option.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}
          </div>

          <div className="flex justify-between mt-8">
            <Button 
              variant="outline" 
              onClick={prevSection}
              disabled={currentSection === 0}
            >
              Anterior
            </Button>
            
            {currentSection < currentQuestionnaire.sections.length - 1 ? (
              <Button onClick={nextSection}>
                Próxima
              </Button>
            ) : (
              <Button onClick={submitQuestionnaire} disabled={loading}>
                {loading ? 'Enviando...' : 'Finalizar'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
