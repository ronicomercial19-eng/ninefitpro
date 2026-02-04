import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, UserPlus, Eye, EyeOff, Mail, Lock } from "lucide-react";

interface AdicionarAlunoFormProps {
  onStudentAdded: () => void;
  onCancel: () => void;
}

// Gerar senha aleatória segura
const generatePassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export function AdicionarAlunoForm({ onStudentAdded, onCancel }: AdicionarAlunoFormProps) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createAuth, setCreateAuth] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    objetivo: '',
    nivel_experiencia: 'iniciante',
    data_nascimento: '',
    peso_kg: '',
    altura_cm: '',
    observacoes: '',
    senha: generatePassword()
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.email || !formData.objetivo) {
      toast.error('Nome, email e objetivo são obrigatórios');
      return;
    }

    if (createAuth && !formData.senha) {
      toast.error('Senha é obrigatória para criar acesso ao app');
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

      // Buscar nome do professor
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      // Preparar dados para inserção na tabela athletes
      const trimmedEmail = formData.email.trim().toLowerCase();
      const athleteData = {
        name: formData.nome,
        email: trimmedEmail, // Store email in dedicated column
        coach_id: user.id,
        phone: formData.telefone || null,
        birthdate: formData.data_nascimento || null,
        primary_goal: formData.objetivo,
        experience_level: formData.nivel_experiencia,
        peso_kg: formData.peso_kg ? parseFloat(formData.peso_kg) : null,
        altura_cm: formData.altura_cm ? parseFloat(formData.altura_cm) : null,
        injuries_limitations: formData.observacoes || null,
        activated: false,
        auto_password_temp: createAuth ? formData.senha : null,
        metadata: { email: trimmedEmail } // Keep for backward compatibility
      };

      const { data: athleteResult, error: athleteError } = await supabase
        .from('athletes')
        .insert([athleteData])
        .select()
        .single();

      if (athleteError) {
        console.error('Erro ao criar atleta:', athleteError);
        throw athleteError;
      }

      // Se deve criar acesso ao app
      if (createAuth && athleteResult) {
        try {
          const { data: authResult, error: authFuncError } = await supabase.functions.invoke('create-athlete-user', {
            body: {
              athleteId: athleteResult.id,
              email: formData.email,
              password: formData.senha,
              name: formData.nome
            }
          });

          if (authFuncError) {
            console.error('Erro ao criar usuário:', authFuncError);
            toast.warning('Aluno criado, mas houve erro ao criar acesso ao app');
          } else {
            console.log('Usuário auth criado:', authResult);
          }
        } catch (funcError) {
          console.error('Erro na função de criar usuário:', funcError);
        }
      }

      // Enviar email de boas-vindas
      if (sendEmail && formData.email) {
        try {
          const { error: emailError } = await supabase.functions.invoke('send-student-welcome', {
            body: {
              studentName: formData.nome,
              studentEmail: formData.email,
              password: formData.senha,
              coachName: profileData?.full_name || 'Seu Professor',
              objetivo: formData.objetivo,
              appUrl: `${window.location.origin}/9fit/login`
            }
          });

          if (emailError) {
            console.error('Erro ao enviar email:', emailError);
            toast.warning('Aluno criado, mas houve erro ao enviar email');
          } else {
            toast.success('Email de boas-vindas enviado!');
          }
        } catch (emailFuncError) {
          console.error('Erro na função de email:', emailFuncError);
        }
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

  const regeneratePassword = () => {
    setFormData(prev => ({
      ...prev,
      senha: generatePassword()
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

            {/* Acesso ao App */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Acesso ao App
              </h3>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="createAuth" 
                  checked={createAuth}
                  onCheckedChange={(checked) => setCreateAuth(checked === true)}
                />
                <Label htmlFor="createAuth" className="cursor-pointer">
                  Criar acesso ao app para o aluno
                </Label>
              </div>

              {createAuth && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="senha">Senha de Acesso</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="senha"
                          type={showPassword ? "text" : "password"}
                          value={formData.senha}
                          onChange={(e) => handleInputChange('senha', e.target.value)}
                          placeholder="Senha do aluno"
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                      <Button type="button" variant="outline" onClick={regeneratePassword}>
                        Gerar Nova
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Senha gerada automaticamente. Você pode editar ou gerar uma nova.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="sendEmail" 
                      checked={sendEmail}
                      onCheckedChange={(checked) => setSendEmail(checked === true)}
                    />
                    <Label htmlFor="sendEmail" className="cursor-pointer flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Enviar dados de acesso por email
                    </Label>
                  </div>
                </>
              )}
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
