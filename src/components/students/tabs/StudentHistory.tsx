import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Activity, Calendar, Plus, CheckCircle, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ActivityRecord {
  id: string;
  activity_type: string;
  activity_name: string;
  activity_date: string;
  details: any;
  status: string;
  created_at: string;
}

interface StudentHistoryProps {
  studentId: string;
}

export function StudentHistory({ studentId }: StudentHistoryProps) {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    fetchActivities();
  }, [studentId]);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('student_activity_history')
        .select('*')
        .eq('student_id', studentId)
        .order('activity_date', { ascending: false });

      if (error) throw error;

      setActivities(data || []);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  const addNewActivity = async (activityType: string, activityName: string) => {
    try {
      const { data, error } = await supabase
        .from('student_activity_history')
        .insert({
          student_id: studentId,
          activity_type: activityType,
          activity_name: activityName,
          activity_date: new Date().toISOString(),
          status: 'concluido'
        })
        .select()
        .single();

      if (error) throw error;

      setActivities([data, ...activities]);
      toast.success('Atividade registrada com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar atividade:', error);
      toast.error('Erro ao registrar atividade');
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'treino':
        return <Activity className="w-4 h-4" />;
      case 'avaliacao':
        return <CheckCircle className="w-4 h-4" />;
      case 'mensalidade':
        return <Calendar className="w-4 h-4" />;
      case 'aula':
        return <Clock className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'concluido': { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
      'faltou': { color: 'bg-red-100 text-red-800', icon: <XCircle className="w-3 h-3" /> },
      'cancelado': { color: 'bg-gray-100 text-gray-800', icon: <XCircle className="w-3 h-3" /> }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['concluido'];
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'treino':
        return 'bg-blue-100 text-blue-800';
      case 'avaliacao':
        return 'bg-green-100 text-green-800';
      case 'mensalidade':
        return 'bg-purple-100 text-purple-800';
      case 'aula':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-3">Carregando histórico...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Histórico de Atividade</h2>
        </div>
        
        <Button 
          onClick={() => addNewActivity('treino', 'Treino Manual')}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Mostrando <strong>{activities.length}</strong> entradas para o período{' '}
              <strong>Últimos 30 dias</strong>
            </div>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-40"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Atividades */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de Atividades</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma atividade registrada
              </h3>
              <p className="text-gray-600 mb-6">
                O histórico de atividades aparecerá aqui conforme forem sendo registradas.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getActivityTypeColor(activity.activity_type)}`}>
                      {getActivityIcon(activity.activity_type)}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{activity.activity_name}</span>
                        <Badge className={getActivityTypeColor(activity.activity_type)}>
                          {activity.activity_type}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(activity.activity_date).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(activity.activity_date).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(activity.status)}
                    <Button size="sm" variant="outline">
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo do Período */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {activities.filter(a => a.status === 'concluido').length}
              </div>
              <div className="text-sm text-gray-600">Concluídos</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {activities.filter(a => a.status === 'faltou').length}
              </div>
              <div className="text-sm text-gray-600">Faltas</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {activities.filter(a => a.activity_type === 'treino').length}
              </div>
              <div className="text-sm text-gray-600">Treinos</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {activities.filter(a => a.activity_type === 'aula').length}
              </div>
              <div className="text-sm text-gray-600">Aulas</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}