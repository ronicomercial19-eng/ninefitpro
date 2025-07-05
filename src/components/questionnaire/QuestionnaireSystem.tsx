import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle, FileText, Clock, Target, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Question {
  id: string;
  text: string;
  type: 'multiple_choice' | 'text' | 'scale';
  options?: string[];
  required: boolean;
}

interface QuestionSection {
  title: string;
  questions: Question[];
}

interface QuestionnaireData {
  id: string;
  title: string;
  description: string;
  category: string;
  questions: {
    sections: QuestionSection[];
  };
  is_active: boolean;
}

export const QuestionnaireSystem = () => {
  const { user } = useAuth();
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireData[]>([]);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<QuestionnaireData | null>(null);
  const [currentSection, setCurrentSection] = useState<number>(0);
  const [responses, setResponses] = useState<{ [questionId: string]: string }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuestionnaires();
  }, []);

  const handleQuestionnaireSelect = (questionnaire: QuestionnaireData) => {
    setSelectedQuestionnaire(questionnaire);
    setCurrentSection(0);
    setResponses({});
  };

  const handleNextSection = () => {
    setCurrentSection(prev => Math.min(prev + 1, selectedQuestionnaire?.questions.sections.length ? selectedQuestionnaire.questions.sections.length - 1 : 0));
  };

  const handlePrevSection = () => {
    setCurrentSection(prev => Math.max(prev - 1, 0));
  };

  const handleResponseChange = (questionId: string, value: string) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  };

  const fetchQuestionnaires = async () => {
    try {
      const { data, error } = await supabase
        .from('questionnaires')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      // Safe type conversion with validation
      const validatedData = data?.map(item => ({
        ...item,
        questions: typeof item.questions === 'object' && item.questions !== null 
          ? item.questions as { sections: QuestionSection[] }
          : { sections: [] }
      })) || [];

      setQuestionnaires(validatedData);
    } catch (error) {
      console.error('Erro ao buscar questionários:', error);
      toast.error('Erro ao carregar questionários');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (!user || !selectedQuestionnaire) return;

    try {
      const { error } = await supabase
        .from('questionnaire_responses')
        .insert({
          user_id: user.id,
          questionnaire_id: selectedQuestionnaire.id,
          responses: responses,
          completed_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Questionário enviado com sucesso!');
      setSelectedQuestionnaire(null);
      setResponses({});
      setCurrentSection(0);
    } catch (error) {
      console.error('Erro ao enviar respostas:', error);
      toast.error('Erro ao enviar questionário');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Questionnaire Selection */}
      {!selectedQuestionnaire ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Selecione um Questionário
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {questionnaires.map(questionnaire => (
              <Card key={questionnaire.id} className="hover:shadow-md transition-shadow duration-200">
                <CardHeader>
                  <CardTitle>{questionnaire.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-gray-500">{questionnaire.description}</p>
                  <Badge className="bg-blue-100 text-blue-800">{questionnaire.category}</Badge>
                  <Button onClick={() => handleQuestionnaireSelect(questionnaire)} className="w-full mt-2">
                    Responder
                  </Button>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      ) : (
        /* Questionnaire Display */
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {selectedQuestionnaire.title}
              </CardTitle>
              <Badge className="bg-blue-100 text-blue-800">{selectedQuestionnaire.category}</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">{selectedQuestionnaire.description}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedQuestionnaire.questions.sections.length > 0 ? (
              <>
                {/* Section Progress */}
                <div className="mb-4">
                  <div className="text-sm font-medium">
                    Seção {currentSection + 1} de {selectedQuestionnaire.questions.sections.length}
                  </div>
                  <Progress value={((currentSection + 1) / selectedQuestionnaire.questions.sections.length) * 100} />
                </div>

                {/* Questions */}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">
                    {selectedQuestionnaire.questions.sections[currentSection].title}
                  </h2>
                  {selectedQuestionnaire.questions.sections[currentSection].questions.map(question => (
                    <div key={question.id} className="space-y-2">
                      <Label htmlFor={question.id} className="font-medium">
                        {question.text}
                        {question.required && <span className="text-red-500">*</span>}
                      </Label>
                      {question.type === 'multiple_choice' && question.options ? (
                        <RadioGroup defaultValue={responses[question.id]} onValueChange={(value) => handleResponseChange(question.id, value)}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {question.options.map(option => (
                              <div key={option} className="flex items-center space-x-2">
                                <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                                <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
                              </div>
                            ))}
                          </div>
                        </RadioGroup>
                      ) : question.type === 'scale' ? (
                        <RadioGroup defaultValue={responses[question.id]} onValueChange={(value) => handleResponseChange(question.id, value)}>
                          <div className="flex items-center space-x-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(scaleValue => (
                              <div key={scaleValue} className="flex flex-col items-center">
                                <RadioGroupItem value={scaleValue.toString()} id={`${question.id}-${scaleValue}`} />
                                <Label htmlFor={`${question.id}-${scaleValue}`}>{scaleValue}</Label>
                              </div>
                            ))}
                          </div>
                        </RadioGroup>
                      ) : (
                        <Textarea
                          id={question.id}
                          placeholder="Sua resposta"
                          value={responses[question.id] || ''}
                          onChange={(e) => handleResponseChange(question.id, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={handlePrevSection}
                    disabled={currentSection === 0}
                  >
                    Anterior
                  </Button>
                  {currentSection === selectedQuestionnaire.questions.sections.length - 1 ? (
                    <Button onClick={handleSubmitResponse} className="bg-green-500 hover:bg-green-600">
                      Enviar Questionário
                    </Button>
                  ) : (
                    <Button onClick={handleNextSection}>Próxima</Button>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <h3 className="text-lg font-semibold text-gray-600">
                  Nenhuma pergunta disponível neste questionário.
                </h3>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
