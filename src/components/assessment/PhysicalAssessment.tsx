
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AssessmentChart } from "./AssessmentChart";

interface AssessmentData {
  upper_pull_before: number;
  upper_push_before: number;
  lower_pull_before: number;
  lower_push_before: number;
  core_resistance_before: number;
  upper_pull_after: number;
  upper_push_after: number;
  lower_pull_after: number;
  lower_push_after: number;
  core_resistance_after: number;
  notes: string;
}

export const PhysicalAssessment = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [currentAssessment, setCurrentAssessment] = useState<AssessmentData>({
    upper_pull_before: 0,
    upper_push_before: 0,
    lower_pull_before: 0,
    lower_push_before: 0,
    core_resistance_before: 0,
    upper_pull_after: 0,
    upper_push_after: 0,
    lower_pull_after: 0,
    lower_push_after: 0,
    core_resistance_after: 0,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      const { data, error } = await supabase
        .from('physical_assessments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssessments(data || []);
    } catch (error) {
      console.error('Erro ao buscar avaliações:', error);
    }
  };

  const handleSave = async () => {
    if (!selectedUserId) {
      toast({
        title: "Erro",
        description: "Selecione um aluno para a avaliação.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('physical_assessments')
        .insert({
          user_id: selectedUserId,
          professor_id: user?.id,
          ...currentAssessment
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Avaliação física salva com sucesso!"
      });

      fetchAssessments();
      setCurrentAssessment({
        upper_pull_before: 0,
        upper_push_before: 0,
        lower_pull_before: 0,
        lower_push_before: 0,
        core_resistance_before: 0,
        upper_pull_after: 0,
        upper_push_after: 0,
        lower_pull_after: 0,
        lower_push_after: 0,
        core_resistance_after: 0,
        notes: ''
      });
    } catch (error) {
      console.error('Erro ao salvar avaliação:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar avaliação física.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nova Avaliação Física</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>ID do Aluno</Label>
            <Input
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              placeholder="Digite o ID do aluno"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Resistência Muscular - ANTES</h3>
              
              <div className="space-y-3">
                <h4 className="font-medium">Parte Superior</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Puxar</Label>
                    <Input
                      type="number"
                      value={currentAssessment.upper_pull_before}
                      onChange={(e) => setCurrentAssessment({
                        ...currentAssessment,
                        upper_pull_before: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                  <div>
                    <Label>Empurrar</Label>
                    <Input
                      type="number"
                      value={currentAssessment.upper_push_before}
                      onChange={(e) => setCurrentAssessment({
                        ...currentAssessment,
                        upper_push_before: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Parte Inferior</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Puxar</Label>
                    <Input
                      type="number"
                      value={currentAssessment.lower_pull_before}
                      onChange={(e) => setCurrentAssessment({
                        ...currentAssessment,
                        lower_pull_before: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                  <div>
                    <Label>Empurrar</Label>
                    <Input
                      type="number"
                      value={currentAssessment.lower_push_before}
                      onChange={(e) => setCurrentAssessment({
                        ...currentAssessment,
                        lower_push_before: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label>Resistência de Core</Label>
                <Input
                  type="number"
                  value={currentAssessment.core_resistance_before}
                  onChange={(e) => setCurrentAssessment({
                    ...currentAssessment,
                    core_resistance_before: parseInt(e.target.value) || 0
                  })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Resistência Muscular - DEPOIS</h3>
              
              <div className="space-y-3">
                <h4 className="font-medium">Parte Superior</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Puxar</Label>
                    <Input
                      type="number"
                      value={currentAssessment.upper_pull_after}
                      onChange={(e) => setCurrentAssessment({
                        ...currentAssessment,
                        upper_pull_after: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                  <div>
                    <Label>Empurrar</Label>
                    <Input
                      type="number"
                      value={currentAssessment.upper_push_after}
                      onChange={(e) => setCurrentAssessment({
                        ...currentAssessment,
                        upper_push_after: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Parte Inferior</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Puxar</Label>
                    <Input
                      type="number"
                      value={currentAssessment.lower_pull_after}
                      onChange={(e) => setCurrentAssessment({
                        ...currentAssessment,
                        lower_pull_after: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                  <div>
                    <Label>Empurrar</Label>
                    <Input
                      type="number"
                      value={currentAssessment.lower_push_after}
                      onChange={(e) => setCurrentAssessment({
                        ...currentAssessment,
                        lower_push_after: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label>Resistência de Core</Label>
                <Input
                  type="number"
                  value={currentAssessment.core_resistance_after}
                  onChange={(e) => setCurrentAssessment({
                    ...currentAssessment,
                    core_resistance_after: parseInt(e.target.value) || 0
                  })}
                />
              </div>
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={currentAssessment.notes}
              onChange={(e) => setCurrentAssessment({
                ...currentAssessment,
                notes: e.target.value
              })}
              placeholder="Adicione observações sobre a avaliação..."
            />
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? 'Salvando...' : 'Salvar Avaliação'}
          </Button>
        </CardContent>
      </Card>

      {assessments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Gráficos Comparativos</CardTitle>
          </CardHeader>
          <CardContent>
            <AssessmentChart assessments={assessments} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
