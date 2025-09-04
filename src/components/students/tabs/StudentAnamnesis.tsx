import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Plus, Heart, Target, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Anamnesis {
  id: string;
  category: string;
  title: string;
  questions_answers: any;
  completed_at: string;
  created_at: string;
}

interface StudentAnamnesisProps {
  studentId: string;
}

export function StudentAnamnesis({ studentId }: StudentAnamnesisProps) {
  const [anamneses, setAnamneses] = useState<Anamnesis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnamneses();
  }, [studentId]);

  const fetchAnamneses = async () => {
    try {
      const { data, error } = await supabase
        .from('student_anamnesis')
        .select('*')
        .eq('student_id', studentId)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      setAnamneses(data || []);
    } catch (error) {
      console.error('Erro ao buscar anamneses:', error);
      toast.error('Erro ao carregar anamneses');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryInfo = (category: string) => {
    const categories = {
      'saude': {
        name: 'Histórico de saúde',
        icon: <Heart className="w-4 h-4" />,
        color: 'bg-red-100 text-red-800',
        description: 'Informações médicas e de saúde'
      },
      'objetivos': {
        name: 'Objetivos e Preferências',
        icon: <Target className="w-4 h-4" />,
        color: 'bg-blue-100 text-blue-800',
        description: 'Metas e preferências de treinamento'
      },
      'preferencias': {
        name: 'Preferências',
        icon: <Settings className="w-4 h-4" />,
        color: 'bg-green-100 text-green-800',
        description: 'Preferências pessoais'
      },
      'par-q': {
        name: 'PAR-Q',
        icon: <ClipboardList className="w-4 h-4" />,
        color: 'bg-purple-100 text-purple-800',
        description: 'Questionário de prontidão para atividade física'
      }
    };

    return categories[category as keyof typeof categories] || {
      name: category,
      icon: <ClipboardList className="w-4 h-4" />,
      color: 'bg-gray-100 text-gray-800',
      description: 'Questionário personalizado'
    };
  };

  const defaultQuestionnaires = [
    {
      category: 'objetivos',
      title: 'Objetivos e Preferências',
      questions: [
        { question: 'Faça um breve resumo sobre você', answer: '' },
        { question: 'Descreva em detalhes seus objetivos e metas com a prática do exercício físico', answer: '' },
        { question: 'Você pratica alguma atividade física ou esporte específico? Se sim, qual? Com qual frequência?', answer: '' },
        { question: 'Com qual frequência semanal pretende treinar?', answer: '' },
        { question: 'Quais os dias disponíveis da semana para treino?', answer: '' },
        { question: 'Quantos minutos por dia você tem disponível para treinar?', answer: '' },
        { question: 'Quais os períodos de horário da sua preferência? (Manhã, Tarde, Noite)', answer: '' },
        { question: 'Em qual ambiente pretende treinar? (Academia, Em casa, Ar livre)', answer: '' },
        { question: 'Caso faça exercícios atualmente, descreva brevemente seu treino', answer: '' },
        { question: 'Tem algum tipo de exercício preferencial?', answer: '' }
      ]
    },
    {
      category: 'saude',
      title: 'Histórico de saúde',
      questions: [
        { question: 'Possui alguma lesão atual ou histórico de lesões?', answer: '' },
        { question: 'Está fazendo uso de algum medicamento?', answer: '' },
        { question: 'Possui alguma doença crônica ou condição médica?', answer: '' },
        { question: 'Já fez alguma cirurgia?', answer: '' },
        { question: 'Tem alguma restrição alimentar ou alergia?', answer: '' },
        { question: 'Como avalia sua qualidade do sono?', answer: '' },
        { question: 'Pratica alguma atividade de relaxamento ou meditação?', answer: '' }
      ]
    },
    {
      category: 'par-q',
      title: 'PAR-Q',
      questions: [
        { question: 'Algum médico já disse que você possui algum problema do coração e que só deveria realizar atividade física supervisionada por profissionais de saúde?', answer: '' },
        { question: 'Você sente dores no peito quando pratica atividade física?', answer: '' },
        { question: 'No último mês, você sentiu dores no peito quando não estava fazendo atividade física?', answer: '' },
        { question: 'Você perde o equilíbrio por causa de tonturas ou já perdeu a consciência?', answer: '' },
        { question: 'Você tem algum problema ósseo ou articular que poderia piorar com a mudança em sua atividade física?', answer: '' },
        { question: 'Seu médico já recomendou remédios para sua pressão arterial ou condição do coração?', answer: '' },
        { question: 'Você sabe de alguma outra razão pela qual você não deve realizar atividade física?', answer: '' }
      ]
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-3">Carregando anamneses...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Anamneses</h2>
        </div>
      </div>

      {/* Questionários Disponíveis */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Questionários</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {defaultQuestionnaires.map((questionnaire) => {
            const categoryInfo = getCategoryInfo(questionnaire.category);
            const hasCompleted = anamneses.some(a => a.category === questionnaire.category);
            
            return (
              <Card key={questionnaire.category} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {categoryInfo.icon}
                      <CardTitle className="text-base">{categoryInfo.name}</CardTitle>
                    </div>
                    
                    {hasCompleted ? (
                      <Badge className="bg-green-100 text-green-800">
                        Preenchido
                      </Badge>
                    ) : (
                      <Badge className="bg-orange-100 text-orange-800">
                        Pendente
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    {categoryInfo.description}
                  </p>
                  
                  <div className="text-xs text-gray-500 mb-3">
                    {questionnaire.questions.length} perguntas
                  </div>
                  
                  <Button 
                    size="sm" 
                    className="w-full"
                    variant={hasCompleted ? "outline" : "default"}
                  >
                    {hasCompleted ? 'Ver Respostas' : 'Preencher'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Anamneses Preenchidas */}
      {anamneses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Anamneses Preenchidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {anamneses.map((anamnesis) => {
                const categoryInfo = getCategoryInfo(anamnesis.category);
                
                return (
                  <div
                    key={anamnesis.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${categoryInfo.color}`}>
                        {categoryInfo.icon}
                      </div>
                      
                      <div>
                        <h4 className="font-medium">{anamnesis.title}</h4>
                        <p className="text-sm text-gray-600">
                          Preenchido em {new Date(anamnesis.completed_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={categoryInfo.color}>
                        {categoryInfo.name}
                      </Badge>
                      <Button size="sm" variant="outline">
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview de uma anamnese exemplo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Objetivos e preferências
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium text-gray-700">P: Faça um breve resumo sobre você</p>
              <p className="text-gray-600 bg-gray-50 p-2 rounded mt-1">
                R: Sem resposta
              </p>
            </div>
            
            <div>
              <p className="font-medium text-gray-700">
                P: Descreva em detalhes seus objetivos e metas com a prática do exercício físico
              </p>
              <p className="text-gray-600 bg-gray-50 p-2 rounded mt-1">
                R: Fortalecimento muscular com foco principal no core, coxinha, coxas e peitoral
              </p>
            </div>
            
            <div>
              <p className="font-medium text-gray-700">
                P: Você pratica alguma atividade física ou esporte específico? Se sim, qual? Com qual frequência?
              </p>
              <p className="text-gray-600 bg-gray-50 p-2 rounded mt-1">
                R: Pilates e caminhadas
              </p>
            </div>
            
            <div>
              <p className="font-medium text-gray-700">P: Com qual frequência semanal pretende treinar?</p>
              <p className="text-gray-600 bg-gray-50 p-2 rounded mt-1">
                R: 1x por semana
              </p>
            </div>
            
            <div>
              <p className="font-medium text-gray-700">P: Quais os dias disponíveis da semana para treino?</p>
              <p className="text-gray-600 bg-gray-50 p-2 rounded mt-1">
                R: segunda, quarta e sexta
              </p>
            </div>
            
            <div>
              <p className="font-medium text-gray-700">P: Quantos minutos por dia você tem disponível para treinar?</p>
              <p className="text-gray-600 bg-gray-50 p-2 rounded mt-1">
                R: 60
              </p>
            </div>
            
            <div>
              <p className="font-medium text-gray-700">
                P: Quais os períodos de horário da sua preferência? (Manhã, Tarde, Noite)
              </p>
              <p className="text-gray-600 bg-gray-50 p-2 rounded mt-1">
                R: noite
              </p>
            </div>
            
            <div>
              <p className="font-medium text-gray-700">
                P: Em qual ambiente pretende treinar? (Academia, Em casa, Ar livre)
              </p>
              <p className="text-gray-600 bg-gray-50 p-2 rounded mt-1">
                R: Academia do condomínio
              </p>
            </div>
            
            <div>
              <p className="font-medium text-gray-700">P: Caso faça exercícios atualmente, descreva brevemente seu treino</p>
              <p className="text-gray-600 bg-gray-50 p-2 rounded mt-1">
                R: Pilates com alongamentos e fortalecimento do core, coxinha, costas e peitoral
              </p>
            </div>
            
            <div>
              <p className="font-medium text-gray-700">P: Tem algum tipo de exercício preferencial?</p>
              <p className="text-gray-600 bg-gray-50 p-2 rounded mt-1">
                R: Sem resposta
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}