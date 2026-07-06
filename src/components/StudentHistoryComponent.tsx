import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Zap, Gauge, Activity } from 'lucide-react';
import { getHistoricoPerformance, HistoricoPerformance } from '@/services/assessmentService';
import { Skeleton } from '@/components/ui/skeleton';

interface StudentHistoryProps {
  athleteId: string;
}

const StudentHistoryComponent: React.FC<StudentHistoryProps> = ({ athleteId }) => {
  const [historico, setHistorico] = useState<HistoricoPerformance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistorico = async () => {
      try {
        const data = await getHistoricoPerformance(athleteId);
        setHistorico(data);
      } catch (err) {
        console.error('Erro ao carregar histórico:', err);
      } finally {
        setLoading(false);
      }
    };
    loadHistorico();
  }, [athleteId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!historico) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6 text-center text-muted-foreground">
          Nenhum dado de performance registrado ainda
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Score e Composição */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Score Atual */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Score Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {historico.avaliacao_atual_score !== null
                ? historico.avaliacao_atual_score.toFixed(1)
                : '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Performance geral do atleta</p>
          </CardContent>
        </Card>

        {/* Gordura Corporal */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gauge className="w-4 h-4 text-orange-500" />
              Gordura Corporal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {historico.composicao.gordura_pct !== null
                ? historico.composicao.gordura_pct.toFixed(1)
                : '—'}
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Composição corporal atual</p>
          </CardContent>
        </Card>

        {/* Massa Muscular */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Massa Muscular
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {historico.composicao.musculo_pct !== null
                ? historico.composicao.musculo_pct.toFixed(1)
                : '—'}
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Proporção de músculos</p>
          </CardContent>
        </Card>
      </div>

      {/* Progressão de Força */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Progressão de Força
          </CardTitle>
          <CardDescription>Delta de força entre as últimas avaliações</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Supino */}
            <div className="border rounded-lg p-4 space-y-3">
              <p className="font-semibold text-sm">Supino</p>
              <div className="flex items-end gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Atual</p>
                  <p className="text-2xl font-bold">
                    {historico.progressao_forca.supino.atual?.toFixed(0) || '—'}
                  </p>
                </div>
                <p className="text-muted-foreground text-xs">kg</p>
              </div>
              {historico.progressao_forca.supino.delta !== null && (
                <div className="text-xs font-semibold">
                  <span
                    className={historico.progressao_forca.supino.delta >= 0 ? 'text-green-600' : 'text-red-600'}
                  >
                    {historico.progressao_forca.supino.delta >= 0 ? '+' : ''}
                    {historico.progressao_forca.supino.delta.toFixed(1)} kg
                  </span>
                </div>
              )}
            </div>

            {/* Agachamento */}
            <div className="border rounded-lg p-4 space-y-3">
              <p className="font-semibold text-sm">Agachamento</p>
              <div className="flex items-end gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Atual</p>
                  <p className="text-2xl font-bold">
                    {historico.progressao_forca.agachamento.atual?.toFixed(0) || '—'}
                  </p>
                </div>
                <p className="text-muted-foreground text-xs">kg</p>
              </div>
              {historico.progressao_forca.agachamento.delta !== null && (
                <div className="text-xs font-semibold">
                  <span
                    className={historico.progressao_forca.agachamento.delta >= 0 ? 'text-green-600' : 'text-red-600'}
                  >
                    {historico.progressao_forca.agachamento.delta >= 0 ? '+' : ''}
                    {historico.progressao_forca.agachamento.delta.toFixed(1)} kg
                  </span>
                </div>
              )}
            </div>

            {/* Puxada */}
            <div className="border rounded-lg p-4 space-y-3">
              <p className="font-semibold text-sm">Puxada</p>
              <div className="flex items-end gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Atual</p>
                  <p className="text-2xl font-bold">
                    {historico.progressao_forca.puxada.atual?.toFixed(0) || '—'}
                  </p>
                </div>
                <p className="text-muted-foreground text-xs">kg</p>
              </div>
              {historico.progressao_forca.puxada.delta !== null && (
                <div className="text-xs font-semibold">
                  <span
                    className={historico.progressao_forca.puxada.delta >= 0 ? 'text-green-600' : 'text-red-600'}
                  >
                    {historico.progressao_forca.puxada.delta >= 0 ? '+' : ''}
                    {historico.progressao_forca.puxada.delta.toFixed(1)} kg
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Histórico 8 Semanas */}
      {historico.historico_8_semanas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de 8 Semanas</CardTitle>
            <CardDescription>Evolução do score de performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historico.historico_8_semanas}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="data"
                  tick={{ fontSize: 12 }}
                  interval={Math.floor(historico.historico_8_semanas.length / 4)}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#3b82f6"
                  dot={{ fill: '#3b82f6' }}
                  name="Score"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentHistoryComponent;
