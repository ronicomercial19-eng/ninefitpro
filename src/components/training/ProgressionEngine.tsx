
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertCircle, CheckCircle, Target, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WorkoutSession {
  id: string;
  date: string;
  exercise: string;
  sets_completed: number;
  reps_completed: number[];
  weight_used: number;
  rpe_reported: number;
  notes?: string;
}

interface ProgressionRule {
  condition: string;
  action: string;
  description: string;
}

const progressionRules: ProgressionRule[] = [
  {
    condition: "RPE < 7 em todas as séries",
    action: "Aumentar carga em 5-10%",
    description: "Exercício muito fácil - hora de progressão"
  },
  {
    condition: "RPE entre 7-9",
    action: "Manter carga atual",
    description: "Zona ideal de treinamento"
  },
  {
    condition: "RPE > 9 ou falha técnica",
    action: "Reduzir carga em 5%",
    description: "Sobrecarga excessiva - ajuste necessário"
  },
  {
    condition: "3 sessões consecutivas RPE < 7",
    action: "Aumentar volume (séries/reps)",
    description: "Adaptação completa - progressão em volume"
  }
];

export const ProgressionEngine = () => {
  const [sessions, setSessions] = useState<WorkoutSession[]>([
    {
      id: "1",
      date: "2024-01-15",
      exercise: "Supino reto",
      sets_completed: 3,
      reps_completed: [10, 8, 6],
      weight_used: 80,
      rpe_reported: 8,
      notes: "Boa execução técnica"
    },
    {
      id: "2",
      date: "2024-01-17",
      exercise: "Supino reto",
      sets_completed: 3,
      reps_completed: [10, 9, 7],
      weight_used: 80,
      rpe_reported: 7,
      notes: "Sentiu mais fácil que a sessão anterior"
    },
    {
      id: "3",
      date: "2024-01-19",
      exercise: "Supino reto",
      sets_completed: 3,
      reps_completed: [10, 10, 8],
      weight_used: 80,
      rpe_reported: 6,
      notes: "Muito fácil - precisa aumentar carga"
    }
  ]);

  const [recommendations, setRecommendations] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    generateRecommendations();
  }, [sessions]);

  const generateRecommendations = () => {
    const newRecommendations: string[] = [];
    
    // Análise das últimas 3 sessões
    const recentSessions = sessions.slice(-3);
    const avgRPE = recentSessions.reduce((sum, session) => sum + session.rpe_reported, 0) / recentSessions.length;
    
    if (avgRPE < 7) {
      newRecommendations.push("🔥 Aumentar carga em 5-10% na próxima sessão");
    } else if (avgRPE > 8.5) {
      newRecommendations.push("⚠️ Reduzir carga em 5% para manter qualidade técnica");
    }

    // Análise de progressão
    if (recentSessions.length >= 3) {
      const isProgressing = recentSessions.every((session, index) => {
        if (index === 0) return true;
        const prevSession = recentSessions[index - 1];
        return session.reps_completed.reduce((a, b) => a + b, 0) >= 
               prevSession.reps_completed.reduce((a, b) => a + b, 0);
      });

      if (isProgressing) {
        newRecommendations.push("✅ Progressão consistente mantida");
      } else {
        newRecommendations.push("📊 Considerar semana de deload");
      }
    }

    // Análise de volume
    const totalVolume = recentSessions.reduce((sum, session) => {
      return sum + (session.reps_completed.reduce((a, b) => a + b, 0) * session.weight_used);
    }, 0);

    if (totalVolume > 0) {
      newRecommendations.push(`📈 Volume médio das últimas 3 sessões: ${Math.round(totalVolume / recentSessions.length)}kg`);
    }

    setRecommendations(newRecommendations);
  };

  const applyRecommendation = (recommendation: string) => {
    toast({
      title: "Recomendação Aplicada",
      description: recommendation,
    });
  };

  const getProgressColor = (rpe: number) => {
    if (rpe <= 6) return "bg-green-500";
    if (rpe <= 8) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getRPELabel = (rpe: number) => {
    if (rpe <= 6) return "Fácil";
    if (rpe <= 8) return "Moderado";
    return "Difícil";
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-orange-500" />
            Motor de Progressão Automática
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Histórico de Sessões */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Histórico Recente</h3>
              {sessions.map((session, index) => (
                <Card key={session.id} className="border-l-4 border-l-orange-500">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{session.exercise}</h4>
                        <p className="text-sm text-gray-500">{new Date(session.date).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <Badge className={`${getProgressColor(session.rpe_reported)} text-white`}>
                        RPE {session.rpe_reported}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                      <div>
                        <span className="font-medium">Séries:</span> {session.sets_completed}
                      </div>
                      <div>
                        <span className="font-medium">Carga:</span> {session.weight_used}kg
                      </div>
                      <div>
                        <span className="font-medium">Reps:</span> {session.reps_completed.join(', ')}
                      </div>
                      <div>
                        <span className="font-medium">Percepção:</span> {getRPELabel(session.rpe_reported)}
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Intensidade</span>
                        <span>{session.rpe_reported}/10</span>
                      </div>
                      <Progress value={session.rpe_reported * 10} className="h-2" />
                    </div>

                    {session.notes && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                        <span className="font-medium">Obs:</span> {session.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Recomendações */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Recomendações IA</h3>
              
              <div className="space-y-3">
                {recommendations.map((rec, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <p className="text-sm flex-1">{rec}</p>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => applyRecommendation(rec)}
                          className="ml-2"
                        >
                          Aplicar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Algoritmo de Progressão */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Regras de Progressão
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {progressionRules.map((rule, index) => (
                      <div key={index} className="border-l-4 border-l-gray-300 pl-4">
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                          <div>
                            <p className="font-medium text-sm">{rule.condition}</p>
                            <p className="text-sm text-gray-600">{rule.action}</p>
                            <p className="text-xs text-gray-500 mt-1">{rule.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Métricas de Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Métricas de Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {sessions.length > 0 ? 
                          (sessions.reduce((sum, s) => sum + s.rpe_reported, 0) / sessions.length).toFixed(1) : 
                          '0'
                        }
                      </div>
                      <div className="text-sm text-blue-600">RPE Médio</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {sessions.length > 0 ? 
                          Math.round(sessions.reduce((sum, s) => sum + s.reps_completed.reduce((a, b) => a + b, 0) * s.weight_used, 0) / sessions.length) : 
                          0
                        }
                      </div>
                      <div className="text-sm text-green-600">Volume Médio</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {sessions.filter(s => s.rpe_reported >= 7 && s.rpe_reported <= 9).length}
                      </div>
                      <div className="text-sm text-purple-600">Sessões Ótimas</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {sessions.length > 1 ? 
                          Math.round(((sessions[sessions.length - 1].weight_used - sessions[0].weight_used) / sessions[0].weight_used) * 100) : 
                          0
                        }%
                      </div>
                      <div className="text-sm text-orange-600">Progressão</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
