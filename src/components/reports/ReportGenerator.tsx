import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FileText, Download, Users, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ReportGeneratorProps {
  onClose: () => void;
}

export function ReportGenerator({ onClose }: ReportGeneratorProps) {
  const [reportType, setReportType] = useState<'individual' | 'geral'>('geral');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);

    try {
      // Buscar dados baseado no tipo de relatório
      if (reportType === 'individual' && !selectedStudent) {
        toast.error('Selecione um aluno');
        setLoading(false);
        return;
      }

      // Simulação de geração de relatório
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast.success('Relatório gerado com sucesso!');
      
      // Aqui você implementaria a lógica real de geração do relatório
      // Por exemplo, gerar um PDF ou exportar para Excel
      
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Gerar Relatório
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Tipo de Relatório</Label>
          <div className="grid grid-cols-2 gap-4">
            <Button
              type="button"
              variant={reportType === 'individual' ? 'default' : 'outline'}
              className="h-24 flex flex-col items-center justify-center gap-2"
              onClick={() => setReportType('individual')}
            >
              <User className="w-8 h-8" />
              <span>Individual</span>
            </Button>
            <Button
              type="button"
              variant={reportType === 'geral' ? 'default' : 'outline'}
              className="h-24 flex flex-col items-center justify-center gap-2"
              onClick={() => setReportType('geral')}
            >
              <Users className="w-8 h-8" />
              <span>Geral</span>
            </Button>
          </div>
        </div>

        {reportType === 'individual' && (
          <div className="space-y-2">
            <Label>Selecionar Aluno</Label>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um aluno" />
              </SelectTrigger>
              <SelectContent>
                {/* Aqui você buscaria os alunos do banco */}
                <SelectItem value="1">João Silva</SelectItem>
                <SelectItem value="2">Maria Santos</SelectItem>
                <SelectItem value="3">Pedro Costa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Período</Label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="180">Últimos 6 meses</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">O relatório incluirá:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Frequência de treinos</li>
            <li>• Evolução de medidas</li>
            <li>• Progressão de cargas</li>
            <li>• Taxa de conclusão de treinos</li>
            {reportType === 'geral' && (
              <>
                <li>• Estatísticas gerais de todos os alunos</li>
                <li>• Alunos mais ativos</li>
                <li>• Taxas de retenção</li>
              </>
            )}
          </ul>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600"
          >
            <Download className="w-4 h-4 mr-2" />
            {loading ? 'Gerando...' : 'Gerar Relatório'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
