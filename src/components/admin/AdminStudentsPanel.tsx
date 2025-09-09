import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Search, Edit, Mail, Phone } from 'lucide-react';

type DatabaseStudent = {
  id: string;
  email: string;
  nome?: string;
  telefone?: string;
  data_nascimento?: string;
  ativo?: boolean;
  data_vencimento_plano?: string;
  status_pagamento?: string;
  observacoes?: string;
  created_at?: string;
};

export function AdminStudentsPanel() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<DatabaseStudent[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [newStudent, setNewStudent] = useState({
    email: '',
    nome: '',
    telefone: '',
    data_nascimento: '',
    observacoes: '',
    data_vencimento_plano: ''
  });

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchStudents();
    }
  }, [profile]);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Erro ao carregar alunos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async () => {
    try {
      if (!newStudent.email || !newStudent.nome) {
        toast.error('Email e nome são obrigatórios');
        return;
      }

      const { error } = await supabase
        .from('students')
        .insert({
          email: newStudent.email,
          nome: newStudent.nome,
          telefone: newStudent.telefone,
          data_nascimento: newStudent.data_nascimento,
          observacoes: newStudent.observacoes,
          data_vencimento_plano: newStudent.data_vencimento_plano,
          ativo: true,
          status_pagamento: 'pendente',
          objetivo: 'Manter forma física',
          professor_id: profile?.user_id
        });

      if (error) throw error;

      toast.success('Aluno adicionado com sucesso!');
      setShowAddForm(false);
      setNewStudent({
        email: '',
        nome: '',
        telefone: '',
        data_nascimento: '',
        observacoes: '',
        data_vencimento_plano: ''
      });
      fetchStudents();
    } catch (error: any) {
      console.error('Error adding student:', error);
      toast.error(error.message || 'Erro ao adicionar aluno');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gerenciar Alunos</h2>
        <Button onClick={() => setShowAddForm(true)} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Aluno
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Novo Aluno</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="aluno@email.com"
                />
              </div>
              <div>
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  value={newStudent.nome}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Nome do aluno"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddStudent} className="bg-green-500 hover:bg-green-600">
                Salvar
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {students.map((student) => (
          <Card key={student.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{student.nome || 'Nome não informado'}</h3>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  {student.email}
                </div>
              </div>
              <Badge variant={student.ativo ? 'default' : 'destructive'}>
                {student.ativo ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      {students.length === 0 && (
        <div className="text-center p-8 text-gray-500">
          Nenhum aluno cadastrado
        </div>
      )}
    </div>
  );
}