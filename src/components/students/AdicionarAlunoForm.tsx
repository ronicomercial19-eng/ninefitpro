
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, UserPlus } from "lucide-react";

interface AdicionarAlunoFormProps {
  onStudentAdded: () => void;
  onCancel: () => void;
}

export function AdicionarAlunoForm({ onStudentAdded, onCancel }: AdicionarAlunoFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    objetivo: '',
    nivel_experiencia: 'iniciante',
    data_nascimento: '',
    peso_kg: '',
    altura_cm: '',
    observacoes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.email || !formData.objetivo) {
      toast.error('Nome, email e objetivo são obrigatórios');
      return;
    }

    setLoading(true);
    
    try {
      // Obter o usuário atual (professor)
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast.error('Você precisa estar logado para adicionar alunos');
        return;
      }

      // Preparar dados para inserção
      const studentData = {
        ...formData,
        professor_id: user.id,
        peso_kg: formData.peso_kg ? parseFloat(formData.peso_kg) : null,
        altura_cm: formData.altura_cm ? parseFloat(formData.altura_cm) : null,
        data_nascimento: formData.data_nascimento || null,
        ativo: true
      };

      const { data, error } = await supabase
        .from('students')
        .insert([studentData])
        .select()
        .single();

      if (error) {
        console.error('Erro detalhado:', error);
        throw error;
      }

      toast.success('Aluno adicionado com sucesso!');
      onStudentAdded();
      
    } catch (error: any) {
      console.error('Erro ao adicionar aluno:', error);
      
      if (error.code === '23505') {
        toast.error('Já existe um aluno com este email');
      } else if (error.code === '23503') {
        toast.error('Erro de referência. Verifique se você está logado corretamente');
      } else {
        toast.error('Erro ao adicionar aluno: ' + (error.message || 'Erro desconhecido'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Adicionar Novo Aluno
            </CardTitle>
            <Button variant="outline" onClick={onCancel}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Informações Básicas</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => handleInputChange('nome', e.target.value)}
                    placeholder="Nome completo do aluno"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => handleInputChange('telefone', e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                  <Input
                    id="data_nascimento"
                    type="date"
                    value={formData.data_nascimento}
                    onChange={(e) => handleInputChange('data_nascimento', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Informações de Treino */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Informações de Treino</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="objetivo">Objetivo Principal *</Label>
                  <Select 
                    value={formData.objetivo} 
                    onValueChange={(value) => handleInputChange('objetivo', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o objetivo" />
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
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="nivel_experiencia">Nível de Experiência</Label>
                  <Select 
                    value={formData.nivel_experiencia} 
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
                </div>
              </div>
            </div>

            {/* Medidas Corporais */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Medidas Corporais</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="peso_kg">Peso (kg)</Label>
                  <Input
                    id="peso_kg"
                    type="number"
                    step="0.1"
                    value={formData.peso_kg}
                    onChange={(e) => handleInputChange('peso_kg', e.target.value)}
                    placeholder="70.5"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="altura_cm">Altura (cm)</Label>
                  <Input
                    id="altura_cm"
                    type="number"
                    value={formData.altura_cm}
                    onChange={(e) => handleInputChange('altura_cm', e.target.value)}
                    placeholder="175"
                  />
                </div>
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => handleInputChange('observacoes', e.target.value)}
                placeholder="Lesões, restrições, medicamentos, etc."
                rows={3}
              />
            </div>

            {/* Botões */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Adicionando...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Adicionar Aluno
                  </>
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
