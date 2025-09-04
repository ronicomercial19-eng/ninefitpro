import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, DollarSign, CheckCircle, AlertCircle, XCircle, Edit, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Student {
  id: string;
  nome: string;
  data_vencimento_plano?: string;
  forma_pagamento?: string;
  valor_mensalidade?: number;
  status_pagamento?: string;
}

interface StudentPaymentsProps {
  student: Student;
  onStudentUpdate: (updatedData: Partial<Student>) => void;
}

export function StudentPayments({ student, onStudentUpdate }: StudentPaymentsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState({
    data_vencimento_plano: student.data_vencimento_plano || '',
    forma_pagamento: student.forma_pagamento || 'mensal',
    valor_mensalidade: student.valor_mensalidade || 0,
    status_pagamento: student.status_pagamento || 'em_dia'
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .update(paymentData)
        .eq('id', student.id)
        .select()
        .single();

      if (error) throw error;

      onStudentUpdate(data);
      setIsEditing(false);
      toast.success('Dados de pagamento atualizados!');
    } catch (error) {
      console.error('Erro ao atualizar pagamento:', error);
      toast.error('Erro ao atualizar dados de pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPaymentData({
      data_vencimento_plano: student.data_vencimento_plano || '',
      forma_pagamento: student.forma_pagamento || 'mensal',
      valor_mensalidade: student.valor_mensalidade || 0,
      status_pagamento: student.status_pagamento || 'em_dia'
    });
    setIsEditing(false);
  };

  const getStatusInfo = (status: string = 'em_dia') => {
    const statusConfig = {
      'em_dia': {
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircle className="w-4 h-4" />,
        text: 'Em Dia'
      },
      'atrasado': {
        color: 'bg-red-100 text-red-800',
        icon: <XCircle className="w-4 h-4" />,
        text: 'Atrasado'
      },
      'suspenso': {
        color: 'bg-yellow-100 text-yellow-800',
        icon: <AlertCircle className="w-4 h-4" />,
        text: 'Suspenso'
      }
    };
    
    return statusConfig[status as keyof typeof statusConfig] || statusConfig['em_dia'];
  };

  const calculateDaysUntilDue = () => {
    if (!student.data_vencimento_plano) return null;
    
    const today = new Date();
    const dueDate = new Date(student.data_vencimento_plano);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const statusInfo = getStatusInfo(student.status_pagamento);
  const daysUntilDue = calculateDaysUntilDue();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Mensalidade</h2>
        </div>
        
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Editar Plano
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
            <Button variant="outline" onClick={handleCancel} disabled={loading}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
          </div>
        )}
      </div>

      {/* Status do Plano */}
      <Card>
        <CardHeader>
          <CardTitle>Status do Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <span className="text-lg font-semibold text-blue-600">
                  R$ {student.valor_mensalidade?.toFixed(2) || '0,00'}
                </span>
              </div>
              <div className="text-sm text-gray-600">Valor Mensal</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                <span className="text-lg font-semibold text-purple-600 capitalize">
                  {student.forma_pagamento || 'Mensal'}
                </span>
              </div>
              <div className="text-sm text-gray-600">Forma de Pagamento</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                {statusInfo.icon}
                <Badge className={statusInfo.color}>
                  {statusInfo.text}
                </Badge>
              </div>
              <div className="text-sm text-gray-600">Status</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações de Vencimento */}
      <Card>
        <CardHeader>
          <CardTitle>Próximo Vencimento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-600" />
                <span className="font-medium">
                  {student.data_vencimento_plano 
                    ? new Date(student.data_vencimento_plano).toLocaleDateString('pt-BR')
                    : 'Não definido'
                  }
                </span>
              </div>
              
              {daysUntilDue !== null && (
                <p className="text-sm text-gray-600 mt-1">
                  {daysUntilDue > 0 
                    ? `${daysUntilDue} dias restantes`
                    : daysUntilDue === 0
                    ? 'Vence hoje!'
                    : `${Math.abs(daysUntilDue)} dias em atraso`
                  }
                </p>
              )}
            </div>
            
            <Button size="sm" className="bg-green-600 hover:bg-green-700">
              Registrar Pagamento
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configurações do Plano */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações do Plano</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Vencimento</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={paymentData.data_vencimento_plano}
                  onChange={(e) => setPaymentData({...paymentData, data_vencimento_plano: e.target.value})}
                />
              ) : (
                <p className="p-2 bg-gray-50 rounded">
                  {student.data_vencimento_plano 
                    ? new Date(student.data_vencimento_plano).toLocaleDateString('pt-BR')
                    : 'Não definido'
                  }
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              {isEditing ? (
                <Select 
                  value={paymentData.forma_pagamento} 
                  onValueChange={(value) => setPaymentData({...paymentData, forma_pagamento: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="semestral">Semestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                    <SelectItem value="avulso">Avulso</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="p-2 bg-gray-50 rounded capitalize">
                  {student.forma_pagamento || 'Mensal'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Valor da Mensalidade</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  placeholder="150.00"
                  value={paymentData.valor_mensalidade}
                  onChange={(e) => setPaymentData({...paymentData, valor_mensalidade: parseFloat(e.target.value) || 0})}
                />
              ) : (
                <p className="p-2 bg-gray-50 rounded">
                  R$ {student.valor_mensalidade?.toFixed(2) || '0,00'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Status do Pagamento</Label>
              {isEditing ? (
                <Select 
                  value={paymentData.status_pagamento} 
                  onValueChange={(value) => setPaymentData({...paymentData, status_pagamento: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="em_dia">Em Dia</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
                    <SelectItem value="suspenso">Suspenso</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-2 bg-gray-50 rounded">
                  <Badge className={statusInfo.color}>
                    {statusInfo.text}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Pagamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum pagamento registrado
            </h3>
            <p className="text-gray-600 mb-4">
              O histórico de pagamentos aparecerá aqui conforme forem sendo registrados.
            </p>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Registrar Primeiro Pagamento
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ações Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button className="w-full bg-green-600 hover:bg-green-700">
          <CheckCircle className="w-4 h-4 mr-2" />
          Marcar como Pago
        </Button>
        
        <Button variant="outline" className="w-full">
          <Calendar className="w-4 h-4 mr-2" />
          Alterar Vencimento
        </Button>
        
        <Button variant="outline" className="w-full">
          <DollarSign className="w-4 h-4 mr-2" />
          Gerar Cobrança
        </Button>
      </div>
    </div>
  );
}