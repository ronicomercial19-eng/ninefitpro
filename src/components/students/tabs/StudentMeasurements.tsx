import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ruler, Plus, TrendingUp, Calendar } from "lucide-react";
import { Line } from 'react-chartjs-2';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Measurement {
  id: string;
  measurement_date: string;
  peso_kg?: number;
  altura_cm?: number;
  gordura_corporal?: number;
  massa_muscular?: number;
  imc?: number;
  circunferencia_braco_cm?: number;
  circunferencia_peitoral_cm?: number;
  circunferencia_cintura_cm?: number;
  circunferencia_quadril_cm?: number;
  circunferencia_coxa_cm?: number;
  circunferencia_panturrilha_cm?: number;
  observacoes?: string;
  created_at: string;
}

interface StudentMeasurementsProps {
  studentId: string;
}

export function StudentMeasurements({ studentId }: StudentMeasurementsProps) {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('peso_kg');
  const [newMeasurement, setNewMeasurement] = useState<Partial<Measurement>>({
    measurement_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchMeasurements();
  }, [studentId]);

  const fetchMeasurements = async () => {
    try {
      const { data, error } = await supabase
        .from('student_measurements')
        .select('*')
        .eq('student_id', studentId)
        .order('measurement_date', { ascending: true });

      if (error) throw error;

      setMeasurements(data || []);
    } catch (error) {
      console.error('Erro ao buscar medidas:', error);
      toast.error('Erro ao carregar medidas');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMeasurement = async () => {
    if (!newMeasurement.measurement_date) {
      toast.error('Data é obrigatória');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('student_measurements')
        .insert({
          student_id: studentId,
          ...newMeasurement
        })
        .select()
        .single();

      if (error) throw error;

      setMeasurements([...measurements, data]);
      setNewMeasurement({ measurement_date: new Date().toISOString().split('T')[0] });
      setShowNewForm(false);
      toast.success('Medida adicionada com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar medida:', error);
      toast.error('Erro ao adicionar medida');
    }
  };

  const getChartData = () => {
    const labels = measurements.map(m => 
      new Date(m.measurement_date).toLocaleDateString('pt-BR')
    );
    
    const data = measurements.map(m => m[selectedMetric as keyof Measurement] as number);

    return {
      labels,
      datasets: [
        {
          label: getMetricLabel(selectedMetric),
          data,
          borderColor: 'rgb(249, 115, 22)',
          backgroundColor: 'rgba(249, 115, 22, 0.1)',
          tension: 0.1,
        },
      ],
    };
  };

  const getMetricLabel = (metric: string) => {
    const labels: { [key: string]: string } = {
      peso_kg: 'Peso (kg)',
      altura_cm: 'Altura (cm)',
      gordura_corporal: 'Gordura Corporal (%)',
      massa_muscular: 'Massa Muscular (kg)',
      imc: 'IMC',
      circunferencia_braco_cm: 'Braço (cm)',
      circunferencia_peitoral_cm: 'Peitoral (cm)',
      circunferencia_cintura_cm: 'Cintura (cm)',
      circunferencia_quadril_cm: 'Quadril (cm)',
      circunferencia_coxa_cm: 'Coxa (cm)',
      circunferencia_panturrilha_cm: 'Panturrilha (cm)',
    };
    return labels[metric] || metric;
  };

  const getLatestMeasurement = () => {
    return measurements.length > 0 ? measurements[measurements.length - 1] : null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-3">Carregando medidas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ruler className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Medidas</h2>
        </div>
        
        <Button 
          onClick={() => setShowNewForm(!showNewForm)}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova medida
        </Button>
      </div>

      {/* Medidas Atuais */}
      <Card>
        <CardHeader>
          <CardTitle>Medidas Atuais</CardTitle>
        </CardHeader>
        <CardContent>
          {getLatestMeasurement() ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-orange-50 rounded-lg text-center">
                <div className="text-lg font-semibold text-orange-600">
                  {getLatestMeasurement()?.peso_kg || '-'}
                </div>
                <div className="text-sm text-gray-600">Peso (kg)</div>
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <div className="text-lg font-semibold text-blue-600">
                  {getLatestMeasurement()?.altura_cm || '-'}
                </div>
                <div className="text-sm text-gray-600">Altura (cm)</div>
              </div>
              
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <div className="text-lg font-semibold text-green-600">
                  {getLatestMeasurement()?.imc || '-'}
                </div>
                <div className="text-sm text-gray-600">IMC</div>
              </div>
              
              <div className="p-3 bg-purple-50 rounded-lg text-center">
                <div className="text-lg font-semibold text-purple-600">
                  {getLatestMeasurement()?.gordura_corporal || '-'}
                </div>
                <div className="text-sm text-gray-600">Gordura (%)</div>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">
              Nenhuma medida registrada ainda
            </p>
          )}
        </CardContent>
      </Card>

      {/* Gráfico */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Evolução
            </CardTitle>
            
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="peso_kg">Peso (kg)</SelectItem>
                <SelectItem value="altura_cm">Altura (cm)</SelectItem>
                <SelectItem value="gordura_corporal">Gordura Corporal (%)</SelectItem>
                <SelectItem value="massa_muscular">Massa Muscular (kg)</SelectItem>
                <SelectItem value="imc">IMC</SelectItem>
                <SelectItem value="circunferencia_cintura_cm">Cintura (cm)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {measurements.length > 0 ? (
            <div style={{ height: '400px' }}>
              <Line 
                data={getChartData()} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                    title: {
                      display: true,
                      text: `Evolução - ${getMetricLabel(selectedMetric)}`,
                    },
                  },
                }}
              />
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Adicione medidas para visualizar o gráfico de evolução
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulário de Nova Medida */}
      {showNewForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nova Medida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={newMeasurement.measurement_date}
                  onChange={(e) => setNewMeasurement({...newMeasurement, measurement_date: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Peso (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="70.5"
                  value={newMeasurement.peso_kg || ''}
                  onChange={(e) => setNewMeasurement({...newMeasurement, peso_kg: parseFloat(e.target.value) || undefined})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Altura (cm)</Label>
                <Input
                  type="number"
                  placeholder="175"
                  value={newMeasurement.altura_cm || ''}
                  onChange={(e) => setNewMeasurement({...newMeasurement, altura_cm: parseFloat(e.target.value) || undefined})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Gordura (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="15.2"
                  value={newMeasurement.gordura_corporal || ''}
                  onChange={(e) => setNewMeasurement({...newMeasurement, gordura_corporal: parseFloat(e.target.value) || undefined})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Massa Muscular (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="45.0"
                  value={newMeasurement.massa_muscular || ''}
                  onChange={(e) => setNewMeasurement({...newMeasurement, massa_muscular: parseFloat(e.target.value) || undefined})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Braço (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="35.0"
                  value={newMeasurement.circunferencia_braco_cm || ''}
                  onChange={(e) => setNewMeasurement({...newMeasurement, circunferencia_braco_cm: parseFloat(e.target.value) || undefined})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Peitoral (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="100.0"
                  value={newMeasurement.circunferencia_peitoral_cm || ''}
                  onChange={(e) => setNewMeasurement({...newMeasurement, circunferencia_peitoral_cm: parseFloat(e.target.value) || undefined})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Cintura (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="85.0"
                  value={newMeasurement.circunferencia_cintura_cm || ''}
                  onChange={(e) => setNewMeasurement({...newMeasurement, circunferencia_cintura_cm: parseFloat(e.target.value) || undefined})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações sobre as medidas..."
                value={newMeasurement.observacoes || ''}
                onChange={(e) => setNewMeasurement({...newMeasurement, observacoes: e.target.value})}
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddMeasurement}>
                Salvar Medida
              </Button>
              <Button variant="outline" onClick={() => setShowNewForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Todas as Medidas */}
      <Card>
        <CardHeader>
          <CardTitle>Todas as Medidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-gray-600 mb-4">
              Mostrando todas as entradas
            </p>
            
            <div className="space-y-3">
              {measurements.map((measurement) => (
                <div
                  key={measurement.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">
                      {new Date(measurement.measurement_date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    {measurement.peso_kg && (
                      <span>{measurement.peso_kg} kg</span>
                    )}
                    {measurement.altura_cm && (
                      <span>{measurement.altura_cm} cm</span>
                    )}
                    {measurement.imc && (
                      <span>IMC: {measurement.imc}</span>
                    )}
                  </div>
                  
                  <Button size="sm" variant="outline">
                    Ver Detalhes
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}