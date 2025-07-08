
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Student {
  nome: string;
  email: string;
  objetivo: string;
  telefone?: string;
  data_nascimento?: string;
  peso_kg?: number;
  altura_cm?: number;
  nivel_experiencia: string;
  observacoes?: string;
}

export function AdicionarAlunoForm({ onStudentAdded, onCancel }: { 
  onStudentAdded: () => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Student>({
    nome: '',
    email: '',
    objetivo: 'Hipertrofia',
    telefone: '',
    data_nascimento: '',
    peso_kg: undefined,
    altura_cm: undefined,
    nivel_experiencia: 'iniciante',
    observacoes: ''
  });
  
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      // Get current user to set as professor_id
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast.error('Erro: Usuário não autenticado');
        return;
      }

      const studentData = {
        ...formData,
        professor_id: user.id,
        peso_kg: formData.peso_kg || null,
        altura_cm: formData.altura_cm || null,
        data_nascimento: formData.data_nascimento || null
      };

      const { error } = await supabase
        .from('students')
        .insert([studentData]);

      if (error) {
        console.error('Erro ao adicionar aluno:', error);
        toast.error('Erro ao adicionar aluno: ' + error.message);
        return;
      }

      toast.success('Aluno adicionado com sucesso!');
      onStudentAdded();
      
      // Reset form
      setFormData({
        nome: '',
        email: '',
        objetivo: 'Hipertrofia',
        telefone: '',
        data_nascimento: '',
        peso_kg: undefined,
        altura_cm: undefined,
        nivel_experiencia: 'iniciante',
        observacoes: ''
      });

    } catch (error) {
      console.error("Erro ao adicionar aluno:", error);
      toast.error('Erro inesperado ao adicionar aluno');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof Student, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-orange-600">
          Adicionar Novo Aluno
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                type="text"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                required
                placeholder="Digite o nome completo"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="objetivo">Objetivo *</Label>
              <Select value={formData.objetivo} onValueChange={(value) => handleInputChange('objetivo', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hipertrofia">Hipertrofia</SelectItem>
                  <SelectItem value="Emagrecimento">Emagrecimento</SelectItem>
                  <SelectItem value="Resistência">Resistência</SelectItem>
                  <SelectItem value="Força">Força</SelectItem>
                  <SelectItem value="Qualidade de Vida">Qualidade de Vida</SelectItem>
                  <SelectItem value="Reabilitação">Reabilitação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="nivel_experiencia">Nível de Experiência</Label>
              <Select value={formData.nivel_experiencia} onValueChange={(value) => handleInputChange('nivel_experiencia', value)}>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                type="tel"
                value={formData.telefone}
                onChange={(e) => handleInputChange('telefone', e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="peso">Peso (kg)</Label>
              <Input
                id="peso"
                type="number"
                step="0.1"
                value={formData.peso_kg || ''}
                onChange={(e) => handleInputChange('peso_kg', parseFloat(e.target.value) || undefined)}
                placeholder="70.5"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="altura">Altura (cm)</Label>
              <Input
                id="altura"
                type="number"
                value={formData.altura_cm || ''}
                onChange={(e) => handleInputChange('altura_cm', parseInt(e.target.value) || undefined)}
                placeholder="175"
              />
            </div>
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

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => handleInputChange('observacoes', e.target.value)}
              placeholder="Lesões, restrições, preferências, etc."
              rows={3}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button 
              type="submit" 
              disabled={loading}
              className="flex-1 bg-orange-500 hover:bg-orange-600"
            >
              {loading ? 'Salvando...' : 'Salvar Aluno'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
