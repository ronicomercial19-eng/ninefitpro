import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AdicionarAlunoForm } from '@/components/students/AdicionarAlunoForm';
import { StudentDetailedView } from '@/components/students/StudentDetailedView';

interface Student {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  objetivo: string;
  nivel_experiencia?: string;
  peso_kg?: number;
  altura_cm?: number;
  observacoes?: string;
  ativo: boolean;
  created_at: string;
  foto_url?: string;
  status_pagamento?: string;
  data_nascimento?: string;
  profissao?: string;
  endereco_completo?: string;
  data_vencimento_plano?: string;
  forma_pagamento?: string;
  valor_mensalidade?: number;
}

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('professor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setStudents(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar alunos:', error);
      toast.error('Erro ao carregar lista de alunos');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    if (filter === 'blocked') return matchesSearch && !student.ativo;
    if (filter === 'active') return matchesSearch && student.ativo;
    
    return matchesSearch;
  });

  const handleStudentAdded = () => {
    setShowAddForm(false);
    fetchStudents();
    toast.success('Aluno adicionado com sucesso!');
  };

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student);
  };

  const handleEditStudent = (student: Student) => {
    // Go to detailed view for editing
    setSelectedStudent(student);
  };

  const handleBackToList = () => {
    setSelectedStudent(null);
  };

  const handleStudentUpdated = (updatedStudent: Student) => {
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    setSelectedStudent(updatedStudent);
  };

  // Show student detailed view
  if (selectedStudent) {
    return (
      <StudentDetailedView 
        student={selectedStudent}
        onBack={handleBackToList}
        onStudentUpdated={handleStudentUpdated}
      />
    );
  }

  // Show add form
  if (showAddForm) {
    return (
      <div className="space-y-6">
        <AdicionarAlunoForm 
          onStudentAdded={handleStudentAdded}
          onCancel={() => setShowAddForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Alunos</h1>
        <Button 
          className="bg-green-500 hover:bg-green-600"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo aluno
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Bloqueados/desbloqueados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Mostrar todos</SelectItem>
                  <SelectItem value="blocked">Bloqueados</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Students Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filteredStudents.map((student) => (
            <Card key={student.id} className="relative">
              <CardContent className="p-4">
                <div className="flex flex-col items-center space-y-3">
                  <div className="relative">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                      {student.foto_url ? (
                        <img 
                          src={student.foto_url} 
                          alt={student.nome}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-semibold">{getInitials(student.nome)}</span>
                      )}
                    </div>
                    {!student.ativo && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">!</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-center space-y-1">
                    <h3 className="font-medium text-sm text-foreground">{student.nome}</h3>
                    <p className="text-xs text-muted-foreground break-all">{student.email}</p>
                  </div>

                  {student.status_pagamento === 'atrasado' && (
                    <Badge variant="destructive" className="text-xs">
                      Inadimplente
                    </Badge>
                  )}

                  <div className="flex space-x-2 w-full">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-xs"
                      onClick={() => handleEditStudent(student)}
                    >
                      Editar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-xs"
                      onClick={() => handleViewStudent(student)}
                    >
                      Ver
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredStudents.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum aluno encontrado</h3>
              <p className="text-muted-foreground mb-4">Tente ajustar os filtros ou adicione um novo aluno.</p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar primeiro aluno
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
