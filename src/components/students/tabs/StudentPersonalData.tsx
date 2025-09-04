import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { User, Edit, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Student {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  whatsapp?: string;
  cpf?: string;
  data_nascimento?: string;
  objetivo: string;
  nivel_experiencia?: string;
  peso_kg?: number;
  altura_cm?: number;
  observacoes?: string;
  ativo: boolean;
  created_at: string;
  foto_url?: string;
  estado_civil?: string;
  profissao?: string;
  endereco_completo?: string;
  data_vencimento_plano?: string;
  forma_pagamento?: string;
  valor_mensalidade?: number;
  status_pagamento?: string;
}

interface StudentPersonalDataProps {
  student: Student;
  onStudentUpdate: (updatedData: Partial<Student>) => void;
}

export function StudentPersonalData({ student, onStudentUpdate }: StudentPersonalDataProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(student);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .update(formData)
        .eq('id', student.id)
        .select()
        .single();

      if (error) throw error;

      onStudentUpdate(data);
      setIsEditing(false);
      toast.success('Dados atualizados com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
      toast.error('Erro ao atualizar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData(student);
    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Dados Pessoais</h2>
        </div>
        
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Editar
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

      {/* Dados Pessoais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              {isEditing ? (
                <Input
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                />
              ) : (
                <p className="p-2 bg-gray-50 rounded">{student.nome}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              {isEditing ? (
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              ) : (
                <p className="p-2 bg-gray-50 rounded">{student.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>CPF</Label>
              {isEditing ? (
                <Input
                  value={formData.cpf || ''}
                  onChange={(e) => handleInputChange('cpf', e.target.value)}
                  placeholder="000.000.000-00"
                />
              ) : (
                <p className="p-2 bg-gray-50 rounded">{student.cpf || 'Não informado'}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Data de Nascimento</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={formData.data_nascimento || ''}
                  onChange={(e) => handleInputChange('data_nascimento', e.target.value)}
                />
              ) : (
                <p className="p-2 bg-gray-50 rounded">
                  {student.data_nascimento 
                    ? new Date(student.data_nascimento).toLocaleDateString('pt-BR')
                    : 'Não informado'
                  }
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Estado Civil</Label>
              {isEditing ? (
                <Select 
                  value={formData.estado_civil || 'solteiro'} 
                  onValueChange={(value) => handleInputChange('estado_civil', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                    <SelectItem value="casado">Casado(a)</SelectItem>
                    <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                    <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="p-2 bg-gray-50 rounded capitalize">
                  {student.estado_civil || 'Solteiro(a)'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Profissão</Label>
              {isEditing ? (
                <Input
                  value={formData.profissao || ''}
                  onChange={(e) => handleInputChange('profissao', e.target.value)}
                  placeholder="Profissão"
                />
              ) : (
                <p className="p-2 bg-gray-50 rounded">{student.profissao || 'Não informado'}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card>
          <CardHeader>
            <CardTitle>Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Telefone</Label>
              {isEditing ? (
                <Input
                  value={formData.telefone || ''}
                  onChange={(e) => handleInputChange('telefone', e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              ) : (
                <p className="p-2 bg-gray-50 rounded">{student.telefone || 'Não informado'}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>WhatsApp</Label>
              {isEditing ? (
                <Input
                  value={formData.whatsapp || ''}
                  onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              ) : (
                <p className="p-2 bg-gray-50 rounded">{student.whatsapp || 'Não informado'}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Endereço Completo</Label>
              {isEditing ? (
                <Textarea
                  value={formData.endereco_completo || ''}
                  onChange={(e) => handleInputChange('endereco_completo', e.target.value)}
                  placeholder="Rua, número, complemento, bairro, cidade, CEP"
                  rows={3}
                />
              ) : (
                <p className="p-2 bg-gray-50 rounded min-h-[80px]">
                  {student.endereco_completo || 'Não informado'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Informações de Treino */}
        <Card>
          <CardHeader>
            <CardTitle>Informações de Treino</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Objetivo Principal</Label>
              {isEditing ? (
                <Select 
                  value={formData.objetivo} 
                  onValueChange={(value) => handleInputChange('objetivo', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emagrecimento">Emagrecimento</SelectItem>
                    <SelectItem value="hipertrofia">Hipertrofia</SelectItem>
                    <SelectItem value="forca">Ganho de Força</SelectItem>
                    <SelectItem value="condicionamento">Condicionamento Físico</SelectItem>
                    <SelectItem value="reabilitacao">Reabilitação</SelectItem>
                    <SelectItem value="performance">Performance Esportiva</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="p-2 bg-gray-50 rounded capitalize">{student.objetivo}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Nível de Experiência</Label>
              {isEditing ? (
                <Select 
                  value={formData.nivel_experiencia || 'iniciante'} 
                  onValueChange={(value) => handleInputChange('nivel_experiencia', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iniciante">Iniciante</SelectItem>
                    <SelectItem value="intermediario">Intermediário</SelectItem>
                    <SelectItem value="avancado">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="p-2 bg-gray-50 rounded capitalize">
                  {student.nivel_experiencia || 'Iniciante'}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Peso (kg)</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.peso_kg || ''}
                    onChange={(e) => handleInputChange('peso_kg', parseFloat(e.target.value) || 0)}
                    placeholder="70.5"
                  />
                ) : (
                  <p className="p-2 bg-gray-50 rounded">
                    {student.peso_kg ? `${student.peso_kg} kg` : 'Não informado'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Altura (cm)</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={formData.altura_cm || ''}
                    onChange={(e) => handleInputChange('altura_cm', parseFloat(e.target.value) || 0)}
                    placeholder="175"
                  />
                ) : (
                  <p className="p-2 bg-gray-50 rounded">
                    {student.altura_cm ? `${student.altura_cm} cm` : 'Não informado'}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Observações */}
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Observações Gerais</Label>
              {isEditing ? (
                <Textarea
                  value={formData.observacoes || ''}
                  onChange={(e) => handleInputChange('observacoes', e.target.value)}
                  placeholder="Lesões, restrições, medicamentos, observações importantes..."
                  rows={4}
                />
              ) : (
                <p className="p-3 bg-gray-50 rounded min-h-[100px] whitespace-pre-wrap">
                  {student.observacoes || 'Nenhuma observação registrada'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}