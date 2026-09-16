import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// QA roadmap Fase E (15/09): a tela inteira era 100% hardcoded (51/20/28/3 e um
// gráfico de 12 meses fixo), sem nenhum import do Supabase. Painéis 1 e 2 agora
// puxam dado real (athletes / student_training_assignments, escopados no coach
// logado, como o resto do painel do professor). Os 2 gráficos de "Planos"
// (não renovados / a vencer) dependeriam de uma noção de assinatura com data
// de validade que ainda não existe de fato: student_credits.expires_at tem só
// 5 linhas no banco inteiro, nenhuma preenchida. Em vez de inventar números,
// a tela agora mostra isso como um gap real de produto (ver fitpro.md).

const COLORS = { azul: '#3b82f6', laranja: '#f97316', amarelo: '#eab308' };

export default function StatisticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [totalAlunos, setTotalAlunos] = useState(0);
  const [semTreino, setSemTreino] = useState(0);
  const [comTreinoSemData, setComTreinoSemData] = useState(0);
  const [treinoVencido, setTreinoVencido] = useState(0);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }

    (async () => {
      setLoading(true);

      const { data: atletas } = await supabase
        .from('athletes')
        .select('id')
        .eq('coach_id', user.id)
        .eq('is_test_account', false);

      const athleteIds = (atletas || []).map(a => a.id);
      setTotalAlunos(athleteIds.length);

      if (athleteIds.length > 0) {
        const { data: assignments } = await supabase
          .from('student_training_assignments')
          .select('student_id, end_date, is_active')
          .in('student_id', athleteIds)
          .eq('is_active', true);

        const hoje = new Date().toISOString().split('T')[0];
        const comAtiva = new Set((assignments || []).map(a => a.student_id));
        const semData = (assignments || []).filter(a => !a.end_date).length;
        const vencido = (assignments || []).filter(a => a.end_date && a.end_date < hoje).length;

        setSemTreino(athleteIds.length - comAtiva.size);
        setComTreinoSemData(semData);
        setTreinoVencido(vencido);
      }

      setLoading(false);
    })();
  }, [user?.id]);

  const studentsByTrainerData = [
    { name: 'Você', value: totalAlunos, color: COLORS.azul },
  ];

  const workoutFollowUpData = [
    { name: 'Alunos sem treino', value: semTreino, color: COLORS.azul },
    { name: 'Alunos com treino e sem data', value: comTreinoSemData, color: COLORS.laranja },
    { name: 'Alunos com treino vencido', value: treinoVencido, color: COLORS.amarelo },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Estatísticas</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Total Students by Trainer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-muted-foreground">
              TOTAL DE ALUNOS
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <div className="relative">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={studentsByTrainerData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {studentsByTrainerData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold text-foreground">{totalAlunos}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workout Follow-up */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-muted-foreground">
              ACOMPANHAMENTO DOS TREINOS
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <div className="relative">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={workoutFollowUpData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {workoutFollowUpData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="ml-8 space-y-2">
              {workoutFollowUpData.map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                  <span className="text-sm font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Plans — gap real de produto: ainda não existe conceito de plano/assinatura
            com data de validade populada no banco (student_credits.expires_at
            existe mas está vazio em todas as linhas hoje). */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-medium text-muted-foreground">
              PLANOS (NÃO RENOVADOS / A VENCER)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-white/15 py-10 px-6 text-center">
              <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium">Ainda não há dado real pra esses gráficos</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                Isso depende de um conceito de plano/assinatura com data de validade —
                a tabela que mais se aproxima disso (créditos de aula) existe, mas não
                tem nenhuma data de validade preenchida ainda. Assim que o fluxo de
                planos/renovação existir de fato, esses dois gráficos entram aqui com
                dado real, sem números inventados.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
