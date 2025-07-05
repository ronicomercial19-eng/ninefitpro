
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Activity, Zap, Target, TrendingUp, Award } from "lucide-react";

interface UserMetric {
  id: string;
  metric_type: string;
  value: number;
  unit: string;
  recorded_at: string;
  category?: string;
}

interface StrengthRecord {
  id: string;
  exercise_name: string;
  weight_kg: number;
  reps: number;
  recorded_at: string;
}

export const PersonalizedMetrics = () => {
  const { user } = useAuth();
  const [physicalTests, setPhysicalTests] = useState<UserMetric[]>([]);
  const [strengthRecords, setStrengthRecords] = useState<StrengthRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      // Buscar testes físicos
      const { data: metricsData, error: metricsError } = await supabase
        .from('user_metrics')
        .select('*')
        .eq('user_id', user!.id)
        .eq('category', 'physical_test')
        .order('recorded_at', { ascending: false });

      if (metricsError) throw metricsError;
      setPhysicalTests(metricsData || []);

      // Buscar registros de força
      const { data: strengthData, error: strengthError } = await supabase
        .from('strength_records')
        .select('*')
        .eq('user_id', user!.id)
        .order('recorded_at', { ascending: false });

      if (strengthError) throw strengthError;
      setStrengthRecords(strengthData || []);

    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTestIcon = (testType: string) => {
    switch (testType) {
      case 'flexoes_1min': return '💪';
      case 'agachamentos_1min': return '🦵';
      case 'abdominais_1min': return '🏃';
      case 'polichinelos_1min': return '⚡';
      case 'elevacao_pelvica_1min': return '🏋️';
      default: return '📊';
    }
  };

  const getTestName = (testType: string) => {
    const names: Record<string, string> = {
      'flexoes_1min': 'Flexões (1min)',
      'agachamentos_1min': 'Agachamentos (1min)',
      'abdominais_1min': 'Abdominais (1min)',
      'polichinelos_1min': 'Polichinelos (1min)',
      'elevacao_pelvica_1min': 'Elevação Pélvica (1min)'
    };
    return names[testType] || testType;
  };

  const getPerformanceLevel = (testType: string, value: number) => {
    const benchmarks: Record<string, { beginner: number, intermediate: number, advanced: number }> = {
      'flexoes_1min': { beginner: 15, intermediate: 30, advanced: 45 },
      'agachamentos_1min': { beginner: 20, intermediate: 40, advanced: 60 },
      'abdominais_1min': { beginner: 20, intermediate: 35, advanced: 50 },
      'polichinelos_1min': { beginner: 30, intermediate: 60, advanced: 90 },
      'elevacao_pelvica_1min': { beginner: 15, intermediate: 30, advanced: 45 }
    };

    const benchmark = benchmarks[testType];
    if (!benchmark) return { level: 'Não classificado', color: 'gray', progress: 0 };

    if (value >= benchmark.advanced) {
      return { level: 'Avançado', color: 'green', progress: 100 };
    } else if (value >= benchmark.intermediate) {
      return { level: 'Intermediário', color: 'orange', progress: 75 };
    } else if (value >= benchmark.beginner) {
      return { level: 'Iniciante', color: 'blue', progress: 50 };
    } else {
      return { level: 'Iniciante', color: 'red', progress: 25 };
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (physicalTests.length === 0 && strengthRecords.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Nenhuma avaliação realizada
          </h3>
          <p className="text-gray-500">
            Complete os questionários de avaliação para ver suas métricas personalizadas aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Testes Físicos */}
      {physicalTests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Testes Físicos (1 minuto)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {physicalTests.map((test) => {
                const performance = getPerformanceLevel(test.metric_type, test.value);
                return (
                  <div key={test.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getTestIcon(test.metric_type)}</span>
                        <h4 className="font-semibold text-sm">{getTestName(test.metric_type)}</h4>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-${performance.color}-600 border-${performance.color}-300`}
                      >
                        {performance.level}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold text-orange-500 mb-2">
                      {test.value} {test.unit}
                    </div>
                    <Progress value={performance.progress} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(test.recorded_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Registros de Força */}
      {strengthRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Cargas na Academia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {strengthRecords.map((record) => (
                <div key={record.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{record.exercise_name}</h4>
                    <Award className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="text-2xl font-bold text-orange-500 mb-1">
                    {record.weight_kg} kg
                  </div>
                  <p className="text-sm text-gray-600">
                    {record.reps} rep{record.reps > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(record.recorded_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumo de Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Resumo de Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {physicalTests.length}
              </div>
              <p className="text-sm text-blue-700">Testes Realizados</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {strengthRecords.length}
              </div>
              <p className="text-sm text-orange-700">Exercícios Registrados</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {physicalTests.reduce((sum, test) => sum + test.value, 0)}
              </div>
              <p className="text-sm text-green-700">Total de Repetições</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
